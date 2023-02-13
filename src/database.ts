import { writeFile } from 'fs/promises';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { instanceOfNodeError } from './error';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// to indicate that the object should not be empty
interface AnyObject {
  [key: string]: any[];
}

interface NumberObject {
  [key: string]: number;
}

interface Object {
  [key: string]: any;
  $inc?: NumberObject;
  $dec?: NumberObject;
  $pop?: {
    [key: string]: 0 | -1;
  };
  $push?: {
    [key: string]: any;
  };
}

interface ErrorObj {
  message: string;
  errorCode: number;
  error: string;
  params?: Object; // for ajv error
}

interface UpdateManyOptions {
  updateAll: boolean;
}

interface DeleteManyOptions {
  deleteAll: boolean;
}

interface ConnectOptions {
  writeSync?: boolean;
  indentSpace?: number;
}

export class JSONDB {
  private readonly data: AnyObject;
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
    this.updateKeywords = ['push', 'inc', 'dec', 'pop'];
    this.dbOptions = { writeSync: true, indentSpace: 2 };
  }

  get allData(): Promise<Object[]> {
    return new Promise(async (resolve) => {
      resolve(this.dataArr);
    });
  }

  // connecting ensures the schema is valid and ready to be used
  connect(schema: Object, options: ConnectOptions) {
    return new Promise((resolve, reject) => {
      const ajv = new Ajv();
      addFormats(ajv);
      if (this.connected) {
        return reject({
          message:
            'Can only connect and create a schema once for every instance/collection',
          error: 'CONNECTION_ERROR',
          errorCode: 613,
        });
      }

      this.connected = true;
      this.validate = ajv.compile(schema);

      this.setDBOptions(options);

      resolve('connected');
    });
  }

  create(data: Object) {
    return new Promise((resolve, reject) => {
      this.validateDataWithSchema(data, async (err: ErrorObj) => {
        if (err) return reject(err);

        this.dataArr.push(data);
        await this.updateJSONFile();
        resolve('done');
      });
    });
  }

  findOne(filter: Object): Promise<Object | null> {
    return new Promise((resolve, reject) => {
      this.filterData(filter, (err: ErrorObj, foundData: Object[]) => {
        if (err && err.error === 'NOT_FOUND') {
          return resolve(null);
        } else if (err && err.error === 'BAD_REQUEST') {
          return reject(err);
        }

        resolve(foundData[0]);
      });
    });
  }

  findMany(filter: Object): Promise<Object[]> {
    return new Promise((resolve, reject) => {
      this.filterData(filter, (err: ErrorObj, foundData: Object[]) => {
        if (err && err.error === 'NOT_FOUND') {
          return resolve([]);
        } else if (err && err.error === 'BAD_REQUEST') {
          return reject(err);
        }

        resolve(foundData);
      });
    });
  }

  findOneAndUpdate(filter: Object, newData: Object) {
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
              message: 'No data was found to be updated',
              errorCode: 612,
              error: 'NOT_FOUND',
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

  findOneAndDelete(filter: Object) {
    return new Promise(async (resolve, reject) => {
      try {
        const dataToBeDeleted = await this.findOne(filter);

        if (!dataToBeDeleted) {
          // so devs can handle this in a try block
          return resolve({});
        }

        this.dataArr.splice(this.dataArr.indexOf(dataToBeDeleted), 1);

        await this.updateJSONFile();

        resolve(dataToBeDeleted);
      } catch (e) {
        // for errors thrown when the findOne method encounters an error
        reject(e);
      }
    });
  }

  deleteMany(filter: Object, options?: DeleteManyOptions) {
    return new Promise(async (resolve, reject) => {
      try {
        let dataArr: Object[];
        if (options && options.deleteAll) {
          dataArr = [...(await this.allData)];
          this.dataArr.length = 0;

          await this.updateJSONFile();
          resolve(dataArr);
          return;
        }

        dataArr = await this.findMany(filter);

        if (dataArr.length <= 0) {
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

  private setDBOptions = (optionsProvided: ConnectOptions) => {
    if (!optionsProvided?.writeSync) {
      this.dbOptions.writeSync = false;
    }

    // verify it's a number for js users
    if (
      optionsProvided?.indentSpace &&
      typeof optionsProvided.indentSpace === 'number'
    ) {
      this.dbOptions.indentSpace = optionsProvided.indentSpace;
    }
  };

  private filterData = (filter: Object, cb: Function) => {
    const keys = Object.keys(filter);
    const values = Object.values(filter);

    if (keys.length < 1 || values.length < 1) {
      return cb(
        {
          message: 'Filter object does not contain any key/values',
          error: 'BAD_REQUEST',
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
        message: 'Object does not exist in your data',
        error: 'NOT_FOUND',
        errorCode: 612,
      },
      null
    );
  };

  private async updateJSONFile() {
    if (this.dbOptions.writeSync) {
      writeFileSync(
        `data/${this.dataName}.json`,
        JSON.stringify(this.data, null, this.dbOptions.indentSpace),
        {
          flag: 'w',
        }
      );
    } else {
      await writeFile(
        `data/${this.dataName}.json`,
        JSON.stringify(this.data, null, this.dbOptions.indentSpace),
        {
          flag: 'w',
        }
      );
    }
  }

  private async update(oldData: Object, newData: any, cb: Function) {
    // useful for javascript users
    if (typeof newData !== 'object' || Array.isArray(newData)) {
      return cb({
        message: 'New data must be an object',
        error: 'INVALID_DATA_TYPE',
        errorCode: 611,
      });
    }

    const specialUpdateKeys = this.filterUpdateKeywords(newData);

    let newObj = { ...newData };
    if (specialUpdateKeys.length >= 1) {
      specialUpdateKeys.forEach((specialUpdateKey) => {
        const objectToUpdate = newData[specialUpdateKey];
        // so js users won't pass any other data type
        if (typeof objectToUpdate === 'object') {
          const keysToUpdate = Object.keys(objectToUpdate);
          switch (specialUpdateKey) {
            case '$inc':
              newObj = this.updateNumberValues(
                keysToUpdate,
                '$inc',
                oldData,
                newObj,
                objectToUpdate
              );
              break;
            case '$dec':
              newObj = this.updateNumberValues(
                keysToUpdate,
                '$dec',
                oldData,
                newObj,
                objectToUpdate
              );
              break;
            case '$push':
              newObj = this.updateArrayValues(
                keysToUpdate,
                '$push',
                oldData,
                newObj,
                objectToUpdate
              );
              break;
            case '$pop':
              newObj = this.updateArrayValues(
                keysToUpdate,
                '$pop',
                oldData,
                newObj,
                objectToUpdate
              );
              break;
          }
        }
      });
    }

    const updatedData = { ...oldData, ...newObj };
    return this.validateDataWithSchema(updatedData, async (err: ErrorObj) => {
      if (err) return cb(err);

      this.dataArr[this.dataArr.indexOf(oldData)] = updatedData;

      await this.updateJSONFile();
      return cb(null, updatedData);
    });
  }

  private filterUpdateKeywords = (newData: Object) => {
    const keys = Object.keys(newData);

    return keys.filter((key) => {
      return this.updateKeywords.includes(`${key.substring(1)}`);
    });
  };

  private validateDataWithSchema = (data: Object, cb: Function) => {
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

  private updateNumberValues = (
    keysToUpdate: string[],
    specialUpdateKey: '$inc' | '$dec',
    oldData: Object,
    newObj: Object,
    objectToUpdate: Object
  ) => {
    keysToUpdate.forEach((keyToUpdate) => {
      const prevValue = oldData[keyToUpdate];
      // there is a possibility that the prevValue doesn't exist, or it isn't a number, again for js users;
      if (typeof prevValue === 'number') {
        const valToUpdateBy = objectToUpdate[keyToUpdate];
        const updatedVal =
          specialUpdateKey === '$inc'
            ? prevValue + valToUpdateBy
            : prevValue - valToUpdateBy;
        newObj = { ...newObj, [keyToUpdate]: updatedVal };
      }
    });
    // to prevent special keywords from flooding the data in the json file
    delete newObj[specialUpdateKey];
    return newObj;
  };

  private updateArrayValues = (
    keysToUpdate: string[],
    specialUpdateKey: '$push' | '$pop',
    oldData: Object,
    newObj: Object,
    objectToUpdate: Object
  ) => {
    keysToUpdate.forEach((keyToUpdate) => {
      const prevValue = oldData[keyToUpdate];
      // for js users once again
      if (Array.isArray(prevValue)) {
        let updatedArrValue: Object[];
        if (specialUpdateKey === '$pop') {
          const itemToRemoveIndex = objectToUpdate[keyToUpdate];
          const prevValueClone = [...prevValue];

          prevValueClone.splice(itemToRemoveIndex, 1);
          updatedArrValue = [...prevValueClone];
        } else {
          const itemToAdd = objectToUpdate[keyToUpdate];
          updatedArrValue = [...prevValue, itemToAdd];
        }
        newObj = { ...newObj, [keyToUpdate]: updatedArrValue };
      }
    });
    // to prevent special keywords from flooding the data in the json file
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
      if (e.code === 'ENOENT') {
        const initialData = { [dataName]: [] };
        try {
          mkdirSync('data');
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
