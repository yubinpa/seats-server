var db = require('./db.js');

class Dao {

    selectGroupSeats( { accountGroupNo = 0, eventSessionIndex=0, seatGroupIndex = 0 } ){

        return new Promise ( (resolve, reject ) => {

            let query = "SELECT seq, seat_group_name, \
            CONCAT( seat_row_name, seat_column_name ) as seat_name, \
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


    updateReservedSeat( reservedYn = 'Y', { accountGroupNo = 0, eventSessionIndex = 0, seatGroupIndex = 0, rowIndex, colIndex } ) {

        return new Promise(

            (resolve, reject) => {

                let query = "UPDATE to_seats SET reserved = ? \
                            WHERE account_group_no = ? \
                            AND   event_session_index = ? \
                            AND   seat_group_index = ? \
                            AND   seat_row_index = ? \
                            AND   seat_column_index = ?"; 

                db.query( query, [ reservedYn, accountGroupNo, eventSessionIndex, seatGroupIndex, rowIndex, colIndex ],

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

                let query = "UPDATE to_seats SET reserved = ?  WHERE seq in (?) ";

                db.query( query, [ reservedYn, inStatement ],

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