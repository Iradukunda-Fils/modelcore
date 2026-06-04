import Base, { SchemaDefinition, Union } from "../base.ts";

class Email extends String {
  /**
   * Using custom classes allows you to add your own validation logic and parsing in the constructor, 
   * while still getting type inference and hints when you use it in your schema. 
   * You can also use beforeChecks and afterChecks hooks for additional parsing and validation
   * if you don't want to create a custom class for some reason.
   * 
   * You can develop your own library of custom types like this and reuse them across your schemas.
   * That is the best practise that keeps your code clean, predictable and maintainable.
   */
  constructor(public email: string) {
    if (!/^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z]{2,})+$/.test(email))
      throw new Error("Invalid email");
    super(email.trim().toLowerCase());
  }
}

class User extends Base {
  static version = 1;
  static immutable = false;

  /**
   * A field is considered optional if it has `optional: true`, `required: false`, or a default value, otherwise it's required.
   */
  static schema = {
    joinedOn: { type: Date, default: () => new Date(), optional: true },
    name: {
      type: String,
      max: 80,
      min: 5,
      required: true,
      beforeChecks: (value: any) => typeof value === "string" ? value.trim() : value,
      afterChecks: (value: any) => value.replace(/\s+/g, " ")
    },
    nickname: String, // Shorthand syntax also works, it's equivalent to `nickname: { type: String }`. Best if you're coming from a Mongoose background and want to keep using that style for simple fields.
    channel: {
      type: Object,
      keys: {
        name: { type: String, max: 5, enum: ["phone", "email"] },
        email: { type: Email, max: 35, min: 5, optional: true },
        phone: { type: String, max: 15, min: 5, optional: true },
        subscribers: {
          type: Array,
          optional: true,
          default: [],
          values: {
            type: Object,
            keys: { // You can continue nesting as deep as you want.
              name: { type: String, max: 50, min: 2 },
              email: { type: Email, max: 50, min: 5, optional: true }
            }
          }
        }
      },
      validate: (value: Record<string, any>) => {
        if (!value[value.name]) throw new Error(`Missing channel value for ${value.name}`);
      }
    },
    language: {
      type: String,
      max: 20,
      min: 5,
      optional: true,
      default: "english",
      enum: ["english", "spanish", "portuguese"],
      beforeChecks: (value: any) => typeof value === "string" ? value.toLowerCase().trim() : value,
      afterChecks: (value: any) => value.charAt(0).toUpperCase() + value.slice(1)
    },
    confirmed: { type: Boolean, optional: true, immutable: true },
    cars: {
      type: Array,
      optional: true,
      default: [],
      values: {
        type: Object,
        keys: {
          make: String,
          model: String,
          year: { type: Number, optional: true },
          plate_number: { type: String, max: 20, min: 3 },
          color: {
            type: String,
            max: 10,
            min: 3,
            enum: ["blue", "red", "black", "white", "silver"],
            beforeChecks: (value: any) => typeof value === "string" ? value.toLowerCase().trim() : value,
            afterChecks: (value: any) => value.charAt(0).toUpperCase() + value.slice(1)
          },
          img_url: { type: String, max: 200, min: 5, optional: true }
        }
      }
    },
    f: Union(String, Number)
  } as const satisfies SchemaDefinition;
}

// use this `createFrom` factory method to get proper type inference and parsing on input
// If you don't care about type inference and type hints, you can also use the constructor directly: `new User(obj)`
const user = User.createFrom({ 
  name: "   John    Doe   ",
  nickname: "Johnny",
  channel: {
    name: "email",
    email: new Email("john@example.com"),
    subscribers: [
      { name: "Alice", email: new Email("alice@example.com") },
      { name: "Bob", email: new Email("bob@example.com") }
    ]
  },
  cars: [
    { make: "Toyota", model: "Camry", year: 2020, plate_number: "ABC123", color: "blue" },
    { make: "Honda", model: "Civic", plate_number: "XYZ789", color: "red" }
  ],
  f: "This can be a string or a number"
});

user.cars![0].model = "Corolla"; // Works! Model is mutable.

// Fails! Year is immutable.
try { user.cars![0].year = 2021; } catch (error) { console.error(`Error updating user: ${(error as Error).message}`); }

// Fails! Index 0 can not be manually overwritten. use unshift, push, splice etc to change the array instead.
// Typescript will not even compile this file, as the assignment below is incompatible with type hints from modelcore.
// try { user.cars![0] = "Not a car"; } catch (error) { console.error(`Error updating user: ${(error as Error).message}`); }

user.cars!.push({ make: "Ford", model: "Mustang", year: 2019, plate_number: "MUS456", color: "black" });
console.log("\nUpdated cars:");
console.log(user.cars);

/*
This example shows:
- beforeChecks / afterChecks hooks
- enum validation
- keys / values for nested objects and arrays
- immutable field configuration
- automatic version assignment
*/
