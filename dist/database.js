"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONDB = void 0;
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const error_1 = require("./error");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
class JSONDB {
    constructor(dataName) {
        // helper functions
        // find an object from data
        // will return the first data if no key/value is provided
        this.filter = (filter, cb) => {
            const keys = Object.keys(filter);
            const values = Object.values(filter);
            // return as invalid
            if (keys.length < 1 || values.length < 1) {
                return cb({
                    message: 'Filter object does not contain any key/values',
                    error: 'BAD_REQUEST',
                    errorCode: 615,
                }, null);
            }
            const found = this.dataArr.filter((item) => {
                let isFound = true;
                keys.forEach((key, index) => {
                    if (item[key] !== values[index]) {
                        isFound = false;
                    }
                });
                return isFound;
            });
            if (found.length >= 1) {
                return cb(null, found);
            }
            return cb({
                message: 'Object does not exist in your data',
                error: 'NOT_FOUND',
                errorCode: 612,
            }, null);
        };
        // validate schema
        this.validateSchema = (data, cb) => {
            const valid = this.validate(data);
            if (!valid) {
                const { keyword, params, message } = this.validate.errors[0];
                return cb({
                    message,
                    error: `INVALID_SCHEMA_RES:${keyword === null || keyword === void 0 ? void 0 : keyword.toUpperCase()}`,
                    params,
                    errorCode: 614,
                });
            }
            return cb(null);
        };
        // deep helper function
        // increment or decrement a value based on previous values
        this.updateNumberValues = (keysToUpdate, specialUpdateKey, oldData, newObj, objectToUpdate) => {
            // first find the keys to decrement
            keysToUpdate.forEach((keyToUpdate) => {
                // get the previous value in the oldData
                const prevValue = oldData[keyToUpdate]; // note there is a possibility that the data doesn't exist, or it isn't a number;
                if (typeof prevValue === 'number') {
                    // the dev will provide a value to update by. this must be number, handle for js;
                    const valToUpdateBy = objectToUpdate[keyToUpdate];
                    const updatedVal = specialUpdateKey === '$inc'
                        ? prevValue + valToUpdateBy
                        : prevValue - valToUpdateBy;
                    newObj = { ...newObj, [keyToUpdate]: updatedVal };
                }
            });
            // now remove the update key and value from the newObj
            delete newObj[specialUpdateKey];
            return newObj;
        };
        // push or pull to and from an array
        this.updateArrayValues = (keysToUpdate, specialUpdateKey, oldData, newObj, objectToUpdate) => {
            // first find the key(s) to push to
            keysToUpdate.forEach((keyToUpdate) => {
                // get the previous value in the oldData
                const prevValue = oldData[keyToUpdate];
                if (Array.isArray(prevValue)) {
                    // object to push to or pop from array
                    const updatingFactor = objectToUpdate[keyToUpdate];
                    let updatedArrValue;
                    if (specialUpdateKey === '$pop') {
                        // updatingFactor here is the index number, but only first (0) and last (-1) is valid
                        const prevValueClone = [...prevValue];
                        // make sure the updatingFactor is either 0 or -1 in js
                        prevValueClone.splice(updatingFactor, 1);
                        updatedArrValue = [...prevValueClone];
                    }
                    else {
                        updatedArrValue = [...prevValue, updatingFactor];
                    }
                    newObj = { ...newObj, [keyToUpdate]: updatedArrValue };
                }
            });
            // now remove the update key and value from the newObj
            delete newObj[specialUpdateKey];
            return newObj;
        };
        const existingData = getExistingDataSync(dataName);
        this.data = existingData ? existingData : { [dataName]: [] };
        this.dataName = dataName;
        this.dataArr = this.data[this.dataName];
        this.validate = null;
        this.connected = false;
        this.updateKeywords = ['push', 'inc', 'dec', 'pop'];
        this.dbOptions = { writeSync: true, indentSpace: 2 };
    }
    // get the whole data in d document
    get allData() {
        return new Promise(async (resolve) => {
            resolve(this.dataArr);
        });
    }
    // connect to the db: basically ensuring schema is valid else throw an error
    // ensure that the schema is ready and active before the db is ready to be used
    connect(schema, options) {
        return new Promise((resolve, reject) => {
            const ajv = new ajv_1.default();
            (0, ajv_formats_1.default)(ajv);
            if (this.connected) {
                return reject({
                    message: 'Can only connect and create a schema once for every instance/collection',
                    error: 'CONNECTION_ERROR',
                    errorCode: 613,
                });
            }
            this.connected = true;
            this.validate = ajv.compile(schema);
            // set writeSync option if given
            if (!(options === null || options === void 0 ? void 0 : options.writeSync)) {
                this.dbOptions.writeSync = false;
            }
            // set indentSpace option if given and verify it's a number for js users
            if ((options === null || options === void 0 ? void 0 : options.indentSpace) && typeof options.indentSpace === 'number') {
                this.dbOptions.indentSpace = options.indentSpace;
            }
            resolve('connected');
        });
    }
    // creating data === add data to the document
    create(data) {
        return new Promise((resolve, reject) => {
            // validate the data with the given schema
            this.validateSchema(data, async (err) => {
                if (err)
                    return reject(err);
                this.dataArr.push(data);
                await this.updateJSONFile();
                resolve('done');
            });
        });
    }
    // find object with the key value
    findOne(filter) {
        return new Promise((resolve, reject) => {
            this.filter(filter, (err, foundData) => {
                // resolve with null if not found, allowing the dev control it from the try block
                if (err && err.error === 'NOT_FOUND') {
                    return resolve(null);
                }
                else if (err && err.error === 'BAD_REQUEST') {
                    return reject(err);
                }
                resolve(foundData[0]);
            });
        });
    }
    // find all objects with a key value
    findMany(filter) {
        return new Promise((resolve, reject) => {
            this.filter(filter, (err, foundData) => {
                // resolve with [] if not found, allowing the dev control it from the try block
                if (err && err.error === 'NOT_FOUND') {
                    return resolve([]);
                }
                else if (err && err.error === 'BAD_REQUEST') {
                    return reject(err);
                }
                resolve(foundData);
            });
        });
    }
    // find an object and update
    // both filter and newData has to be an object
    findOneAndUpdate(filter, newData) {
        return new Promise(async (resolve, reject) => {
            try {
                const oldData = await this.findOne(filter);
                if (!oldData) {
                    return reject({
                        message: 'No data was found to be updated',
                        errorCode: 612,
                        error: 'NOT_FOUND',
                    });
                }
                await this.update(oldData, newData, (err, updatedData) => {
                    if (err)
                        return reject(err);
                    resolve(updatedData);
                });
            }
            catch (e) {
                // for errors thrown when the findOne method encounters an error
                reject(e);
            }
        });
    }
    updateMany(filter, newData, options) {
        return new Promise(async (resolve, reject) => {
            try {
                let oldData;
                if (options && options.updateAll) {
                    oldData = await this.allData;
                }
                else {
                    oldData = await this.findMany(filter);
                    if (oldData.length < 1) {
                        return reject({
                            message: 'No data was found to be updated',
                            errorCode: 612,
                            error: 'NOT_FOUND',
                        });
                    }
                }
                const updatedDataArr = oldData.map(async (value) => {
                    return await this.update(value, newData, (err, updatedData) => {
                        if (err)
                            return reject(err);
                        return updatedData;
                    });
                });
                resolve(Promise.all(updatedDataArr));
            }
            catch (e) {
                // for errors thrown when the findMany or update method encounters an error
                reject(e);
            }
        });
    }
    // find an object and delete
    findOneAndDelete(filter) {
        return new Promise(async (resolve, reject) => {
            try {
                const data = await this.findOne(filter);
                if (!data) {
                    // resolve with an empty obj indicating no document was deleted
                    return resolve({});
                }
                this.dataArr.splice(this.dataArr.indexOf(data), 1);
                await this.updateJSONFile();
                // return the data deleted
                resolve(data);
            }
            catch (e) {
                // for errors thrown when the findOne method encounters an error
                reject(e);
            }
        });
    }
    // find similar objects and delete
    deleteMany(filter, options) {
        return new Promise(async (resolve, reject) => {
            try {
                let dataArr;
                if (options && options.deleteAll) {
                    dataArr = [...(await this.allData)]; // gets rid of surface reference
                    this.dataArr.length = 0;
                    await this.updateJSONFile();
                    resolve(dataArr);
                    return;
                }
                dataArr = await this.findMany(filter);
                if (dataArr.length <= 0) {
                    // resolve with an empty array indicating no document was deleted
                    return resolve([]);
                }
                dataArr.forEach((data) => {
                    this.dataArr.splice(this.dataArr.indexOf(data), 1);
                });
                await this.updateJSONFile();
                resolve(dataArr);
            }
            catch (e) {
                // for errors thrown when the findMany method encounters an error
                reject(e);
            }
        });
    }
    // private
    async updateJSONFile() {
        if (this.dbOptions.writeSync) {
            (0, fs_1.writeFileSync)(`data/${this.dataName}.json`, JSON.stringify(this.data, null, this.dbOptions.indentSpace), {
                flag: 'w',
            });
        }
        else {
            await (0, promises_1.writeFile)(`data/${this.dataName}.json`, JSON.stringify(this.data, null, this.dbOptions.indentSpace), {
                flag: 'w',
            });
        }
    }
    async update(oldData, newData, cb) {
        // find any update keywords in newData object
        const keys = Object.keys(newData);
        // verify the newData is an object, useful for javascript users
        if (typeof newData !== 'object' || Array.isArray(newData)) {
            return cb({
                message: 'New data must be an object',
                error: 'INVALID_DATA_TYPE',
                errorCode: 611,
            });
        }
        const specialUpdateKeys = keys.filter((key) => {
            return this.updateKeywords.includes(`${key.substring(1)}`);
        });
        let newObj = { ...newData };
        if (specialUpdateKeys.length >= 1) {
            specialUpdateKeys.forEach((specialUpdateKey) => {
                const objectToUpdate = newData[specialUpdateKey];
                // verify that the specialUpdateKey has an object as value
                if (typeof objectToUpdate === 'object') {
                    const keysToUpdate = Object.keys(objectToUpdate);
                    switch (specialUpdateKey) {
                        case '$inc':
                            newObj = this.updateNumberValues(keysToUpdate, '$inc', oldData, newObj, objectToUpdate);
                            break;
                        case '$dec':
                            newObj = this.updateNumberValues(keysToUpdate, '$dec', oldData, newObj, objectToUpdate);
                            break;
                        case '$push':
                            newObj = this.updateArrayValues(keysToUpdate, '$push', oldData, newObj, objectToUpdate);
                            break;
                        case '$pop':
                            newObj = this.updateArrayValues(keysToUpdate, '$pop', oldData, newObj, objectToUpdate);
                            break;
                    }
                }
            });
        }
        // create a new object that contains both the old data and new data
        // then validate this new object against the schema
        const updatedData = { ...oldData, ...newObj };
        // just to make sure the updated data follows the schema
        return this.validateSchema(updatedData, async (err) => {
            if (err)
                return cb(err);
            this.dataArr[this.dataArr.indexOf(oldData)] = updatedData;
            await this.updateJSONFile();
            return cb(null, updatedData);
        });
    }
}
exports.JSONDB = JSONDB;
// synchronous cox it is only called once per every constructor
function getExistingDataSync(dataName) {
    try {
        const data = (0, fs_1.readFileSync)(`data/${dataName}.json`);
        return JSON.parse(data.toString());
    }
    catch (e) {
        if ((0, error_1.instanceOfNodeError)(e, Error)) {
            if (e.code === 'ENOENT') {
                const initialData = { [dataName]: [] };
                try {
                    // create data directory only if it hasn't been created
                    (0, fs_1.mkdirSync)('data');
                }
                catch (e) {
                    (0, fs_1.writeFileSync)(`data/${dataName}.json`, JSON.stringify(initialData, null, 2));
                    return initialData;
                }
            }
        }
    }
}
