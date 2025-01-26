const AWS = require('aws-sdk');

// Configure the AWS region and credentials
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1', // Replace with your region
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Access key
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY // Secret key
});

const sqs = new AWS.SQS();

const queueURL = process.env.SQS_QUEUE_URL; // The URL of your SQS queue

// Function to send a message to the SQS queue
async function sendMessageToQueue(messageBody) {
    try {
        const params = {
            QueueUrl: queueURL, // The URL of your SQS queue
            MessageBody: JSON.stringify(messageBody), // The message you want to send
            MessageAttributes: {
                "Attribute1": {
                    DataType: "String",
                    StringValue: "value1"
                },
                "Attribute2": {
                    DataType: "Number",
                    StringValue: "123"
                }
            }
        };

        // Send the message to the queue
        const data = await sqs.sendMessage(params).promise();
        console.log(`Message sent successfully, MessageId: ${data.MessageId}`);
    } catch (error) {
        console.error('Error sending message to SQS:', error);
    }
}

module.exports = {
    sendMessageToQueue
};