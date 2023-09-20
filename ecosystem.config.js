const dotenv = require('dotenv');
dotenv.config({ path: process.env.ENV_PATH || '.env' });

module.exports = {
    "apps": [{
        "name" : process.env.APP,
        "script" : "index.js",// name of the startup file
        "instances" : 3,          // number of workers you want to run
        "exec_mode" : "cluster",  // to turn on cluster mode; defaults to 'fork' mode 
        "env": {
            "PORT" : process.env.PORT // the port on which the app should listen
        }
    }]
}