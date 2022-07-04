const Document = require('./database');

class Users extends Document {
  constructor() {
    super('users');
  }
}

module.exports = Users;
