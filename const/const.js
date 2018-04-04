const ERROR = {

    PARAMS_INVALID : { code :"002", desc : "parameters is invalid"},
    AUTH_FAILED : { code : "001" , desc : "auth failed!" },
    RESERVE_FAILED : { code : "101", desc : "seat reservation was failed!"},
    ASSIGN_FAILED : { code : "102", desc : "seat assignment was failed!"},
    EMPTY_SEATS : { code : "201" , desc : "seats data is empty!"},
    DATABASE : { code : "900" , desc : "database error!"}

}

module.exports = ERROR;