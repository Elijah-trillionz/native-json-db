import JSONDB from './database';

const users = new JSONDB('users');

// backend programmer
async function addNewUser() {
  try {
    // await proUsers.create({
    //   id: 1,
    //   name: 'Elijah',
    //   username: 'elijahtrillionz',
    // });
    // getAllUsers();
    // findAUser();
    // updateAUser();
    // deleteAUser();
  } catch (err) {
    console.log(err);
  }
}

async function getAllUsers() {
  const response = await users.allData;
  console.log(response);
}

async function findAUser() {
  const name = 'James Spader 1';
  const username = undefined;
  try {
    const response = await users.updateMany(
      {
        username: 'elijahtrillionz',
      },
      ['{ age: 21 }']
    );
    console.log(response);
  } catch (err) {
    console.log(err);
  }
}
findAUser();

async function updateAUser() {
  try {
    const response = await users.findOneAndUpdate(
      { name: 'same' },
      {
        username: 'johnny',
        name: 'Starboy',
      }
    );
    // console.log(response);
    await getAllUsers();
  } catch (err) {
    console.log(err);
  }
}

async function deleteAUser() {
  try {
    const response = await users.delete({ id: 1 });
    console.log(response);
  } catch (err) {
    console.log(err);
  }
}

// addNewUser();
