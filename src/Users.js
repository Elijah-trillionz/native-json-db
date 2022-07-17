import JSONDB from './database';
class Users extends JSONDB {
    constructor() {
        super('users');
    }
}
export default Users;
