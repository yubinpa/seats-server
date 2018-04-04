const Seats = require('./models/seats');
const dao = require('./dao/dao');
const socketio = require('socket.io');
const express = require('express');
const http = require('http');
const fs = require('fs');
const ERROR = require('./const/const');
const log4js = require('log4js');
const config = require('./config/config.json');
const gracefulExit = require( 'express-graceful-exit' );
const _ = require('lodash');


process.title = config.processTitle;

// key : accountGroupNo^eventSessionIndex^seatGroupIndex  value: Seats 객체 
let seatsMap = new Map();

// key : accountGroupNo, value : apiKey
let accountMap = new Map();

log4js.configure( config.log4j );
let logger = log4js.getLogger('grid-server');
let backupLogger = log4js.getLogger('backup-log');

//this.seats.print();
var app = express();

// 미들웨어를 설정합니다.
//app.use(app.router);

// 라우트를 수행합니다.
app.get('/', function (request, response, next) {
    //fs.readFile('HTMLPage.html', function (error, data) {
    fs.readFile(__dirname + '/public/index.html', function (error, data) {
       response.send(data.toString());
    });
});

app.get('/seats', function (request, response, next) {
    response.send(seatsMap);
});

// 웹 서버를 실행합니다.
var server = http.createServer(app);

server.listen(52275, function () {
    //console.log('Server Running at http://127.0.0.1:52275');
    logger.info('Server Running at http://127.0.0.1:52275');
});

//var io = require('socket.io')(server, {origins:'*:*'});

// 소켓 서버를 생성 및 실행합니다.
var io = socketio.listen(server);
// io.origins("*:*");*/

io.sockets.on('connection', function (socket) {

    socket.on('auth', clientData => {

        dao.selectAccount( clientData.id, clientData.apiKey )
            .then( dbResult => {

                if( dbResult.length > 0 ) {
                    logger.info(`account entered room, id=${clientData.id}, apiKey=${clientData.apiKey}`);

                    socket.name = `${socket.conn.remoteAddress}-${clientData.id}`;

                    // 계정그룹^세션인덱스 방에 넣어 두기 
                    let roomName = `${dbResult[0].group_no}^${clientData.eventSessionIndex}`;
                    socket.join( roomName );
                    socket.roomName = roomName;

                    // 일단 메모리에 계정 정보 올려 놓고 emit
                    accountMap.set( dbResult[0].group_no, clientData.apiKey );

                    //인증이 완료되면 클라이언트에게 account group_no 를 알려준다. 
                    socket.emit('ready', { accountGroupNo : dbResult[0].group_no });
                }
                else{
                    socket.emit('grid-error', ERROR.AUTH_FAILED);
                    logger.info(`account not exists, id=${clientData.id}, apiKey=${clientData.apiKey}`);
                }

            }).catch ( error => {
                logger.error(error);
                socket.emit('grid-error', ERROR.DATABASE );
            })
    });

    // group-seats
    // 해당 그룹인덱스의 모든 seats 정보를 보낸다. 
    // 처음 화면을 렌더링 할 때는 이 호출을 필수!
    socket.on('group-seats', clientData => {
        // TODO auth check

        if( !checkAuth( clientData )){
            logger.error( `${JSON.stringfy(ERROR.AUTH_FAILED)} ${JSON.stringify(clientData)}`);
            socket.emit('grid-error', { response : ERROR.AUTH_FAILED, request : clientData } );
            return;
        }

        let seats = getSeats( clientData );

        // 맵에 시트 정보가 없으면 DB에서 정보를 갖고 온다. 
        // DB 정보에 없으면 오류를 전달한다. 
        if( seats == undefined ){
            // DB 에서 정보를 갖고 와야 함
            dao.selectGroupSeats( clientData )
                .then( result => {
                    if( result.length > 0 ){
                        let newSeats = createSeats( result, clientData );
                        // client 에 'group-seats' 이벤트를 발생시킨다. 
                        socket.emit('group-seats', { response : newSeats, request : clientData } );
                    }else{
                        logger.error( ERROR.EMPTY_SEATS, clientData);
                        //socket.emit('grid-error', ERROR.EMPTY_SEATS);
                        socket.emit('grid-error', { result : ERROR.EMPTY_SEATS, request : clientData } );
                    }

                })
                .catch( error => logger.error( error ) );
        }
        else{
            socket.emit('group-seats', { result: seats, request : clientData } );
        }
    });

    /**
     *  좌석 예약 ( 수동 )
     */
    socket.on('reserve', clientData => {
        
        if( !checkAuth( clientData )){
            logger.error( `${JSON.stringify(ERROR.AUTH_FAILED)} ${JSON.stringify(clientData)}`);
            socket.emit('grid-error', { result : ERROR.AUTH_FAILED, request : clientData });
            return;
        }

        let seats = getSeats( clientData );
        if( seats == undefined ){
            logger.error( `${JSON.stringify(ERROR.EMPTY_SEATS)} ${JSON.stringify(clientData)}`);
            socket.emit('grid-error', { result : ERROR.EMPTY_SEATS, request : clientData });
        }else{

            if( seats.reserve( clientData )) {
                //socket.emit('grid-error', ERROR.RESERVE_FAILD);
                logger.info(`reserve succ : ${clientData.id}, row=${clientData.rowIndex}, col=${clientData.colIndex}`);

                //io.sockets.in(`${clientData.accountGroupNo}^${clientData.eventSessionIndex}`).emit('reserve-succ', clientData );
                socket.emit('my-reserve-succ', { result : clientData, request : clientData } );
                socket.broadcast.to( socket.roomName ).emit('reserve-succ', { result : clientData, request : clientData} );

                //io.sockets.in(socket.roomName).emit('reserve-succ', clientData );

                dao.updateReservedSeat( 'Y', clientData )
                    .then( dbResult => {
                        // DB에 업데이트한 데이터가 없다는 것은 ?
                        // 클라이언트가 인덱스 값을 잘 못 전달했다는 얘기 
                        if( dbResult.affectedRows < 1 ){
                            logger.error(`reserve was failed, maybe invalid seat index : ${JSON.stringify(clientData)}`);
                            socket.emit('grid-error', { result : ERROR.RESERVE_FAILD, request : clientData } );
                        }
                    })
                    .catch( error => {
                        //TODO : 실패한 예약좌석을 실패 로그 파일에 기록한다. (복구용)
                        logger.error( `update reserved seat error! ${JSON.stringify(clientData)}`);
                        backupQueryLog( 'Y', clientData );
                    });
            }else{
                // 예약에 실패 했을 경우 
                logger.info( `reserve failed : ${clientData.id}, row=${clientData.rowIndex}, col=${clientData.colIndex}`);
                socket.emit('reserve-failed', { result : ERROR.RESERVE_FAILED, request : clientData } );
            }
        }
    });

    /**
     * 좌석 최소 
     */
    socket.on('cancel', clientData => {
        
        if( !checkAuth( clientData )){
            logger.error( `${JSON.stringify(ERROR.AUTH_FAILED)} ${JSON.stringify(clientData)}`);
            socket.emit('grid-error', { result : ERROR.AUTH_FAILED, request : clientData });
            return;
        }

        let seats = getSeats( clientData );

        if( seats == undefined ){
            logger.error( `${JSON.stringify(ERROR.EMPTY_SEATS)} ${JSON.stringify(clientData)}`);
            socket.emit('grid-error', { result : ERROR.EMPTY_SEATS, request : clientData });
        }else{

            if( seats.cancel( clientData )) {
                //socket.emit('grid-error', ERROR.RESERVE_FAILD);
                logger.info(`cancel succ : ${clientData.id}, row=${clientData.rowIndex}, col=${clientData.colIndex}`);

                //io.sockets.in(`${clientData.accountGroupNo}^${clientData.eventSessionIndex}`).emit('reserve-succ', clientData );
                io.sockets.in(socket.roomName).emit('cancel-succ', { result : clientData, request : clientData } );

                dao.updateReservedSeat( 'N', clientData )
                    .then( dbResult => {
                        // DB에 업데이트한 데이터가 없다는 것은 ?
                        // 클라이언트가 인덱스 값을 잘 못 전달했다는 얘기 
                        if( dbResult.affectedRows < 1 ){
                            logger.error(`cacel was failed, maybe aleady cancel or invalid seat index : ${JSON.stringify(clientData)}`);
                            //socket.emit('grid-error', ERROR.RESERVE_FAILD);
                        }
                    })
                    .catch( error => {
                        //TODO : 실패한 예약좌석을 실패 로그 파일에 기록한다. (복구용)
                        logger.error( `update cancel seat error! ${JSON.stringify(clientData)}`);
                        backupQueryLog( 'N', clientData );
                    });
            }else{
                // 예약에 실패 했을 경우 
                logger.info( `cancel failed : ${clientData.id}, row=${clientData.rowIndex}, col=${clientData.colIndex}`);
                socket.emit('cancel-failed', { result : ERROR.RESERVE_FAILED, request : clientData });
            }
        }
    });

    /**
     *  여러개의 좌석 예약을 취소한다. 
     */
    socket.on( 'cancel-seats', clientData => {
        if( !checkAuth( clientData )){
            logger.error( `${JSON.stringify(ERROR.AUTH_FAILED)} ${JSON.stringify(clientData)}`);
            socket.emit('grid-error', { result : ERROR.AUTH_FAILED, request : clientData });
            return;
        }
        let seats = getSeats( clientData );

        if( seats == undefined ){
            logger.error( `${JSON.stringify(ERROR.EMPTY_SEATS)} ${JSON.stringify(clientData)}`);
            socket.emit('grid-error', { result : ERROR.EMPTY_SEATS, request : clientData});
        }else{

            let cancelSeatSeqArr = seats.cancelSeats( clientData.seats );

            // 클라이언트가 보낸 시트 갯수와 실제 취소한 갯수와 비교 해야 하는데... 일단 스킵!
            if( cancelSeatSeqArr.length > 0  ){

                // socket.emit('grid-error', ERROR.RESERVE_FAILD);
                logger.info(`cancel succ : ${clientData.id}, ${JSON.stringify(clientData.seats)}`);

                // 자기 자신에게 성공 신호를 보낸다. 
                socket.emit('my-cancel-seats-succ', { result : clientData, request : clientData } );

                //io.sockets.in(socket.roomName).emit('cancel-seats-succ', clientData );
                socket.broadcast.to( socket.roomName ).emit('cancel-seats-succ', { result : clientData, request : clientData } );

                dao.updateAssignedSeat('N', cancelSeatSeqArr )
                    .then( dbResult => {
                       // DB에 업데이트한 데이터가 없다는 것은 ?
                        // 클라이언트가 인덱스 값을 잘 못 전달했다는 얘기 
                        if( dbResult.affectedRows < 1 ){
                            logger.error(`cacel-seats was failed, maybe aleady cancel or invalid seats index : ${JSON.stringify(clientData)}`);
                            socket.emit('grid-error', { result : ERROR.ASSIGN_FAILED, request : clientData } );
                        } 
                    })
                    .catch( error => {
                        logger.error( `update cancel-seats error! ${JSON.stringify(clientData)}`);
                        backupAssignQueryLog( 'N', cancelSeatSeqArr );
                    });
            }else{

                socket.emit('cancel-seats-failed', { result : ERROR.ASSIGN_FAILED, request : clientData } );
                logger.info(`cancel-seats-failed : ${JSON.stringify(clientData)}` );
            }
            
        }
    });

    socket.on( 'assign', clientData => {

        if( !checkAuth( clientData )){
            logger.error( `${JSON.stringify(ERROR.AUTH_FAILED)} ${JSON.stringify(clientData)}`);
            socket.emit('grid-error', { result : ERROR.AUTH_FAILED, request : clientData } );
            return;
        }

        let seats = getSeats( clientData );

        if( seats == undefined ){
            logger.error( `${JSON.stringify(ERROR.EMPTY_SEATS)} ${JSON.stringify(clientData)}`);
            socket.emit('grid-error', { result : ERROR.EMPTY_SEATS, request : clientData });
        }else{
            
            let sequentialSeats = seats.assign( clientData );

            if( sequentialSeats != null ){

                logger.info(`assign seats succ : ${JSON.stringify(sequentialSeats)}`);

                let seqArr = _.map( sequentialSeats, seatObj => seatObj.seq );

                dao.updateAssignedSeat( 'Y', seqArr )
                    .then( dbResult => {
                        socket.emit('my-assign-succ', { result : sequentialSeats, request : clientData });
                        socket.broadcast.to( socket.roomName ).emit('assign-succ', { result : sequentialSeats, request : clientData } );
                        //io.sockets.in( socket.roomName ).emit('assign-succ', clientData);
                    })
                    .catch( error => {
                        logger.error( error );
                        logger.error( `update assign seat error! ${JSON.stringify(seqArr)}`);

                        backupAssignQueryLog( 'Y', seqArr);
                    });

            }else{
                // 자동할당에 실패 했다. 
                logger.info( `assign failed : ${clientData.id}, seatCount : ${clientData.seatCount}`);
                socket.emit('assign-failed', { result : ERROR.ASSIGN_FAILED, request : clientData } );
            }
        }
    });


    socket.on( 'disconnect', (client) => {
        //logger.info( `disconnect socket : ${socket.handshake.addres}`);
        logger.info( `disconnect socket : ${socket.name}`);
        socket.leave( socket.roomName );
    });

});

let backupQueryLog =  ( reservedYn, clientData ) => {
    backupLogger.error(
            `UPDATE to_seats SET reserved ='${reservedYn}' WHERE account_group_no = ${clientData.accountGroupNo} AND event_session_index = ${clientData.eventSessionIndex} AND   seat_group_index = ${clientData.seatGroupIndex} AND   seat_row_index = ${clientData.rowIndex} AND   seat_column_index = ${clientData.colIndex} ;`);
}

let backupAssignQueryLog = ( reservedYn, seqs = []) => {
    backupLogger.error( `UPDATA to_seats SET reserved = '${reservedUYn}' WHERE seq in (?) ; `);
}

let createSeats = ( dbResult, { accountGroupNo, eventSessionIndex, seatGroupIndex} ) => {
    let seats = new Seats( accountGroupNo, eventSessionIndex, seatGroupIndex ); 
    seats.init( dbResult );
    seatsMap.set( `${accountGroupNo}^${eventSessionIndex}^${seatGroupIndex}`, seats);
    return seats;
}

let getSeats = (  { accountGroupNo, eventSessionIndex, seatGroupIndex} ) => {
    let mapKey = `${accountGroupNo}^${eventSessionIndex}^${seatGroupIndex}`; // accountGroupNo^eventSessionIndex^seatGroupIndex
    let seats = seatsMap.get(mapKey);
    return seats;
}

let checkAuth = ( { accountGroupNo, apiKey } )  => {
    // TODO expired datetime 을 고려해야 한다. 

    if( accountGroupNo == undefined ) return false;
    let memApiKey = accountMap.get(accountGroupNo);

    if( apiKey == undefined ){
        return false;
    }
    else{
        return apiKey == memApiKey ? true : false;
    }
}


/*var shutdown = () => {
    logger.info("shutdown........");

    gracefulExit.gracefulExitHandler(app, server, {
        socketio : app.settings.socketio
    });
}

process.on('SIGTERM', shutdown );
process.on("SIGINT",  shutdown );*/


