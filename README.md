Native-JSON-DB or JSONDb is a NoSQL database system on your local server. With it, you can store data as JSON objects in a file in your server. native-json-db comes with TypeScript support, in fact using TypeScript is encouraged.

## Installation
```shell
npm install native-json-db
```

> __Note__: native-json-db supports importing with both ES modules and commonjs.

## Introduction

native-json-db offers a `JSONDB` class with methods for structuring, adding, removing, and updating data in the json file. Each instance of this class you create can be considered as a collection. For example, let's create a collection of users, and add a few data:

```js
import { JSONDB } from "native-json-db";

const users = new JSONDB('users'); // creates a "users" collection

const schema = {
  type: 'object',
  properties: {
    username: { type: 'string' },
    age: { type: 'number' }
  }
} 

(async () => {
  await users.connect(schema, { writeSync: true, indentSpace: 2 });
})();

function addNewUser() {
  users.create({ username: 'john_doe', age: 24 }) // creates a user's document
}
addNewUser();
```

The example above represents a collection of users which in turn automatically creates a json file called __users__.

## Schema
native-json-db uses [JSON Schema](https://json-schema.org/) for validating your JSON data.

Each collection you create can have a different schema, but a schema made for a collection must be followed otherwise an error occurs (`614`).

Pass in your schema object as the first argument of the `connect` method.

```js
import { JSONDB } from "native-json-db";

const users = new JSONDB('users');

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' }
  }
}

users.connect(schema);
```

## Methods
All methods are promises
<details>
<summary>
An example that utilises all methods
</summary>

```js
import { JSONDB } from "native-json-db";

const users = new JSONDB("users");
const schema = {
  type: 'object',
  required: ['name', 'age', 'id'],
  properties: {
    username: { type: 'string' },
    age: { type: 'number' },
    id: { anyOf: [{ type: "number" }, { type: "string" }] } // id can be of type number or string
  }
}

(async () => {
  await users.connect(schema, { writeSync: false, indentSpace: 3 });
})();

// backend programmer
async function addNewUser() {
  try {
    await users.create({
      username: "john_doe",
      id: 1,
      age: 21,
    });
  } catch (err) {
    console.log(err);
  }
}

async function getAllUsers() {
  const res = await users.allData;
  console.log(res); // [{ username: "john_doe", age: 21, id: 1 }]
}

async function findUser() {
  try {
    const res = await users.findOne({ username: "john_doe" });
    console.log(res); // { username: "john_doe", age: 21, id: 1 } 
  } catch (err) {
    console.log(err);
  }
}

async function findUsers() {
  try {
    const res = await users.findMany({ username: "john_doe" });
    console.log(res); // [{ username: "john_doe", age: 21, id: 1 }] 
  } catch (err) {
    console.log(err);
  }
}

async function updateUser() {
  try {
    const res = await users.findOneAndUpdate(
      { username: "john_doe" },
      { age: "25" }
    );
    console.log(res);
  } catch (err) {
    console.log(err, "error"); // throws a schema 614 error, "age" is of type number
  }
}

async function updateMany() {
  try {
    const res = await users.updateMany(
      { username: "john_doe" },
      {
        $inc: { age: 1 }, // increments "age" by 1
      }
    );
    console.log(res); // [{ username: "john_doe", age: 22, id: 1 }]
  } catch (e) {
    console.log(e);
  }
}

async function findOneAndDelete() {
  try {
    const res = await users.findOneAndDelete({ username: "unknown_user" });
    console.log(res);
  } catch (e) {
    console.log(e); // throws a 612 not found error
  }
}

async function deleteMany() {
  try {
    const res = await users.deleteMany(
      { name: "john_doe" }
    );
    console.log(res); // [{ username: "john_doe", age: 22, id: 1 }]
  } catch (e) {
    console.log(e);
  }
}
```
</details>

### Connect
The `connect` method connects your collection to the database. Connecting is done only once for each collection and without connecting you can't use the other methods.

```js
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' }
  }
}

async function connectToDb() {
  await users.connect(schema, { writeSync: true, indentSpace: 3 });
}
```

A 613 connection error is thrown if you try to connect more than once for each collection you create.

#### Parameter(s)
| parameter placeholder name | type     | description                                     |
|----------------------------|----------|-------------------------------------------------|
| schema                     | `string` | the schema object of the collection             |
| options                    | `object` | an object of options, see below for description |

##### Options Object
| key           | type      | description                                                                                | default |
|---------------|-----------|--------------------------------------------------------------------------------------------|---------|
| `writeSync`   | `boolean` | indicates if writing to the json file (collection) is done synchronously or asynchronously | `false` |
| `indentSpace` | `number`  | the indentation space for the JSON object                                                  | `2`     |

#### Response
The `connect` method returns a `string` ("connected") as response.

### Create
The `create` method creates a new document and attach the data to the collection.

```js
async function addNewuser() {
  const newUser = { username: 'john_doe', age: 21 }
  const res = await users.create(newUser);
  console.log(res); // done
}
```

#### Parameter(s)
| parameter placeholder name  | type     | description           |
|-----------------------------|----------|-----------------------|
| data                        | `object` | data for the document |

#### Response
The `create` method returns a `string` ("done") as response.

### findOne
The `findOne` method finds a document with a piece of data given as filter and returns the first occurrence found.

```js
async function findUser() {
  const res = await users.findOne({ username: 'john_doe' })
  console.log(res)
}
```

#### Parameter(s)
| parameter placeholder name | type     | description                                  |
|----------------------------|----------|----------------------------------------------|
| filter                     | `object` | filter through the documents in a collection |

#### Response
- When a result is found, the `findOne` method returns an object. This object being the first occurrence of the filter `object` found.

- When no result is found, the `findOne` method resolves to `null`.

### findMany
The `findMany` method finds a document with a piece of data given as filter and returns all occurrences found.

```js
async function findUser() {
  const res = await users.findOne({ username: 'john_doe' })
  console.log(res)
}
```

#### Parameter(s)
| parameter placeholder name | type     | description                                    |
|----------------------------|----------|------------------------------------------------|
| filter                     | `object` | filter through the documents in a collection   |


#### Response
- When a result is found, the `findMany` method returns an array of objects. This array being all occurrences of the filter `object` found.

- When no result is found, the `findMany` method resolves with an empty array `[]`.

### findOneAndUpdate
The `findOneAndUpdate` method finds a document with a piece of data given as filter and updates the document with a given data.

```js
async function updateUser() {
  // data/users.json = { "users": [{ "username": "john_doe", "age": 21 }] }
  const res = await users.findOneAndUpdate({ username: 'john_doe' }, { username: 'john_doe4real' });
  console.log(res) // { username: 'john_doe4real', age: 21 }
}
```

#### Parameters
| parameter placeholder name | type     | description                                  |
|----------------------------|----------|----------------------------------------------|
| filter                     | `object` | filter through the documents in a collection |
| newData                    | `object` | the new data to update document with         |

While the `findOneAndUpdate` method can be used for updating existing data in a document, it can also be used to add data to a document as long as the data is valid with your schema.

```js
async function updateUser() {
  // data/users.json = { "users": [{ "username": "john_doe4real", "age": 21 }] }
  const res = await users.findOneAndUpdate({ username: 'john_doe4real' }, { followers: 30 });
  console.log(res) // { username: 'john_doe4real', age: 21, followers: 30 }
}
```

There are special properties that can be used with the `newData` object to ease up updates like adding or removing from an array, incrementing and decrementing a number.

#### Special properties
| key     | type     | description                                         | example                                                                  |
|---------|----------|-----------------------------------------------------|--------------------------------------------------------------------------|
| `$inc`  | `object` | increments a number based on a given object         | `{ $inc: { age: 1 } }` - adds 1 to the age value                         |
| `$dec`  | `object` | decrements a number based on a given object         | `{ $inc: { age: 1 } }` - removes 1 from the age value                    |
| `$push` | `object` | pushes a value to the end of an array               | `{ $push: { cars: 'bmw' } }` - pushes "bmw" to the list of `cars`        |
| `$pop`  | `object` | removes the first (0) or last (-1) item of an array | `{ $pop: { cars: -1 } }` - removes the last item from the list of `cars` |

```js
async function updateUser() {
  // data/users.json = { "users": [{ "username": "john_doe4real", "age": 21, "followers": 30 }] }
  const res = await users.findOneAndUpdate({ username: 'john_doe4real' }, { $inc: { followers: 5, age: 1 } });
  console.log(res) // { username: 'john_doe4real', age: 22, followers: 35 }
}
```

#### Response
- When a result is found, the `findOneAndUpdate` method returns the updated object.

- When no result is found, a `612 - Not Found` error is thrown.

### updateMany
The `updateMany` method finds a group of documents with a piece of data given as filter and updates the documents with a given data.

```js
async function updateUsers() {
  // data/users.json = { "users": [{ "username": "john_doe", "age": 21, "student": true }, {"username": "jane_doe", "age": 24, "student": true }] }
  const res = await users.updateMany({ student: true }, { promoted: true });
  console.log(res) // [{ username: 'john_doe', age: 21, student: true, promoted: true }, {username: 'jane_doe', age: 24, student: true, promoted: true }]
}
```

#### Parameters
| parameter placeholder name | type     | description                                                  |
|----------------------------|----------|--------------------------------------------------------------|
| filter                     | `object` | filter through the documents in a collection                 |
| newData                    | `object` | the new data to update document with                         |
| options                    | `object` | an object of options for specifying how the update should be |

#### Options Object
| key         | type      | description                                | default |
|-------------|-----------|--------------------------------------------|---------|
| `updateAll` | `boolean` | for updating all documents in a collection | `false` |

The `updateAll` property when set to `true` updates all documents in a collection with the new data:

```js
async function updateAllUsers() {
  // data/users.json = { "users": [{ "username": "john_doe", "age": 21, "student": true, "promoted": true }, {"username": "jane_doe", "age": 24, "student": true, "promoted": true }] }
  const res = await users.updateMany({}, { promoted: false }, { updateAll: true });
  console.log(res) // [{ username: 'john_doe', age: 21, student: true, promoted: false }, {username: 'jane_doe', age: 24, student: false }]
}
```

The special properties available on the [`findOneAndUpdate` method](https://linkspecialchars.com) is also available on the `updateMany` method.

#### Response
- When a result is found, the `updateMany` method returns an array of all the updated object.

- When no result is found, a `612 - Not Found` error is thrown.

### findOneAndDelete
The `findOneAndDelete` method finds a document with a piece of data given as filter and deletes the document found.

```js
async function deleteUser() {
  // data/users.json = { "users": [{ "username": "john_doe", "age": 21 }] }
  const res = await users.findOneAndDelete({ username: 'john_doe' });
  console.log(res) // { username: 'john_doe4real', age: 21 }
  
  // data/users.json = { "users": [] }
}
```

#### Parameters
| parameter placeholder name | type     | description                                  |
|----------------------------|----------|----------------------------------------------|
| filter                     | `object` | filter through the documents in a collection |

#### Response
- When a result is found, the `findOneAndDelete` method returns the deleted object even though it does no longer exist in the collection

- When no result is found, the promise is resolved with an empty object `{}`.
- 
### deleteMany
The `deleteMany` method finds a group of documents with a piece of data given as filter and deletes the documents.

```js
async function deleteUsers() {
  // data/users.json = { "users": [{ "username": "john_doe", "age": 21 }, {"username": "jane_doe", "age": 24 }] }
  const res = await users.deleteMany({ student: true });
  console.log(res) // [{ username: 'john_doe', age: 21 }, {username: 'jane_doe', age: 24 }]
  
  // data/users.json = { "users": [] }
}
```

#### Parameters
| parameter placeholder name | type     | description                                                  |
|----------------------------|----------|--------------------------------------------------------------|
| filter                     | `object` | filter through the documents in a collection                 |
| options                    | `object` | an object of options for specifying how the update should be |

#### Options Object
| key         | type      | description                                | default |
|-------------|-----------|--------------------------------------------|---------|
| `deleteAll` | `boolean` | for deleting all documents in a collection | `false` |

The `deleteAll` property when set to `true` deletes all documents in a collection:

```js
async function deleteAllUsers() {
  // data/users.json = { "users": [{ "username": "john_doe", "age": 21, "student": true, "promoted": true }, {"username": "jane_doe", "age": 24, "student": true, "promoted": true }] }
  const res = await users.deleteMany({}, { deleteAll: true });
  console.log(res) // [{ username: 'john_doe', age: 21, student: true, promoted: false }, {username: 'jane_doe', age: 24, student: false }]
  
  // data/users.json = { "users": [] }
}
```

#### Response
- When a result is found, the `deleteMany` method returns an array of the deleted objects.

- When no result is found, the promise resolves with an empty array `[]`.

## Error Codes
| code no | title                             | description                                                                                                                                                                                  |
|---------|-----------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `611`   | INVALID_DATA_TYPE                 | error when submitting a new data that isn't an object in JavaScript                                                                                                                          |
| `612`   | NOT_FOUND                         | error when the filter data in any method does not find any occurrence                                                                                                                        |
| `613`   | CONNECTION_ERROR                  | because the schema cannot be compiled more than once, the server must be connected only once in every collection, so this error is thrown if multiple connection is attempted per collection |
| `614`   | INVALID_SCHEMA_RES:[SCHEMA_ERROR] | all schema data type errors                                                                                                                                                                  |
| `615`   | BAD_REQUEST                       | error when the filter object does not contain key or/and value, exception of the `updateMany` and `deleteMany` methods when used to update and/or delete all documents respectively          |

## Contributing

Docs on contributing coming soon.
