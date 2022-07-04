const fs = require('fs/promises');
const fsSync = require('fs');
const Buffer = require('buffer');

class Document {
  // we don't want it to be too big, so we start at documents not collections.
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

  // updating data === update data in the document
  update(id, newData) {
    return new Promise(async (resolve, reject) => {
      this.data[this.dataName].forEach(async (item, index) => {
        if (item.id === id) {
          let oldData = this.data[this.dataName][index];
          this.data[this.dataName][index] = { ...oldData, ...newData };
          await this.updateJSONFile();
          resolve('done');
        }
      });
    });
  }

  // update by keys

  findById(id) {
    return new Promise((resolve, reject) => {
      if (id) {
        resolve(this.data[this.dataName].find((item) => item.id === id));
      } else {
        reject('no id');
      }
    });
  }

  // find object with the key value
  find({ key, value }) {
    return new Promise((resolve, reject) => {
      if (key) {
        resolve(this.data[this.dataName].find((item) => item[key] === value));
      } else {
        reject('no key');
      }
    });
  }

  // find all objects with a key value
  findAll({ key, value }) {
    return new Promise((resolve, reject) => {
      if (key) {
        resolve(this.data[this.dataName].filter((item) => item[key] === value));
      } else {
        reject('no key');
      }
    });
  }

  // delete
  delete(id) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {}, 500);
    });
  }

  // private
  async updateJSONFile() {
    await fs.writeFile(
      `data/${this.dataName}.json`,
      JSON.stringify(this.data),
      {
        flag: 'w',
      }
    );
  }
}

// TODO: how to make a class method private

function getExistingData(dataName) {
  try {
    const data = fsSync.readFileSync(`data/${dataName}.json`);
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') {
      const initialData = { [dataName]: [] };
      fsSync.writeFileSync(
        `data/${dataName}.json`,
        JSON.stringify(initialData)
      );
      return initialData;
    }
  }
}

module.exports = Document;
