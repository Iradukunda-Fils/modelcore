import Base from "../base.js";
class BaseModel extends Base {
    save() {
        // save to db
    }
}
class User extends BaseModel {
}
User.collection = "users";
User.schema = {
    name: { type: String }
};
const user = new User({ name: "John Doe" });
user.save();
console.log(user);
