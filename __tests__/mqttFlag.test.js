const { updateFlag, getData } = require('../models/MQTTFlag');
const Util = require('../helper/util');
const moment = require('moment');

jest.mock('../helper/util');
jest.mock('moment', () => {
    return jest.fn(() => ({
        format: jest.fn().mockReturnValue('2025-02-22 12:00:00')
    }));
});

describe('MQTTFlag.js', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        // If you have a MongoDB connection, close it here.
        if (global.mongoConnection) {
            await global.mongoConnection.close();
        }
    
        jest.restoreAllMocks();
    });    

    describe('updateFlag', () => {
        it('should update the flag successfully', async () => {
            const tData = { flag: true };
            const userInfo = { accesslevel: 1, userName: 'testUser' };
            const result = { _id: '123', flag: false };
            const updateResult = { modifiedCount: 1 };

            Util.mongo.findOne.mockResolvedValue(result);
            Util.mongo.updateOne.mockResolvedValue(updateResult);
            moment.mockReturnValue({ format: jest.fn().mockReturnValue('2025-02-22 12:00:00') });

            const response = await updateFlag(tData, userInfo);

            expect(response).toEqual({
                statusCode: 200,
                success: true,
                msg: 'MQTT Flag Success',
                status: updateResult,
                err: ''
            });
            expect(Util.mongo.findOne).toHaveBeenCalledWith('MQTTFlag', {});
            expect(Util.mongo.updateOne).toHaveBeenCalledWith('MQTTFlag', { _id: result._id }, { $set: expect.any(Object) });
            expect(Util.addAuditLogs).toHaveBeenCalledWith('DEVICE_CONFIG', userInfo, 'update', 'testUser updated the Device Congfigurations.', 'success', JSON.stringify(updateResult));
        });

        it('should handle permission error', async () => {
            const tData = { flag: true };
            const userInfo = { accesslevel: 2 };

            const response = await updateFlag(tData, userInfo);

            expect(response).toEqual({
                statusCode: 403,
                success: false,
                msg: 'NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.',
                status: [],
                err: ''
            });
            expect(Util.mongo.findOne).not.toHaveBeenCalled();
            expect(Util.mongo.updateOne).not.toHaveBeenCalled();
            expect(Util.addAuditLogs).not.toHaveBeenCalled();
        });

        it('should handle flag not found', async () => {
            const tData = { flag: true };
            const userInfo = { accesslevel: 1, userName: 'testUser' };

            Util.mongo.findOne.mockResolvedValue(null);

            const response = await updateFlag(tData, userInfo);

            expect(response).toEqual({
                statusCode: 404,
                success: false,
                msg: 'MQTT Flag Error',
                status: [],
                err: ''
            });
            expect(Util.mongo.findOne).toHaveBeenCalledWith('MQTTFlag', {});
            expect(Util.mongo.updateOne).not.toHaveBeenCalled();
            expect(Util.addAuditLogs).not.toHaveBeenCalled();
        });

        it('should handle update error', async () => {
            const tData = { flag: true };
            const userInfo = { accesslevel: 1, userName: 'testUser' };
            const result = { _id: '123', flag: false };

            Util.mongo.findOne.mockResolvedValue(result);
            Util.mongo.updateOne.mockRejectedValue(new Error('Update error'));

            const response = await updateFlag(tData, userInfo);

            expect(response).toEqual({
                statusCode: 500,
                success: false,
                msg: 'MQTT Flag Error',
                status: [],
                err: new Error('Update error')
            });
            expect(Util.mongo.findOne).toHaveBeenCalledWith('MQTTFlag', {});
            expect(Util.mongo.updateOne).toHaveBeenCalledWith('MQTTFlag', { _id: result._id }, { $set: expect.any(Object) });
            expect(Util.addAuditLogs).toHaveBeenCalledWith('DEVICE_CONFIG', userInfo, 'update', 'testUser updated the Device Congfigurations.', 'failure', {});
        });
    });

    describe('getData', () => {
        it('should get data successfully', async () => {
            const tData = {};
            const userInfo = {};
            const result = [{ _id: '123', flag: true }];

            Util.mongo.findAll.mockResolvedValue(result);

            const response = await getData(tData, userInfo);

            expect(response).toEqual({
                statusCode: 200,
                success: true,
                msg: 'MQTT Flags get Successful',
                status: result,
                err: { totalSize: result.length }
            });
            expect(Util.mongo.findAll).toHaveBeenCalledWith('MQTTFlag', {});
        });

        it('should handle data not found', async () => {
            const tData = {};
            const userInfo = {};

            Util.mongo.findAll.mockResolvedValue(null);

            const response = await getData(tData, userInfo);

            expect(response).toEqual({
                statusCode: 404,
                success: false,
                msg: 'MQTT Flags get Failed',
                status: [],
                err: ''
            });
            expect(Util.mongo.findAll).toHaveBeenCalledWith('MQTTFlag', {});
        });

        it('should handle get data error', async () => {
            const tData = {};
            const userInfo = {};

            Util.mongo.findAll.mockRejectedValue(new Error('Get data error'));

            const response = await getData(tData, userInfo);

            expect(response).toEqual({
                statusCode: 500,
                success: false,
                msg: 'MQTT Flags get Error',
                status: [],
                err: new Error('Get data error')
            });
            expect(Util.mongo.findAll).toHaveBeenCalledWith('MQTTFlag', {});
        });
    });
});