import { writeFile } from "fs/promises";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
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
  $pop?: {
    [key: string]: 0 | -1;
  };
  $push?: {
    [key: string]: any;
  };
}

// error object
interface ErrorObj {
  message: string;
  errorCode: number;
  error: string;
  params?: Object; // for ajv error
}

// updateMany options
interface UpdateManyOptions {
  updateAll: boolean;
}

// updateMany options
interface DeleteManyOptions {
  deleteAll: boolean;
}

// connecting to db options
interface ConnectOptions {
  writeSync?: boolean; // determine if to use sync or async when writing to file
  indentSpace?: number;
}

export class JSONDB {
  private readonly data: Data;
  private readonly dataName: string;
  private readonly dataArr: Object[];
  private validate: any;
  private connected: boolean;
  private updateKeywords: string[];
  private dbOptions: ConnectOptions;

  constructor(dataName: string) {
    const existingData = getExistingDataSync(dataName);
    this.data = existingData ? existingData : { [dataName]: [] };
    this.dataName = dataName;
    this.dataArr = this.data[this.dataName];
    this.validate = null;
    this.connected = false;
    this.updateKeywords = ["push", "inc", "dec", "pop"];
    this.dbOptions = { writeSync: true, indentSpace: 2 };
  }

  // get the whole data in d document
  get allData(): Promise<Object[]> {
    return new Promise(async (resolve) => {
      resolve(this.dataArr);
    });
  }

  // connect to the db: basically ensuring schema is valid else throw an error
  // ensure that the schema is ready and active before the db is ready to be used
  connect(schema: Object, options: ConnectOptions) {
    return new Promise((resolve, reject) => {
      const ajv = new Ajv();
      if (this.connected) {
        return reject({
          message:
            "Can only connect and create a schema once for every instance/collection",
          error: "CONNECTION_ERROR",
          errorCode: 613,
        });
      }

      this.connected = true;
      this.validate = ajv.compile(schema);

      // set writeSync option if given
      if (!options?.writeSync) {
        this.dbOptions.writeSync = false;
      }

      // set indentSpace option if given and verify it's a number for js users
      if (options?.indentSpace && typeof options.indentSpace === "number") {
        this.dbOptions.indentSpace = options.indentSpace;
      }

      resolve("connected");
    });
  }

  // creating data === add data to the document
  create(data: Object) {
    return new Promise((resolve, reject) => {
      // validate the data with the given schema
      this.validateSchema(data, async (err: ErrorObj) => {
        if (err) return reject(err);

        this.dataArr.push(data);
        await this.updateJSONFile();
        resolve("done");
      });
    });
  }

  // find object with the key value
  findOne(filter: Object): Promise<Object | null> {
    return new Promise((resolve, reject) => {
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
  }

  // find all objects with a key value
  findMany(filter: Object): Promise<Object[]> {
    return new Promise((resolve, reject) => {
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
  }

  // find an object and update
  // both filter and newData has to be an object
  findOneAndUpdate(filter: Object, newData: any) {
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

        await this.update(
          oldData,
          newData,
          (err: ErrorObj, updatedData: Object) => {
            if (err) return reject(err);

            resolve(updatedData);
          }
        );
      } catch (e) {
        // for errors thrown when the findOne method encounters an error
        reject(e);
      }
    });
  }

  updateMany(filter: Object, newData: Object, options?: UpdateManyOptions) {
    return new Promise(async (resolve, reject) => {
      try {
        let oldData: Object[];

        if (options && options.updateAll) {
          oldData = await this.allData;
        } else {
          oldData = await this.findMany(filter);
          if (oldData.length < 1) {
            return reject({
              message: "No data was found to be updated",
              errorCode: 612,
              error: "NOT_FOUND",
            });
          }
        }

        const updatedDataArr: Object[] = oldData.map(async (value) => {
          return await this.update(
            value,
            newData,
            (err: ErrorObj, updatedData: Object) => {
              if (err) return reject(err);

              return updatedData;
            }
          );
        });
        resolve(Promise.all(updatedDataArr));
      } catch (e) {
        // for errors thrown when the findMany or update method encounters an error
        reject(e);
      }
    });
  }

  // find an object and delete
  findOneAndDelete(filter: Object) {
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
      } catch (e) {
        // for errors thrown when the findOne method encounters an error
        reject(e);
      }
    });
  }

  // find similar objects and delete
  deleteMany(filter: Object, options?: DeleteManyOptions) {
    return new Promise(async (resolve, reject) => {
      try {
        let dataArr: Object[];
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
          errorCode: 615,
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
    if (this.dbOptions.writeSync) {
      writeFileSync(
        `data/${this.dataName}.json`,
        JSON.stringify(this.data, null, this.dbOptions.indentSpace),
        {
          flag: "w",
        }
      );
    } else {
      await writeFile(
        `data/${this.dataName}.json`,
        JSON.stringify(this.data, null, this.dbOptions.indentSpace),
        {
          flag: "w",
        }
      );
    }
  }

  private async update(oldData: Object, newData: any, cb: Function) {
    // find any update keywords in newData object
    const keys = Object.keys(newData);
    // verify the newData is an object, useful for javascript users
    if (typeof newData !== "object" || Array.isArray(newData)) {
      return cb({
        message: "New data must be an object",
        error: "INVALID_DATA_TYPE",
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
            case "$push":
              newObj = this.updateArrayValues(
                keysToUpdate,
                "$push",
                oldData,
                newObj,
                objectToUpdate
              );
              break;
            case "$pop":
              newObj = this.updateArrayValues(
                keysToUpdate,
                "$pop",
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
    return this.validateSchema(updatedData, async (err: ErrorObj) => {
      if (err) return cb(err);

      this.dataArr[this.dataArr.indexOf(oldData)] = updatedData;

      await this.updateJSONFile();
      return cb(null, updatedData);
    });
  }

  // validate schema
  private validateSchema = (data: Object, cb: Function) => {
    const valid = this.validate(data);
    if (!valid) {
      const { keyword, params, message } = this.validate.errors[0];
      return cb({
        message,
        error: `INVALID_SCHEMA_RES:${keyword?.toUpperCase()}`,
        params,
        errorCode: 614,
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

  // push or pull to and from an array
  private updateArrayValues = (
    keysToUpdate: string[],
    specialUpdateKey: "$push" | "$pop",
    oldData: Object,
    newObj: Object,
    objectToUpdate: Object
  ) => {
    // first find the key(s) to push to
    keysToUpdate.forEach((keyToUpdate) => {
      // get the previous value in the oldData
      const prevValue = oldData[keyToUpdate];
      if (Array.isArray(prevValue)) {
        // object to push to or pop from array
        const updatingFactor = objectToUpdate[keyToUpdate];

        let updatedArrValue: Object[];
        if (specialUpdateKey === "$pop") {
          // updatingFactor here is the index number, but only first (0) and last (-1) is valid
          const prevValueClone = [...prevValue];
          // make sure the updatingFactor is either 0 or -1 in js
          prevValueClone.splice(updatingFactor, 1);
          updatedArrValue = [...prevValueClone];
        } else {
          updatedArrValue = [...prevValue, updatingFactor];
        }
        newObj = { ...newObj, [keyToUpdate]: updatedArrValue };
      }
    });
    // now remove the update key and value from the newObj
    delete newObj[specialUpdateKey];
    return newObj;
  };
}

// synchronous cox it is only called once per every constructor
function getExistingDataSync(dataName: string) {
  try {
    const data = readFileSync(`data/${dataName}.json`);
    return JSON.parse(data.toString());
  } catch (e) {
    if (instanceOfNodeError(e, Error)) {
      if (e.code === "ENOENT") {
        const initialData = { [dataName]: [] };
        try {
          // create data directory only if it hasn't been created
          mkdirSync("data");
        } catch (e) {
          writeFileSync(
            `data/${dataName}.json`,
            JSON.stringify(initialData, null, 2)
          );
          return initialData;
        }
      }
    }
  }
}
