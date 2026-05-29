/*
╔══════════════════════════════════════════════════════════════╗
║                 models/userModel.js                          ║
║           "The blueprint of a patient"                       ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: cloudinary.js — we can store images.
  Now: before we store ANY user data, we need to tell MongoDB
  what shape that data should have.

  WHAT IS A MODEL / SCHEMA?
  ─────────────────────────
  A "schema" is a RULEBOOK. It says: "Every user document MUST
  have a name, email, and password. The image, phone, address,
  gender, and dob are optional — here's their default values."

  A "model" is the WORKER that uses the rulebook. When you write
  `userModel.findById(...)`, this model knows which MongoDB
  collection to query (the "user" collection) and what fields
  to expect.

  Think of it like a factory:
    Schema = the blueprint/specification
    Model  = the machine that stamps out documents matching the spec

  FIRST PRINCIPLE — What are MongoDB data types?
  ──────────────────────────────────────────────
  Each field in a schema has a TYPE. This tells Mongoose what
  kind of value to expect:
    String  → text ("John", "john@email.com")
    Number  → a number (25, 99.99)
    Boolean → true or false
    Object  → nested JSON ({line1: "123 St", line2: "Apt 4"})
    Date    → a specific point in time

  Mongoose VALIDATES these types. If you try to save a Number
  in a String field, Mongoose will try to convert it. If it
  can't, it throws an error.

  AUDIT NOTES:
  [!] PASSWORD STORAGE: The password field says `required: true`
      but there's no hashing at the schema level. Hashing happens
      in the controller (userController.js registerUser). This is
      fine, but a Mongoose "pre-save" hook would be safer —
      guarantees hashing even if someone creates a user via
      another path.
  [!] DEFAULT IMAGE: The default image is a MASSIVE base64 string
      (a PNG encoded as text). This means every user without a
      profile picture stores ~5KB of base64 text in the database.
      A simple URL to a default avatar would be more efficient.
  [!] NO EMAIL VALIDATION: The schema itself doesn't validate
      email format. The controller uses `validator.isEmail()`,
      but if someone uses a different route to create a user,
      invalid emails could slip through. Schema-level validation
      is more robust.
  [!] PHONE DEFAULT: Default phone is '000000000' — if a user
      doesn't provide a phone, the app shows all zeros. It should
      be null or empty string to indicate "not provided."
*/

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    /*
      `required: true` means Mongoose will REJECT any document
      that doesn't have this field. The save() will throw an error.

      `unique: true` on email means MongoDB creates a special index
      that guarantees no two users can have the same email. The
      database enforces this — it's impossible to violate.
    */
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    /*
      image stores a URL string. After uploading to Cloudinary,
      we save the returned URL here. The giant default value is
      a base64-encoded PNG (a default avatar image). Base64 is
      a way to represent binary data (like an image) using only
      text characters (A-Z, a-z, 0-9, +, /).

      Why base64? Because JSON can only hold text. You can't put
      raw image bytes in a JSON string. Base64 converts those
      bytes to safe text characters. The tradeoff: base64 is ~33%
      larger than the original binary.
    */
    image: { type: String, default: 'data:image/png;base64,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' },
    phone: { type: String, default: '000000000' },

    /*
      `address` is type: Object — it stores nested data:
      { line1: "123 Main St", line2: "Apt 4B" }
      MongoDB can store nested objects natively (unlike SQL
      which needs separate tables).
    */
    address: { type: Object, default: { line1: '', line2: '' } },
    gender: { type: String, default: 'Not Selected' },
    dob: { type: String, default: 'Not Selected' },
    /*
      dob is stored as String, not Date. This is unusual — Date
      objects would allow date-based queries like "all patients
      over 30." String makes formatting easier for display but
      harder for querying.
    */
    password: { type: String, required: true },
})

/*
  This line is a TRICK. Mongoose models are singletons — you
  should only create each model ONCE. But if the file is imported
  multiple times (e.g., in tests or hot-reload), creating it again
  would throw an error.

  So we check: does `mongoose.models.user` already exist?
  If yes → use the existing one
  If no  → create a new one with mongoose.model("user", userSchema)

  This is a common Mongoose pattern.
*/
const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: models/doctorModel.js                           │
  │                                                             │
  │  We just defined what a PATIENT looks like. Now let's       │
  │  define the DOCTOR — the person patients book with.         │
  └─────────────────────────────────────────────────────────────┘
*/
