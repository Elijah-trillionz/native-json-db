import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { instanceOfNodeError } from './error';
class JSONDB {
    constructor(dataName) {
        const existingData = getExistingData(dataName);
        this.data = existingData ? existingData : { [dataName]: [] };
        this.dataName = dataName;
    }
    // get the whole data in d document
    get allData() {
        return new Promise(async (resolve) => {
            resolve(this.data);
        });
    }
    // creating data === add data to the document
    create(data) {
        return new Promise(async (resolve, reject) => {
            this.data[this.dataName].push(data);
            await this.updateJSONFile();
            resolve('done');
        });
    }
    // find object with the key value
    findOne(filter) {
        return new Promise((resolve, reject) => {
            const keys = Object.keys(filter);
            const values = Object.values(filter);
            if (keys.length === values.length) {
                const found = this.data[this.dataName].find((item) => {
                    let isFound = true;
                    keys.forEach((key, index) => {
                        if (item[key] !== values[index]) {
                            isFound = false;
                        }
                    });
                    return isFound;
                });
                resolve(found);
            }
            else {
                reject('no key');
            }
        });
    }
    // find all objects with a key value
    findAll(filter) {
        return new Promise((resolve, reject) => {
            const keys = Object.keys(filter);
            const values = Object.values(filter);
            if (keys.length === values.length) {
                const found = this.data[this.dataName].filter((item) => {
                    let isFound = true;
                    keys.forEach((key, index) => {
                        if (item[key] !== values[index]) {
                            isFound = false;
                        }
                    });
                    return isFound;
                });
                resolve(found);
            }
            else {
                // indicates filter is not an object
                reject('filter needs to be an object');
            }
        });
    }
    // update object values with new values
    // both filter and newData has to be an object
    findOneAndUpdate(filter, newData) {
        return new Promise(async (resolve, reject) => {
            const oldData = await this.findOne(filter);
            if (typeof oldData !== 'string') {
                const result = await this.update(oldData, newData);
                resolve(result);
            }
            else {
                reject(undefined);
            }
        });
    }
    // update many
    updateMany(filter, newData) {
        return new Promise(async (resolve, reject) => {
            const occurrences = await this.findAll(filter);
            if (Array.isArray(occurrences)) {
                occurrences.forEach(async (oldData) => {
                    const result = await this.update(oldData, newData);
                    resolve(result);
                });
            }
            else {
                reject(undefined);
            }
        });
    }
    // delete
    delete(filter) {
        return new Promise((resolve, reject) => {
            setTimeout(async () => { }, 500);
        });
    }
    // helper functions
    // private
    async updateJSONFile() {
        await fs.writeFile(`data/${this.dataName}.json`, JSON.stringify(this.data), {
            flag: 'w',
        });
    }
    async update(oldData, newData) {
        const keys = Object.keys(newData);
        const values = Object.values(newData);
        keys.forEach((key, index) => {
            // reason for condition: leave old data if current data of a property is undefined
            oldData[key] = values[index] ? values[index] : oldData[key];
        });
        await this.updateJSONFile();
        return 'done';
    }
}
// TODO: how to make a class method private
function getExistingData(dataName) {
    try {
        const data = fsSync.readFileSync(`data/${dataName}.json`);
        return JSON.parse(data.toString());
    }
    catch (e) {
        if (instanceOfNodeError(e, TypeError)) {
            if (e.code === 'ENOENT') {
                const initialData = { [dataName]: [] };
                fsSync.writeFileSync(`data/${dataName}.json`, JSON.stringify(initialData));
                return initialData;
            }
        }
    }
}
export default JSONDB;
