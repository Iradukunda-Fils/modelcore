import Base from "../base.js";
// You should import this as "@bufferpunk/modelcore" in your projects. It's only imported like this here for testing purposes.
// This example is for JavaScript. See user.ts for the TypeScript version with type inference and hints.

class User extends Base {
    static version = 1;
    static schema = {
        id: { type: String, optional: true, immutable: true, default: () => crypto.randomUUID() },
        joinedOn: { type: Date, default: () => new Date(), optional: true },
        name: {
            type: String,
            max: 80,
            min: 5,
            optional: true,
            beforeChecks: (value) => typeof value === "string" ? value.trim() : value,
            afterChecks: (value) => value.replace(/\s+/g, " ")
        },
        channel: {
            type: Object,
            keys: {
                name: { type: String, max: 5, enum: ["phone", "email"], immutable: true },
                email: { type: String, max: 35, min: 5, optional: true },
                phone: { type: String, max: 15, min: 5, optional: true }
            },
            validate: (value) => {
                if (value.name === "email" && !/^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z]{2,})+$/.test(value.email))
                    throw new Error("Invalid email format");
                if (!value[value.name])
                    throw new Error(`Missing channel value for ${value.name}`);
            }
        },
        language: {
            type: String,
            max: 20,
            min: 5,
            optional: true,
            default: "english",
            enum: ["english", "spanish", "portuguese"],
            beforeChecks: (value) => typeof value === "string" ? value.toLowerCase().trim() : value,
            afterChecks: (value) => value.charAt(0).toUpperCase() + value.slice(1)
        },
        confirmed: { type: Boolean, optional: true, immutable: true },
        cars: {
            type: Array,
            optional: true,
            default: [],
            values: {
                type: Object,
                keys: {
                    make: { type: String, max: 20, min: 2 },
                    model: { type: String, max: 20, min: 2 },
                    year: { type: Number, optional: true, immutable: true },
                    plate_number: { type: String, max: 20, min: 3 },
                    color: {
                        type: String,
                        max: 10,
                        min: 3,
                        enum: ["blue", "red", "black", "white", "silver"],
                        beforeChecks: (value) => typeof value === "string" ? value.toLowerCase().trim() : value,
                        afterChecks: (value) => value.charAt(0).toUpperCase() + value.slice(1)
                    },
                    img_url: { type: String, max: 200, min: 5, optional: true }
                }
            }
        }
    }
};

const user = new User({
    name: "   John    Doe   ",
    channel: { name: "email", email: "john@example.com" },
    cars: [
        { make: "Toyota", model: "Camry", year: 2020, plate_number: "ABC123", color: "blue" },
        { make: "Honda", model: "Civic", plate_number: "XYZ789", color: "red" }
    ]
});

user.cars[0].model = "Corolla"; // Works! Model is mutable.

// Fails! Year is immutable.
try { user.cars[0].year = 2021; } catch (error) { console.error("Error updating user:", error.message); }

// Fails! Index 0 can not be manually overwritten. use unshift, push, splice etc to change the array instead.
try { user.cars[0] = "Not a car"; } catch (error) { console.error("Error updating user:", error.message); }

user.cars.push({ make: "Ford", model: "Mustang", year: 2019, plate_number: "MUS456", color: "black" });
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
