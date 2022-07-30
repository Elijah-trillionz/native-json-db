import JSONDB from "./database";
import anyOf from "ajv/lib/vocabularies/applicator/anyOf";

const users = new JSONDB("users");

(async () => {
  await users.connect({
    type: "object",
    required: ["name", "username", "likes", "age"],
    properties: {
      name: { type: "string" },
      username: { type: "string" },
      likes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { anyOf: [{ type: "number" }, { type: "string" }] },
          },
        },
      },
      age: { type: "integer" },
    },
  });
})();

// backend programmer
async function addNewUser() {
  try {
    await users.create({
      name: "Starboy",
      username: "starsboys",
      id: 1,
      likes: [{ id: 21 }, { id: "same" }],
    });
    // getAllUsers();
    // findAUser();
    // updateAUser();
    // deleteAUser();
  } catch (err) {
    console.log(err);
  }
}
addNewUser();

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
// findAUser();
