var config = require('../config/config.json');
var mysql = require('mysql');
var pool = mysql.createPool(config.db);

var DB = (function () {

    function _query(query, params, callback) {

        pool.getConnection(function (err, connection) {

            if (err) {
                if( connection != undefined )
                    connection.release();

                callback(null, err);
                return;
            }

            connection.query(query, params, function (err, rows) {
                connection.release();
                if (!err) {
                    callback(rows);
                }
                else {
                    callback(null, err);
                }

            });

            /*connection.on('enqueue', function(sequence) {
                if ('Query' === sequence.constructor.name) {
                  console.log(sequence.sql);
                }
              });*/

            /*connection.on('error', function (err) {
                connection.release();
                callback(null, err);
                throw err;
            });*/
        });
    };

    return {
        query: _query
    };
})();

module.exports = DB;