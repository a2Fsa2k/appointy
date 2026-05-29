/*
╔══════════════════════════════════════════════════════════════╗
║                 routes/doctorRoute.js                        ║
║        "The URL map for doctor actions"                      ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: adminRoute.js + adminController.js.
  Now: the doctor router — the final role in our 3-role system.

  THE THREE ROLES (recap):
    User (Patient) → books appointments, manages own profile
    Doctor         → sees own appointments, completes them, manages profile
    Admin          → manages doctors, sees everything

  Notice there's ONE public route (/list) that ANYONE can access
  — the frontend homepage needs to show all doctors, even to
  users who aren't logged in.

  The /list route is how the frontend gets the list of doctors
  to display on the home page, search page, and filter by specialty.

  All other routes use authDoctor middleware and extract the doctor's
  ID from the JWT token (via req.user.id).

  AUDIT NOTE:
  [!] The /list route returns ALL doctors with no pagination.
      If there are 1000+ doctors, this becomes a huge response
      that slows down the frontend. Should add .limit().
  [!] No route-level input validation. The controller functions
      handle basic validation but inconsistently.
*/

import express from 'express';
import { loginDoctor, appointmentsDoctor, appointmentCancel, doctorList,  appointmentComplete, doctorDashboard, doctorProfile, updateDoctorProfile, changeAvailability } from '../controllers/doctorController.js';
import authDoctor from '../middlewares/authDoctor.js';
const doctorRouter = express.Router();

doctorRouter.post("/login", loginDoctor)

/*
   PROTECTED routes: authDoctor middleware runs first.
   It extracts the doctor's ID from the JWT and puts it on
   req.user.id. Then the controller uses that ID to scope
   data to only THAT doctor.
*/
doctorRouter.post("/cancel-appointment", authDoctor, appointmentCancel)
doctorRouter.get("/appointments", authDoctor, appointmentsDoctor)

/*
   PUBLIC route: anyone can see the list of doctors.
   Used by the frontend home page and search/filter.
   No auth required — you should be able to browse doctors
   without logging in.
*/
doctorRouter.get("/list", doctorList)

doctorRouter.post("/change-availability", authDoctor, changeAvailability)
doctorRouter.post("/complete-appointment", authDoctor, appointmentComplete)
doctorRouter.get("/dashboard", authDoctor, doctorDashboard)
doctorRouter.get("/profile", authDoctor, doctorProfile)
doctorRouter.post("/update-profile", authDoctor, updateDoctorProfile)

export default doctorRouter;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: controllers/doctorController.js                 │
  │                                                             │
  │  The final backend file — the doctor's business logic.      │
  │  After this, we move to the FRONTEND to see how all this    │
  │  data gets displayed to users.                              │
  └─────────────────────────────────────────────────────────────┘
*/
