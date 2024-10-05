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


// Mosquitto setup

If you're still encountering the "ECONNREFUSED" error with your public IP address (`35.154.95.187:1883`), let's troubleshoot the issue step-by-step:

### Step 1: Verify Mosquitto is Running

Make sure the Mosquitto service is actually running on your EC2 instance:

```bash
sudo systemctl status mosquitto
```

If it’s not running, start it:

```bash
sudo systemctl start mosquitto
```

### Step 2: Check Mosquitto Configuration

Ensure that your Mosquitto configuration allows connections from external clients. Open the configuration file:

```bash
sudo nano /etc/mosquitto/mosquitto.conf
```

1. **Ensure `listener` is set** (it usually defaults to 1883):
   ```plaintext
   listener 1883
   ```
2. **Allow anonymous access for testing** (if not already configured):
   ```plaintext
   allow_anonymous true
   ```
3. Save the changes and restart Mosquitto:
   ```bash
   sudo systemctl restart mosquitto
   ```

### Step 3: Check Security Group Settings

1. Go to the **AWS Management Console**.
2. Navigate to **EC2** and find your instance.
3. Click on the **Security Group** associated with your instance.
4. Ensure there’s an inbound rule for TCP on port `1883`:
   - **Type**: Custom TCP Rule
   - **Protocol**: TCP
   - **Port Range**: 1883
   - **Source**: Anywhere (0.0.0.0/0) or your specific IP address (for testing).

### Step 4: Check Local Firewall (if applicable)

If you're running a firewall on your EC2 instance, ensure it allows connections on port 1883. If you're using `iptables`, you can allow it with:

```bash
sudo iptables -A INPUT -p tcp --dport 1883 -j ACCEPT
```

### Step 5: Test Connectivity Locally

To confirm that Mosquitto is working locally on the EC2 instance:

1. **Open a new terminal** on your EC2 instance.
2. Use `mosquitto_sub` to subscribe to a topic:
   ```bash
   mosquitto_sub -h localhost -t test/topic
   ```
3. In another terminal, publish a message:
   ```bash
   mosquitto_pub -h localhost -t test/topic -m "Hello from Mosquitto!"
   ```

If this works, then Mosquitto is functioning correctly locally.

### Step 6: Verify Public IP Connectivity

1. **Check if the public IP is reachable**:
   You can try pinging your public IP from your local machine to ensure it’s accessible.
   ```bash
   ping 35.154.95.187
   ```

2. **Try using an external MQTT client** (like MQTT.fx or a similar tool) from your local machine to connect to the broker using the public IP.

### Step 7: Review Logs for Errors

Check the Mosquitto logs for any relevant error messages:

```bash
sudo tail -f /var/log/mosquitto/mosquitto.log
```

### Conclusion

Following these steps should help you resolve the connection issue. If you continue to face problems, please provide any specific error messages from the logs or additional details about your configuration, and I’ll assist you further!