import JSONDB from "./database";

const users = new JSONDB("users");

// backend programmer
async function addNewUser() {
  try {
    await users.create({
      name: "Starboy",
      username: "starsboys",
      id: 1,
      likes: [1, 2, 3, 4],
    });
    getAllUsers();
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
  const name = "James Spader 1";
  const username = undefined;
  try {
    const response = await users.findMany({ name: "Elijah" });
    console.log(response);
  } catch (err) {
    console.log(err);
  }
}
findAUser();
