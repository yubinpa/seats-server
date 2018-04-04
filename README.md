# 데몬처럼 실행하기 
    npm start ( npm install -g forever  가 선행되어야 함. )
    npm stop 
# node 로 실행하기 
    node app.js
# config/config.json
{
    "processTitle" : "seat-server-proc",

    "db" : {
        "host" : "*",
        "database" : "seats",
        "user" : "seats",
        "password" : "*"
    },

    "log4j" : { 
                "appenders" : { 
                    "grid-server-file" : { 
                        "type" : "dateFile", 
                        "filename" : "./logs/grid-server.log" ,
                        "pattern" : "yyyy-MM-dd"
                    },
                    "console" : {
                        "type" : "console"
                    },
                    "backup-log" : {
                        "type" : "file",
                        "filename" : "./logs/backup-seats.log"
                    }
                },

                "categories" : { 
                    "grid-server" : {
                        "appenders" : [ "grid-server-file", "console" ],
                        "level" : "debug" 
                    },
                    "backup-log" : {
                        "appenders" : [ "backup-log"],
                        "level" : "error"
                    },
                    "default" : {
                        "appenders" : [ "grid-server-file"],
                        "level" : "trace"
                    }
                }
    }
}