import * as fs from "fs/promises";
import * as fsSync from "fs";
import { instanceOfNodeError } from "./error";

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
  schema: {};

  constructor(dataName: string) {
    const existingData = getExistingData(dataName);
    this.data = existingData ? existingData : { [dataName]: [] };
    this.dataName = dataName;
    this.schema = {};
  }

  // get the whole data in d document
  get allData() {
    return new Promise(async (resolve) => {
      resolve(this.data);
    });
  }

  // creating a schema for the data, could you work on the schema
  createSchema(schema: Object) {
    this.schema = schema;
  }

  // creating data === add data to the document
  create(data: Object) {
    return new Promise((resolve, reject) => {
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

  // helper functions
  // find an object from data
  // will return the first data if no key/value is provided
  private filter = (keys: string[], values: unknown[], cb: Function) => {
    const found = this.data[this.dataName].filter((item) => {
      let isFound = true;
      keys.forEach((key, index) => {
        // console.log(item[key], values[index]);
        if (item[key] !== values[index]) {
          isFound = false;
        }
      });
      console.log(isFound);
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
    const keys = Object.keys(newData);
    const values = Object.values(newData);
    keys.forEach((key, index) => {
      // reason for condition: leave old data if current data of a property is undefined
      oldData[key] = values[index] ? values[index] : oldData[key];
    });
    await this.updateJSONFile();
    return "done";
  }

  // use this function in each method to validate data is an object only in javascript
  validateData = (data: Object, cb: Function) => {
    if (typeof data === "object" && !Array.isArray(data)) {
      return cb(null);
    }

    return cb({
      message: "Data must be an object",
      error: "INVALID_TYPE",
      errorCode: 611,
    });
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

// TODOS:
// validate file is written successfully, else return error
// hide the private methods in JavaScript
// incrementing/decrementing numbers in an object like { name: 'John', age: 21 }
// pushing and popping to an array in an object like { name: 'John', friends: ['James', 'Ken'] }
