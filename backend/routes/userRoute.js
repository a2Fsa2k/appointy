/*
╔══════════════════════════════════════════════════════════════╗
║                 routes/userRoute.js                          ║
║        "The URL map for patient/patient actions"              ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: We learned about models and middleware.
  Now: ROUTES are the MAP. They connect a URL + HTTP method
  to a specific controller function.

  WHAT IS A ROUTER?
  ─────────────────
  An Express Router is like a mini-app. It groups related routes
  together. Instead of defining all routes in server.js (which
  would be a huge messy file), we create one router per "domain":
    - userRouter  → patient/patient actions
    - adminRouter → admin actions
    - doctorRouter → doctor actions

  HOW ROUTING WORKS:
  ──────────────────
  server.js says: app.use('/api/user', userRouter)
  This means: any URL starting with /api/user gets forwarded
  to this router. The router then strips /api/user and looks
  at the remaining path.

  Examples:
    POST /api/user/register → this router sees /register
    POST /api/user/login    → this router sees /login
    GET  /api/user/get-profile → this router sees /get-profile

  FIRST PRINCIPLE — HTTP Methods:
  ───────────────────────────────
  GET:    "Give me data" (read only, no side effects)
  POST:   "Here's data, do something with it" (create/update/delete)

  Rules of thumb:
    GET  → fetching, reading, listing
    POST → creating, updating, deleting, any action with side effects

  Notice how the auth middleware (authUser) is placed BETWEEN the
  path and the controller. This means the auth check RUNS FIRST.
  If auth fails, the controller never executes.

  AUDIT NOTES:
  [!] INCONSISTENT METHOD CHOICES: cancel-appointment, update-profile,
      and verifyRazorpay use POST even though they're updating data.
      PATCH or PUT would be more semantically correct for updates.

  [!] verifyRazorpay URL has inconsistent casing: 'verifyRazorpay'
      vs 'payment-razorpay'. The rest use kebab-case.

  [!] No input validation middleware (like express-validator).
      The controller functions do their own validation, which is
      inconsistent and error-prone. Some validate, some don't.
*/

import express from 'express';
import { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay } from '../controllers/userController.js';
import authUser from '../middlewares/authUser.js';
import upload from '../middlewares/multer.js';

const userRouter = express.Router();

/*
   PUBLIC routes (no auth needed):
   Anyone can register or login — they don't have a token yet.
*/
userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)

/*
   PROTECTED routes (authUser middleware runs first):
   The user must send a valid token in the headers.
   If authUser calls next(), the controller runs.
   If authUser returns an error, the controller is skipped.
*/
userRouter.get("/get-profile", authUser, getProfile)

/*
   upload.single('image') is a SECOND middleware that runs after
   authUser. So the full pipeline is:
     Request → authUser (verify token) → upload.single('image')
     (extract file) → updateProfile (handle logic)
   The 'image' string must match the form field name the browser
   sends. The browser sends: formData.append('image', file)
*/
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile)

userRouter.post("/book-appointment", authUser, bookAppointment)
userRouter.get("/appointments", authUser, listAppointment)
userRouter.post("/cancel-appointment", authUser, cancelAppointment)

/*
   Payment routes: paymentRazorpay creates an order,
   verifyRazorpay confirms the payment went through.
*/
userRouter.post("/payment-razorpay", authUser, paymentRazorpay)
userRouter.post("/verifyRazorpay", authUser, verifyRazorpay)

export default userRouter;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: controllers/userController.js                   │
  │                                                             │
  │  This file defined the URLs. Now let's see the ACTUAL       │
  │  CODE that runs when those URLs are hit. This is where      │
  │  the business logic lives — registration, login, booking.   │
  └─────────────────────────────────────────────────────────────┘
*/
