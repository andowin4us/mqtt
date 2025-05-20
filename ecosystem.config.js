const dotenv = require('dotenv');
dotenv.config({ path: process.env.ENV_PATH || '.env' });

module.exports = {
    "apps": [{
        "name": 'mqtt-processor',
        "script": 'mqtt-processor.js',
        "instances": 1,
        "autorestart": true,
        "watch": false,
        "max_memory_restart": '1G',
        "node_args": '--expose-gc',
        "env": {
            "NODE_ENV": 'development'
        },
        "env_production": {
            "NODE_ENV": 'production'
        },
        "error_file": 'logs/mqtt-processor-error.log',
        "out_file": 'logs/mqtt-processor-out.log',
        "time": true,
        "merge_logs": true,
        "log_date_format": 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
        "name": 'http-server',
        "script": 'index.js',
        "instances": 'max',
        "exec_mode": 'cluster',
        "autorestart": true,
        "watch": false,
        "max_memory_restart": '1G',
        "node_args": '--expose-gc',
        "env": {
            "NODE_ENV": 'development'
        },
        "env_production": {
            "NODE_ENV": 'production'
        },
        "error_file": 'logs/http-server-error.log',
        "out_file": 'logs/http-server-out.log',
        "time": true,
        "merge_logs": true,
        "log_date_format": 'YYYY-MM-DD HH:mm:ss Z',
        "max_restarts": 10,
        "min_uptime": '30s',
        "kill_timeout": 3000,
        "wait_ready": true,
        "listen_timeout": 3000,
        "shutdown_with_message": true
    }]
}