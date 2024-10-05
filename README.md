# mqtt
## kindly follow the below step to ececute the project.
1. Navigate to "package.json" and start the project with "npm start".

2. Kindly add the environment values for NODE_ENV=production APP, PORT, HOSTNAME, APP_SECRET, JWT_EXPIRES_IN, MONGOURI, MONGO_DATABASE,
MQTT_URL.

3. Once values are added in env file, start the project "npm.start".

4. PM2 config command

pm2 install pm2-logrotate

# max log size is 1GB
pm2 set pm2-logrotate:max_size 1G

# compress logs when rotated (optional)
pm2 set pm2-logrotate:compress true

# force rotate every hours
pm2 set pm2-logrotate:rotateInterval '0 * * * *'

pm2 save