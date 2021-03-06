var db = require('./db.js');

class Dao {

    now() {
        var date = new Date();
        var m = date.getMonth()+1;
        var d = date.getDate();
        var h = date.getHours();
        var i = date.getMinutes();
        var s = date.getSeconds();
        return date.getFullYear()+'-'+(m>9?m:'0'+m)+'-'+(d>9?d:'0'+d)+' '+(h>9?h:'0'+h)+':'+(i>9?i:'0'+i)+':'+(s>9?s:'0'+s);
    }
    

    selectGroupSeats( { accountGroupNo = 0, eventSessionIndex=0, seatGroupIndex = 0 } ){

        return new Promise ( (resolve, reject ) => {

            let query = "SELECT seq, seat_group_name, \
            CONCAT( seat_row_name, '-', seat_column_name ) as seat_name, \
            seat_row_name, seat_row_index, seat_column_index, reserved \
            FROM to_seats \
            WHERE account_group_no = ? \
            AND   event_session_index = ? \
            AND   seat_group_index = ? \
            ORDER BY `seat_group_index`, `seat_row_index`, `seat_column_index` ";

            db.query( query, [ accountGroupNo, eventSessionIndex, seatGroupIndex ],

                ( result, error ) => {

                    if( !error ){
                        resolve(result);
                    }else{
                        reject(error);
                    }

                } 
            );
            
        });
    }


    updateReservedSeat( reservedYn = 'Y', { accountGroupNo = 0, eventSessionIndex = 0, seatGroupIndex = 0, rowIndex, colIndex, mobileTicketNo } ) {

        return new Promise(

            (resolve, reject) => {

                let query = "UPDATE to_seats SET reserved = ?, mobile_ticket_no = ?, reserved_datetime = ?, update_datetime = ? \
                            WHERE account_group_no = ? \
                            AND   event_session_index = ? \
                            AND   seat_group_index = ? \
                            AND   seat_row_index = ? \
                            AND   seat_column_index = ?"

                db.query( query, [ reservedYn, mobileTicketNo, this.now(), this.now(), accountGroupNo, eventSessionIndex, seatGroupIndex, rowIndex, colIndex ],

                    (result, error)=>{
                        if( !error ) {
                            resolve( result );
                        }else{
                            reject(error);
                        }
                    }
                );
            }
        );
    }

    updateAssignedSeat( reservedYn = 'Y', seqArr = [] ) {

        let inStatement = seqArr.join(",");

        return new Promise(

            (resolve, reject) => {
                let query = "";
                let params = [];
                //예약 쿼리 
                if( reservedYn == 'Y'){
                    query = "UPDATE to_seats SET reserved = ?, reserved_datetime = ?, update_datetime = ?  WHERE seq in (?) ";
                    params = [ reservedYn, this.now(), this.now(), inStatement ];
                }else{
                //수정 쿼리 
                    query = "UPDATE to_seats SET reserved = ?, update_datetime = ?  WHERE seq in (?) ";
                    params = [ reservedYn, this.now(), inStatement ];
                }

                db.query( query, params, 

                    (result, error)=>{
                        if( !error ) {
                            resolve( result );
                        }else{
                            reject(error);
                        }
                    }
                );
            }
        );
    }

    selectAccount( id, apiKey ) {

        return new Promise(

            ( resolve, reject ) => {

                let query = "SELECT id, group_no FROM to_accounts WHERE id = ? AND api_key = ?";

                db.query( query, [id, apiKey],

                    ( result, error ) => {
                        if( !error ) {
                            //console.log( result );
                            resolve( result );
                        }else {
                            reject( error );
                        }
                    }
                );
            }
        );
    }
}

let dao = new Dao();

module.exports = dao;