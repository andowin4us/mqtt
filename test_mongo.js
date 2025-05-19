const { MongoClient } = require('mongodb');

async function checkMongoConnection(connectionUrl) {
    const client = new MongoClient(connectionUrl);
    let serverStatus;
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');

        // Optionally ping the server to check responsiveness
        const adminDb = client.db().admin();
        serverStatus = await adminDb.ping();
        console.log('Server status:', typeof serverStatus.ok);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        serverStatus = false;
    } finally {
        console.log('Released connection');
        await client.close();
    }

    return serverStatus;
}

console.log("datat", checkMongoConnection("mongodb://localhost:27017/mqtt"));