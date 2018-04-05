# 데몬처럼 실행하기 
    npm start ( npm install -g forever  가 선행되어야 함. )
    npm stop 
# node 로 실행하기 
    node app.js
## debug mode 로 실행하기 
    DEBUG=* node app.js ( 리눅스 )
    set DEBUG=* & node app.js ( 윈도우 )
    
# .vscode 디렉토리는 디버깅을 위한 디렉토리( 무시해도 됨 )
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