const Users = require('./Users');

const proUsers = new Users();

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
    const response = await proUsers.findAll({
      key: 'username',
      value: 'elijahtrillionz',
    });
    console.log(response);
  } catch (err) {
    console.log(err);
  }
}
findAUser();

async function updateAUser() {
  try {
    const response = await proUsers.update(2, {
      username: 'johnny',
      name: 'Starboy',
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

// addNewUser();
