import * as fs from "fs/promises";
import * as fsSync from "fs";
import { instanceOfNodeError } from "./error";
import Ajv from "ajv";

interface Data {
  [key: string]: any[];
}

// merely indicating that the object should not be empty
interface Object {
  [key: string]: any;
}

// error object
interface ErrorObj {
  message: string;
  errorCode: number;
  error: string;
}

class JSONDB {
  readonly data: Data;
  readonly dataName: string;
  validate: any;
  connected: boolean;

  constructor(dataName: string) {
    const existingData = getExistingData(dataName);
    this.data = existingData ? existingData : { [dataName]: [] };
    this.dataName = dataName;
    this.validate = null;
    this.connected = false;
  }

  // get the whole data in d document
  get allData() {
    return new Promise(async (resolve) => {
      resolve(this.data);
    });
  }

  // connect to the db: basically ensuring schema is valid else throw an error
  // ensure that the schema is ready and active before the db is ready to be used
  connect(schema: Object) {
    return new Promise((resolve, reject) => {
      const ajv = new Ajv();
      if (this.connected) {
        return reject({
          message:
            "Can only connect and create a schema once per every instance",
          error: "CONNECTION_ERROR",
          errorCode: 613,
        });
      }

      this.connected = true;
      this.validate = ajv.compile(schema);
    });
  }

  // creating data === add data to the document
  create(data: Object) {
    return new Promise((resolve, reject) => {
      // validate the data with the given schema
      const valid = this.validate(data);
      if (!valid) {
        const { keyword, params, message } = this.validate.errors[0];
        return reject({
          message,
          error: `INVALID_SCHEMA_RES:${keyword?.toUpperCase()}`,
          params,
          errorCode: 615,
        });
      }

      this.validateData(data, async (err: ErrorObj) => {
        if (err) return reject(err);

        this.data[this.dataName].push(data);
        await this.updateJSONFile();
        resolve("done");
      });
    });
  }

  // find object with the key value
  findOne(filter: any): Promise<Object> {
    return new Promise((resolve, reject) => {
      this.validateData(filter, (err: ErrorObj) => {
        if (err) return reject(err);

        const keys = Object.keys(filter);
        const values = Object.values(filter);

        this.filter(keys, values, (err: ErrorObj, foundData: Object[]) => {
          // resolve with an empty object if not found, useful for updating
          if (err && err.error === "NOT_FOUND") return resolve({});

          resolve(foundData[0]);
        });
      });
    });
  }

  // find all objects with a key value
  findMany(filter: any): Promise<Object[]> {
    return new Promise((resolve, reject) => {
      this.validateData(filter, (err: ErrorObj) => {
        if (err) return reject(err);

        const keys = Object.keys(filter);
        const values = Object.values(filter);

        this.filter(keys, values, (err: ErrorObj, foundData: Object[]) => {
          // resolve with an empty array if not found, useful for updating
          if (err && err.error === "NOT_FOUND") return resolve([]);

          resolve(foundData);
        });
      });
    });
  }

  // find an object and update
  // both filter and newData has to be an object
  findOneAndUpdate(filter: Object, newData: Object) {
    return new Promise(async (resolve, reject) => {
      try {
        const oldData = await this.findOne(filter);
        // oldData will be an empty object if not found, as such update all data
        this.validateData(oldData, (err: ErrorObj) => {
          if (err) return reject(err);
        });
      } catch (e) {
        // for errors thrown when the findOne method encounters an error
        reject(e);
      }
    });
  }

  // helper functions

  // find an object from data
  // will return the first data if no key/value is provided
  private filter = (keys: string[], values: unknown[], cb: Function) => {
    const found = this.data[this.dataName].filter((item) => {
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

    return cb(
      {
        message: "Object does not exist in your data",
        error: "NOT_FOUND",
        errorCode: 612,
      },
      found
    );
  };

  // private
  private async updateJSONFile() {
    await fs.writeFile(
      `data/${this.dataName}.json`,
      JSON.stringify(this.data),
      {
        flag: "w",
      }
    );
  }

  private async update(oldData: Object, newData: Object) {
    // validate the data with the given schema
    const valid = this.validate(newData);
    if (!valid) {
      const { keyword, params, message } = this.validate.errors[0];
      return {
        message,
        error: `INVALID_SCHEMA_RES:${keyword?.toUpperCase()}`,
        params,
        errorCode: 615,
      };
    }

    const keys = Object.keys(newData);
    const values = Object.values(newData);
    keys.forEach((key, index) => {
      // reason for condition: leave old data if current data of a property is undefined
      oldData[key] = values[index] ? values[index] : oldData[key];
    });
    await this.updateJSONFile();
    return "done";
  }

  // use this function in each method to validate that data is an object only (useful for javascript)
  validateData = (data: Object, cb: Function) => {
    // verify that the server is connected before doing anything
    if (!this.connected) {
      return cb({
        message: "Your server is not connected. Use the connect() method",
        error: "NO_CONNECTION",
        errorCode: 614,
      });
    }

    // TODO: remove for typescript
    if (typeof data !== "object" && Array.isArray(data)) {
      return cb({
        message: "Data must be an object",
        error: "INVALID_TYPE",
        errorCode: 611,
      });
    }

    return cb(null);
  };
}

function getExistingData(dataName: string) {
  try {
    const data = fsSync.readFileSync(`data/${dataName}.json`);
    return JSON.parse(data.toString());
  } catch (e) {
    if (instanceOfNodeError(e, TypeError)) {
      if (e.code === "ENOENT") {
        const initialData = { [dataName]: [] };
        fsSync.writeFileSync(
          `data/${dataName}.json`,
          JSON.stringify(initialData)
        );
        return initialData;
      }
    }
  }
}

export default JSONDB;

// ERROR CODES: not all are errors, you could say REJECT CODES, where the reject function is used::
// 611: invalid data type - a core error when submitting a data that isn't an object
// 612: not found - when the filter method finds no occurrences
// 613: connection error: because schema cannot be compiled more than once, the server must be connected only once in every instance
// 614: no connection: happens when you don't connect before using nay method
// 615: all schema errors from ajv

// TODOS:
// validate file is written successfully, else return error
// hide the private methods in JavaScript
// incrementing/decrementing numbers in an object like { name: 'John', age: 21 }
// pushing and popping to an array in an object like { name: 'John', friends: ['James', 'Ken'] }
// handle thrown errors where promises where used e.g the create method
