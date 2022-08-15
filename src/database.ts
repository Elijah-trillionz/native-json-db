import * as fs from "fs/promises";
import * as fsSync from "fs";
import { instanceOfNodeError } from "./error";
import Ajv from "ajv";

interface Data {
  [key: string]: any[];
}

// merely indicating that the object should not be empty
interface IncDecObject {
  [key: string]: number;
}

interface Object {
  [key: string]: any;
  $inc?: IncDecObject;
  $dec?: IncDecObject;
}

// error object
interface ErrorObj {
  message: string;
  errorCode: number;
  error: string;
  params?: Object; // for ajv error
}

class JSONDB {
  readonly data: Data;
  readonly dataName: string;
  readonly dataArr: Object[];
  validate: any;
  connected: boolean;
  updateKeywords: string[];

  constructor(dataName: string) {
    const existingData = getExistingData(dataName);
    this.data = existingData ? existingData : { [dataName]: [] };
    this.dataName = dataName;
    this.dataArr = this.data[this.dataName];
    this.validate = null;
    this.connected = false;
    this.updateKeywords = ["push", "inc", "dec", "pop"];
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
      this.validateSchema(data, (err: ErrorObj) => {
        if (err) return reject(err);

        this.validateData(data, async (err: ErrorObj) => {
          if (err) return reject(err);

          this.dataArr.push(data);
          await this.updateJSONFile();
          resolve("done");
        });
      });
    });
  }

  // find object with the key value
  findOne(filter: Object): Promise<Object | null> {
    return new Promise((resolve, reject) => {
      this.validateData(filter, (err: ErrorObj) => {
        if (err) return reject(err);

        this.filter(filter, (err: ErrorObj, foundData: Object[]) => {
          // resolve with null if not found, allowing the dev control it from the try block
          if (err && err.error === "NOT_FOUND") {
            return resolve(null);
          } else if (err && err.error === "BAD_REQUEST") {
            return reject(err);
          }

          resolve(foundData[0]);
        });
      });
    });
  }

  // find all objects with a key value
  findMany(filter: Object): Promise<Object[]> {
    return new Promise((resolve, reject) => {
      this.validateData(filter, (err: ErrorObj) => {
        if (err) return reject(err);

        this.filter(filter, (err: ErrorObj, foundData: Object[]) => {
          // resolve with [] if not found, allowing the dev control it from the try block
          if (err && err.error === "NOT_FOUND") {
            return resolve([]);
          } else if (err && err.error === "BAD_REQUEST") {
            return reject(err);
          }

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

        if (!oldData) {
          return reject({
            message: "No data was found to be updated",
            errorCode: 612,
            error: "NOT_FOUND",
          });
        }

        this.validateData(newData, async (err: ErrorObj) => {
          if (err) return reject(err);

          await this.update(oldData, newData, (err: ErrorObj) => {
            if (err) return reject(err);

            resolve("Done");
          });
        });
      } catch (e) {
        // for errors thrown when the findOne method encounters an error
        reject(e);
      }
    });
  }

  updateMany(filter: Object, newData: Object) {
    return new Promise(async (resolve, reject) => {
      try {
        const oldData = await this.findMany(filter);

        if (oldData.length < 1) {
          return reject({
            message: "No data was found to be updated",
            errorCode: 612,
            error: "NOT_FOUND",
          });
        }

        this.validateData(newData, async (err: ErrorObj) => {
          if (err) return reject(err);

          oldData.forEach((value) => {
            (async () => {
              await this.update(value, newData, (err: ErrorObj) => {
                if (err) return reject(err);

                resolve("Done");
              });
            })();
          });
        });
      } catch (e) {
        // for errors thrown when the findMany method encounters an error
        reject(e);
      }
    });
  }

  // helper functions

  // find an object from data
  // will return the first data if no key/value is provided
  private filter = (filter: Object, cb: Function) => {
    const keys = Object.keys(filter);
    const values = Object.values(filter);

    // return as invalid
    if (keys.length < 1 || values.length < 1) {
      return cb(
        {
          message: "Filter object does not contain any key/values",
          error: "BAD_REQUEST",
          errorCode: 616,
        },
        null
      );
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

    return cb(
      {
        message: "Object does not exist in your data",
        error: "NOT_FOUND",
        errorCode: 612,
      },
      null
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

  private async update(oldData: Object, newData: Object, cb: Function) {
    // find any update keywords in newData object
    const keys = Object.keys(newData);
    const specialUpdateKeys = keys.filter((key) => {
      return this.updateKeywords.includes(`${key.substring(1)}`);
    });

    let newObj = { ...newData };
    if (specialUpdateKeys.length >= 1) {
      specialUpdateKeys.forEach((specialUpdateKey) => {
        const objectToUpdate = newData[specialUpdateKey];
        // verify that the specialUpdateKey has an object as value
        if (typeof objectToUpdate === "object") {
          const keysToUpdate = Object.keys(objectToUpdate);
          switch (specialUpdateKey) {
            case "$inc":
              newObj = this.updateNumberValues(
                keysToUpdate,
                "$inc",
                oldData,
                newObj,
                objectToUpdate
              );
              break;
            case "$dec":
              newObj = this.updateNumberValues(
                keysToUpdate,
                "$dec",
                oldData,
                newObj,
                objectToUpdate
              );
              break;
          }
        }
      });
    }

    // create a new object that contains both the old data and new data
    // then validate this new object against the schema
    const updatedData = { ...oldData, ...newObj };
    // just to make sure the updated data follows the schema
    this.validateSchema(updatedData, async (err: ErrorObj) => {
      if (err) return cb(err);

      this.dataArr[this.dataArr.indexOf(oldData)] = updatedData;

      await this.updateJSONFile();
      return cb(null, true);
    });
  }

  // validate schema: used in the update and the create method
  private validateSchema = (data: Object, cb: Function) => {
    const valid = this.validate(data);
    if (!valid) {
      const { keyword, params, message } = this.validate.errors[0];
      return cb({
        message,
        error: `INVALID_SCHEMA_RES:${keyword?.toUpperCase()}`,
        params,
        errorCode: 615,
      });
    }

    return cb(null);
  };

  // deep helper function
  // increment or decrement a value based on previous values
  private updateNumberValues = (
    keysToUpdate: string[],
    specialUpdateKey: "$inc" | "$dec",
    oldData: Object,
    newObj: Object,
    objectToUpdate: Object
  ) => {
    // first find the keys to decrement
    keysToUpdate.forEach((keyToUpdate) => {
      // console.log(keyToUpdate) /// age
      // get the previous value in the oldData
      const prevValue = oldData[keyToUpdate]; // note there is a possibility that the data doesn't exist, or it isn't a number;
      if (typeof prevValue === "number") {
        // the dev will provide a value to update by. this must be number, handle for js;
        const valToUpdateBy = objectToUpdate[keyToUpdate];
        const updatedVal =
          specialUpdateKey === "$inc"
            ? prevValue + valToUpdateBy
            : prevValue - valToUpdateBy;
        newObj = { ...newObj, [keyToUpdate]: updatedVal };
      }
    });
    // now remove the update key and value from the newObj
    delete newObj[specialUpdateKey];
    return newObj;
  };

  // use this function in each method to validate that data is an object only (useful for javascript)
  private validateData = (data: Object, cb: Function) => {
    // verify that the server is connected before doing anything
    if (!this.connected) {
      return cb({
        message: "Your server is not connected. Use the connect() method",
        error: "NO_CONNECTION",
        errorCode: 614,
      });
    }

    // TODO: remove for typescript
    if (
      typeof data !== "object" ||
      (typeof data === "object" && Array.isArray(data))
    ) {
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
// 616: bad_request: happens when you send an empty object

// TODOS:
// validate file is written successfully, else return error
// hide the private methods in JavaScript
// incrementing/decrementing numbers in an object like { name: 'John', age: 21 }
// pushing and popping to an array in an object like { name: 'John', friends: ['James', 'Ken'] }
// handle thrown errors where promises where used e.g the create method
