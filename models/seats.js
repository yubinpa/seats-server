const _ = require('lodash');

class Seats {
    //seats[account]['세션정보']['groupName'][row][col]
    constructor( accountGroupNo = 0, sessionIndex = 0, groupIndex = 0) {
        this.seats = [];
        this.account = {};
        this.account.groupNo = accountGroupNo;
        this.sessionIndex = sessionIndex;
        this.groupIndex = groupIndex;
        this.seatGroupName = '';
        this.seatGroupIndex = 0;

        // key : seatCount, value : { rowIndex, colIndex } 
        this.nextSearchIndex = new Map();
    }
    /**
     * 좌석을 예약합니다. 
     * @param {*} param0 
     */
    reserve( { rowIndex, colIndex } ){
        try{
            if( this.seats[rowIndex][colIndex].reserved === 'N' ) {
                this.seats[rowIndex][colIndex].reserved = 'Y';
                return true;
            }else{
                return false;
            }
        }catch(ex){
            console.error(`Error: ${ex.message}`);
            return false;
        }
    }


    assign( { seatCount } ){
        // 동반인 수별 검색 시작 위치 
        let startIndex = this.nextSearchIndex[seatCount];

        // 저장 되어 있는 정보가 없다면 초기화 
        if( startIndex == undefined ){
            startIndex = { rowIndex : 0, colIndex : 0 };
        }else{

            if( startIndex.rowIndex == -1 ){
                return null;
            }
        }

        for( let checkRowIndex = startIndex.rowIndex; checkRowIndex < this.seats.length; ++checkRowIndex ){

            let row = this.seats[checkRowIndex];
            let rowSequentialSeatCount = 0;
            let rowSequentialSeats = [];

            for( let checkColIndex = startIndex.colIndex; checkColIndex < row.length; ++checkColIndex ){

                if( row[checkColIndex].reserved == 'N' ){
                    rowSequentialSeatCount++;
                    rowSequentialSeats.push(this.seats[checkRowIndex][checkColIndex]);
                }else{
                    // 이미 예약된 있는 자리라면
                    rowSequentialSeatCount = 0;
                    rowSequentialSeats = [];

                    // 마지막 열(column)이 라면, 열심히 찾았는데 마지막.
                    if( checkColIndex == row.length -1 ){

                        // 다음 행의 처음부터 검색 
                        startIndex.colIndex = 0;
                    }
                    continue;
                }

                // 필요한 연속 자리를 다 찾았다면 
                if( seatCount == rowSequentialSeatCount ){

                    // 다음번에 시작할 위치를 저장하기. 
                    // checkColIndex + 1 이 이 row의 길이보다 같거나 크면 rowIndex 를 증가 시켜야 하고, 
                    // 증가 시킨 rowIndex 가 this.seats.length 보다 같거나 크녀 -1 을 설정하여 끝까지 검색했다는 의미로 하자. 
                    // startIndex.rowIndex 가 -1 일 순 있는데 startIndex.colIndex 가 -1 일 순 없다
                    // 끝까지 검색했는 지 체크할 때는 startIndex.rowIndex 가 -1 인지 체크해서 결정한다. 
                    // 마지막 줄이면 -1
                    let nextStartRowIndex = checkRowIndex;
                    let nextStartColIndex = checkColIndex + 1; 
                    if( nextStartColIndex >= row.length ){

                        // 증가 시킨 rowIndex 가 this.seats.length 보다 같거나 크녀 -1 을 설정하여 끝까지 검색했다는 의미로 하자. 
                        nextStartRowIndex = nextStartRowIndex + 1 < this.seats.length ? nextStartRowIndex + 1 : -1;

                        // 새로운 행의 첫번째 열 
                        nextStartColIndex = 0;
                    }

                    let nextStartIndex = { rowIndex : nextStartRowIndex, colIndex : nextStartColIndex };

                    // 다음 번에 시작할 위치를 저장해 놓고 
                    this.nextSearchIndex.set( seatCount, nextStartIndex );

                    // 예약으로 처리 하고 새로운 배열을 리턴 



                    /*for( let i = 0; i < rowSequentialSeats.length; ++i ){
                        let seatObj = rowSequentialSeats[i];
                        seatObj.reserved = "Y";
                    }*/

                    _.forEach( rowSequentialSeats, seatObj => seatObj.reserved = "Y");
                    return rowSequentialSeats;

                    /*let arrSeats =  _.map( rowSequentialSeats, seatObj => { seatObj.reserved = "Y" } ); 
                    return arrSeats;*/
                   
                    //return _.map( rowSequentialSeats, seatObj => { seatObj.reserved = "Y" } )
                    //return rowSequentialSeats;
                }

            }
        }

        // return 이 안되고 여기 까지 왔다는 것은 끝까지 찾았다는 것. 
        this.nextSearchIndex.set(seatCount, { rowIndex : -1, colIndex : 0 });
        return null;
    }

    /**
     * 좌석을 취소 합니다. 
     */
    cancel( { rowIndex, colIndex } ){
        try{
            this.seats[rowIndex][colIndex].reserved = 'N';
            return true;
        }catch(ex){
            console.error(`Error: ${ex.message}`);
            return false;
        }
    }

    /**
     * 좌석을 없는 자리로 간주한다. 
     */
    deleteSeat( { rowIndex, colIndex } ){
        try{
            this.seats[rowIndex][colIndex].reserved = 'D';
            return true;
        }catch(ex){
            console.error(`Error: ${ex.message}`);
            return false;
        }
    }

    /**
     * 여러개의 좌석을 취소합니다. 
     * 반환되는 배열이 비워 있으면 실패!
     */
    cancelSeats( cancelClientSeats = [] ){

        let seqs = [];

        _.forEach( cancelClientSeats, seat => {

            try{
                this.seats[seat.rowIndex][seat.colIndex].reserved = 'N';
                seqs.push( this.seats[seat.rowIndex][seat.colIndex].seq );
            }catch(ex){
                console.error(`Error: ${ex.message}`);
            }

        });
        
        return seqs;
    }


    init( data = []){

        let rows = [];
        // 행 이름 
        let tempSeatRowName = data[0]['seat_row_name'];
//        console.log("tempSeatRowName : ", tempSeatRowName)

        for( let i=0; i < data.length; ++i ){
            // 행 이름이 바뀌거나 마지막 row 일 때 
            if( ( tempSeatRowName !== data[i]['seat_row_name'] && i != 0 ) || i == data.length -1  ){

                // 마지막 row이면 rows에 담고 
                if( i == data.length -1 )
                    rows.push( new Seat( data[i]['seq'], data[i]['seat_name'], data[i]['seat_row_index'], data[i]['seat_column_index'], data[i]['reserved']));

                // 행 이름이 바뀌면 그 동안 담았던 열 정보를 seats 에 푸시하고 
                this.seats.push( Object.assign( [], rows ) );

                rows = []; //  배열 초기화을 초기화 한다. 
                rows.push( new Seat( data[i]['seq'], data[i]['seat_name'], data[i]['seat_row_index'], data[i]['seat_column_index'] , data[i]['reserved']));
                
                tempSeatRowName = data[i]['seat_row_name'];

            }else{
                // 행 이름이 같으면 
                rows.push( new Seat( data[i]['seq'], data[i]['seat_name'], data[i]['seat_row_index'], data[i]['seat_column_index'] , data[i]['reserved']));

            }
        }

    }

    print(){
        console.log(this.seats);
    }

}


class Seat {
    constructor( seq, seatName, rowIndex, colIndex, reserved){
        this.seq = seq;
        this.seatName = seatName;
        this.rowIndex = rowIndex;
        this.colIndex = colIndex;
        this.reserved = reserved;
    }
}

module.exports = Seats;