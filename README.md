#config/config.json

{
    "processTitle" : "seat-server-proc",

    "db" : {
        "host" : "117.52.74.253",
        "database" : "seats",
        "user" : "seats",
        "password" : "grid04)!"
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