const Mongo = require('../common/mongo');
const connection = require('./connection');

module.exports = new Mongo(connection.mongo.url, connection.mongo.database);
