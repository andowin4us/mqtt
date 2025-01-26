// Import the required AWS SDK v3 packages
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// Set up AWS SDK client
const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1', // Replace with your region
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Replace with your access key
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY // Replace with your secret key
    }
});

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

        // Create the command to send the message
        const command = new SendMessageCommand(params);

        // Send the message to the queue
        const data = await sqsClient.send(command);
        console.log(`Message sent successfully, MessageId: ${data.MessageId}`);
    } catch (error) {
        console.error('Error sending message to SQS:', error);
    }
}

module.exports = {
    sendMessageToQueue
};