// this is the tipical example of a nosql database
const letter = 'abcdefghijklmnopqrstuvwxyz';
const string = `${letter}1234567890123456789123456789$&#@*£€¥%${letter.toUpperCase()}`;
const letterArray = string.split('');

function randomise() {
  const randomValue =
    letterArray[Math.floor(Math.random() * letterArray.length)];
  return randomValue;
}

function generateId() {
  const suggest = [];
  for (let i = 0; i < 16; i++) {
    suggest.push(randomise());
  }
  return suggest.join(''); // will generate a very strong id
}

class Document {
  // we don't want it to be too big, so we start at documents not collections.
  constructor() {
    this.documentData; // array of data
  }

  // get the whole data in d document
  get allData() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.documentData);
      }, 100);
    });
  }

  // creating data === add data to the document
  create(data) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (typeof data === 'object' && !Array.isArray(data)) {
          // make sure data is an object; new Object()
          if (!data.id) {
            const dbId = generateId();
            data.id = dbId;
          }

          this.documentData.push(data);
          return resolve(this.documentData);
        }

        return reject('Data must be an object');
      }, 500);
    });
  }

  // updating data === update data in the document
  update(docId, newData) {
    // the docId represents the id either given by the back-end programmer or a default generated id for that document like mongodb's generated _id

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // step 1, find the data in d database
          const oldData = await this.findById(docId);
          // step 2, update with new data

          // using firebase standards, updating a doc is with an object
          if (typeof newData === 'object' && !Array.isArray(newData)) {
            // get all the ppts in the old data
            return resolve(changeDataInObjects(newData, oldData));
          }

          return reject('New data must be an object');
        } catch (err) {
          return reject(err);
        }
      }, 1200);
    });
  }

  findById(id) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const doc = this.documentData.filter((datum) => {
          return datum.id === id;
        });
        if (!doc[0]) {
          return reject('This data does not exist');
        }

        return resolve(doc[0]);
      });
    }, 1000); // shouldn't take so much time
  }

  // delete
  delete(id) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const documentToDelete = await this.findById(id);
          const indexOfDocument = this.documentData.indexOf(documentToDelete);
          this.documentData.splice(indexOfDocument, 1);
          resolve(this.documentData);
        } catch (err) {
          reject(err);
        }
      }, 1000);
    });
  }
}

function changeDataInObjects(newData, oldData) {
  for (let i in oldData) {
    for (let j in newData) {
      if (i === j) {
        oldData[i] = newData[j];
      } else {
        oldData[j] = newData[j];
      }
    }
  }
  return oldData;
}

module.exports = Document;
