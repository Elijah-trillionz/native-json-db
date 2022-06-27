const Users = require('./Users');

const proUsers = new Users();

// backend programmer
async function addNewUser() {
  try {
    await proUsers.create({
      id: 1,
      name: 'Elijah',
      username: 'elijahtrillionz',
    });

    // getAllUsers();
    // findAUser();
    updateAUser();
    // deleteAUser();
  } catch (err) {
    console.log(err);
  }
}

async function getAllUsers() {
  const response = await proUsers.allData;
  console.log(response);
}

async function findAUser() {
  try {
    const response = await proUsers.findById(2);
    console.log(response);
  } catch (err) {
    console.log(err);
  }
}

async function updateAUser() {
  try {
    const response = await proUsers.update(1, {
      name: 'John Doe',
      username: 'johndoe',
    });
    // console.log(response);
    await getAllUsers();
  } catch (err) {
    console.log(err);
  }
}

async function deleteAUser() {
  try {
    const response = await proUsers.delete(1);
    console.log(response);
  } catch (err) {
    console.log(err);
  }
}

addNewUser();
