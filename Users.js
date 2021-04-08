const Document = require('./database');

class Users extends Document {
  constructor() {
    super();

    this.documentData = [];
  }
}

module.exports = Users;
