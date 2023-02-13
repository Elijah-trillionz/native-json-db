import { JSONDB } from '../database';

const users = new JSONDB('users');

(async () => {
  await users.connect(
    {
      type: 'object',
      required: ['name', 'username', 'age'],
      properties: {
        name: { type: 'string' },
        username: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        likes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { anyOf: [{ type: 'number' }, { type: 'string' }] },
            },
          },
        },
        age: { type: 'integer' },
      },
    },
    { writeSync: false, indentSpace: 2 }
  );
})();

// backend programmer
async function addNewUser() {
  try {
    await users.create({
      name: 'John Doe',
      username: 'john_doe',
      date: new Date().toISOString(),
      id: 1,
      likes: [{ id: 21 }, { id: 'same' }],
      age: 21,
    });
    // getAllUsers();
    // findAUser();
    // updateAUser();
    // deleteAUser();
  } catch (err) {
    console.log(err);
  }
}
// addNewUser();

async function getAllUsers() {
  const response = await users.allData;
  console.log(response);
}

async function findAUser() {
  try {
    const response = await users.findMany({ name: 'Elijah' });
    console.log(response);
  } catch (err) {
    console.log(err);
  }
}
// findAUser();

async function updateUser() {
  try {
    const res = await users.findOneAndUpdate(
      { username: 'john_doe' },
      { $pop: { likes: -1 } }
    );
    // console.log(res);
  } catch (err) {
    console.log(err, 'error');
  }
}
updateUser();

async function updateMany() {
  try {
    const res = await users.updateMany(
      { username: 'john_doe' },
      {
        $push: { likes: { id: 'rep' } },
        $inc: { age: 1 },
      }
    );
    // console.log(res);
  } catch (e) {
    console.log(e);
  }
}
// updateMany();

async function findOneAndDelete() {
  try {
    const res = await users.findOneAndDelete({ username: 'starsboys21' });
    console.log(res);
  } catch (e) {
    console.log(e);
  }
}
// findOneAndDelete();

async function deleteMany() {
  try {
    const res = await users.deleteMany(
      { name: 'john_doe' },
      { deleteAll: true }
    );
    console.log(res);
  } catch (e) {
    console.log(e);
  }
}
// deleteMany();
