/*
╔══════════════════════════════════════════════════════════════╗
║                 config/mongodb.js                            ║
║           "How we talk to the database"                      ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: server.js called connectDB() at startup.

  WHAT IS MONGODB?
  ────────────────
  Imagine a spreadsheet, but instead of rows and columns, each
  row is a JSON object (called a "document"), and you can have
  different shapes of objects in the same collection (table).

  Traditional SQL:  First define the table structure, then insert
  MongoDB:          Just insert JSON. Flexible, schema-optional.

  WHY MONGOOSE?
  ─────────────
  MongoDB's native driver lets you send raw commands. Mongoose
  adds a layer on top that:
    (a) Enforces a "schema" (shape rules for your data)
    (b) Provides helper methods (.find(), .findById(), .save())
    (c) Handles connection management

  Think of Mongoose as a translator: you speak JavaScript objects,
  it translates to MongoDB's query language.

  FIRST PRINCIPLE — What is a "connection"?
  ─────────────────────────────────────────
  A database connection is like a phone call. You dial the number
  (the connection string / URI), the database picks up, and now
  you have an open line. Every query you make goes through this
  line. The connection stays open so you don't have to re-dial
  for every query.

  The URI format: mongodb+srv://username:password@host/database
  The `+srv` means "use DNS to find the actual server addresses"
  (MongoDB Atlas uses this).

  AUDIT NOTE:
  [!] The MONGODB_URI shouldn't be hardcoded. It's read from
      process.env (environment variables), which is correct.
      Environment variables keep secrets out of source code.
  [!] process.exit(1) kills the entire Node process. This is
      appropriate for a DB connection failure — no DB, no app.
      But it would be better to log the exact error so ops
      engineers can debug.
*/

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    /*
       mongoose.connect() does several things:
       1. Opens a TCP socket to the MongoDB server
       2. Authenticates using the credentials in the URI
       3. Establishes a connection pool (multiple parallel connections for speed)
       4. Returns a promise that resolves when connected

       The `${process.env.MONGODB_URI}/appointy` syntax appends
       "/appointy" to the URI. In MongoDB, the part after the
       last "/" is the DATABASE NAME. So this connects to a
       database called "appointy" on the MongoDB cluster.
    */
    await mongoose.connect(`${process.env.MONGODB_URI}/appointy`);
    console.log("Database Connected");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
    /*
       process.exit(1) immediately stops the program.
       Exit code 0 = "everything was fine"
       Exit code 1 = "something went wrong"
       This is a convention that deployment tools (like Docker, PM2)
       use to know whether the app started successfully.
    */
  }
};

export default connectDB;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: config/cloudinary.js                            │
  │                                                             │
  │  We just set up the database. But where do IMAGES live?     │
  │  They live in Cloudinary, a cloud image service.            │
  └─────────────────────────────────────────────────────────────┘
*/
