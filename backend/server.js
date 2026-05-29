/*
╔══════════════════════════════════════════════════════════════╗
║                    server.js — THE HEART                     ║
║                 "Everything starts here"                     ║
╚══════════════════════════════════════════════════════════════╝

  WHAT IS THIS FILE?
  ──────────────────
  This is the ENTRY POINT of the entire backend. Think of it like
  the "ON" switch of a machine. When you type `node server.js`,
  this file runs FIRST. Its job is to:
    1. Wake up the server (Express)
    2. Plug in all the wires (database, cloud storage, routes)
    3. Open the door for incoming requests (listen on a port)

  FIRST PRINCIPLE — What even is a "server"?
  ──────────────────────────────────────────
  A server is just a computer program that sits and waits.
  It's like a restaurant kitchen:
    - It listens for orders (requests from browsers/apps)
    - It prepares responses (cooks up data)
    - It sends them back (serves the meal)

  Express.js is the "kitchen manager" — it handles the boring
  plumbing of receiving HTTP requests and sending responses,
  so you can focus on what to actually DO with each request.

  THE BIG PICTURE — How files connect:
  ─────────────────────────────────────
  server.js
    ├── config/mongodb.js      (database connection)
    ├── config/cloudinary.js   (image hosting service)
    ├── routes/userRoute.js    (patient URLs → controllers/userController.js)
    ├── routes/adminRoute.js   (admin URLs → controllers/adminController.js)
    └── routes/doctorRoute.js  (doctor URLs → controllers/doctorController.js)

  VISUAL DATA FLOW:
  ─────────────────
  Browser makes a request
       │
       ▼
  server.js (this file) receives it
       │
       ▼
  Middleware chain runs (CORS check, JSON parsing)
       │
       ▼
  Router matches the URL pattern (/api/user/...)
       │
       ▼
  Middleware checks auth (authUser/authAdmin/authDoctor)
       │
       ▼
  Controller function runs (the actual logic)
       │
       ▼
  Response sent back to browser

  AUDIT NOTES — things the original author could improve:
  ───────────────────────────────────────────────────────
  [!] SECURITY: `cors()` with no options allows ANY website to
      call this API. Should restrict to specific origins.
  [!] SECURITY: Missing `helmet` middleware (sets security headers
      like XSS protection, content-type sniffing prevention).
  [!] RELIABILITY: No request body size limit. A malicious user
      could send a huge file and crash the server.
  [!] ERROR HANDLING: No global error handler middleware at the
      app level. If something crashes, the user gets no response.
*/

import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import mongoose from 'mongoose'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import adminRouter from './routes/adminRoute.js'
import doctorRouter from './routes/doctorRoute.js'
import userRouter from './routes/userRoute.js'

// app config
const app = express()
const port = process.env.PORT || 4000

/*
  connectDB() reaches out to MongoDB (a database that stores data
  as JSON-like documents instead of tables). If the connection fails,
  the entire process exits — no point running a server that can't
  store data.

  connectCloudinary() sets up the Cloudinary SDK with your API keys.
  Cloudinary is a service that stores and serves images (like doctor
  profile photos). It doesn't connect yet — it just configures the
  credentials so later code can use `cloudinary.uploader.upload()`.
*/
connectDB()
connectCloudinary()

// middlewares
/*
  express.json() is a BODY PARSER. When a browser sends data
  (like a login form), it arrives as a raw string of JSON text.
  This middleware converts that raw text into a JavaScript object
  (req.body) that you can actually use.

  cors() adds headers that tell browsers "yes, it's okay for
  websites on other domains to call this API." Without this,
  browsers block cross-origin requests by default. This is a
  browser-enforced security rule, not a server one.
*/
app.use(express.json())
app.use(cors())

// api endpoints
/*
  These three lines are the TRAFFIC COP of the server. Every request
  that comes in gets checked against these prefixes:
    - /api/admin/*  →  goes to adminRouter (routes/adminRoute.js)
    - /api/doctor/* →  goes to doctorRouter (routes/doctorRoute.js)
    - /api/user/*   →  goes to userRouter (routes/userRoute.js)

  The router files then further split the request based on the
  remaining URL and the HTTP method (GET/POST).
*/
app.use('/api/admin', adminRouter)
app.use('/api/doctor', doctorRouter)
app.use("/api/user", userRouter)

/*
  Health check endpoint. When someone visits the base URL,
  they get "API Working". This is useful to verify the server
  is alive (e.g., for monitoring tools).
*/
app.get("/", (req, res) => {
  res.send("API Working")
});

/*
  Database connectivity check. Mongoose maintains a readyState:
    0 = disconnected
    1 = connected
    2 = connecting
    3 = disconnecting
  This endpoint lets you quickly check if the DB is alive without
  trying a real query.
*/
app.get('/test-db', (req, res) => {
  const state = mongoose.connection.readyState;
  if (state === 1) {
    res.send('Database is connected');
  } else {
    res.status(500).send('Database is NOT connected');
  }
});

/*
  THE LISTEN — this is the moment the server actually "wakes up."
  app.listen() tells the operating system: "I want to handle any
  traffic that comes to port 4000." The process then sits in an
  infinite loop, waiting for requests.

  The port is like a door number on a building. The IP address
  is the building address. Together they make a unique destination.
  Port 4000 was chosen arbitrarily (3000 and 5000 are also common
  for dev servers; 80 is standard for HTTP, 443 for HTTPS).
*/
app.listen(port, () => console.log(`Server started on PORT:${port}`))

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: config/mongodb.js                               │
  │                                                             │
  │  This file called connectDB(). Now let's see what that      │
  │  function actually does — how does a Node app talk to a     │
  │  MongoDB database?                                          │
  └─────────────────────────────────────────────────────────────┘
*/
