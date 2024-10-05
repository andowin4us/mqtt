const mqtt = require('mqtt');

const broker = 'mqtt://your-ec2-public-dns or ip:1883'; // Replace with your EC2 instance public DNS or IP
const topic = 'Logs';

const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
const options = {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: userName || null,
    password: password || null,
    reconnectPeriod: 1000,

};
const client = mqtt.connect(broker, options);

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    client.subscribe(topic, (err) => {
        if (!err) {
            console.log(`Subscribed to topic: ${topic}`);
            client.publish(topic, 'Hello from Node.js!');
        } else {
            console.error(`Subscription error: ${err}`);
        }
    });
});

client.on('message', (topic, message) => {
    console.log(`Message received on topic ${topic}: ${message.toString()}`);
});

client.on('error', (err) => {
    console.error(`Connection error: ${err}`);
});
