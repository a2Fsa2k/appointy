/*
╔══════════════════════════════════════════════════════════════╗
║                 routes/adminRoute.js                         ║
║        "The URL map for admin actions"                       ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: userRoute.js + userController.js — full patient flow.
  Now: the admin router. Same concept, different namespace.

  Notice the URL patterns follow REST-ish conventions:
    POST   /login              → authenticate
    POST   /add-doctor         → create a new doctor
    GET    /all-doctors        → list all doctors
    POST   /change-availability → toggle a doctor's availability
    GET    /appointments       → list all appointments
    POST   /cancel-appointment → cancel an appointment
    GET    /dashboard          → get summary statistics

  All routes except /login are PROTECTED by authAdmin middleware.
  The admin must send 'atoken' in the request headers.

  Notice something interesting: changeAvailability is IMPORTED
  from the DOCTOR controller (../controllers/doctorController.js)!
  This is because changing availability is a doctor-related action
  that the admin is also allowed to do. Code reuse across roles.

  AUDIT NOTE:
  [!] The login route uses POST without any rate limiting.
      An attacker could brute-force the admin password by
      trying thousands of combinations. Rate limiting (like
      express-rate-limit) would block this.
*/

import express from 'express'
import { addDoctor, adminDashboard, allDoctors, appointmentCancel, appointmentsAdmin, loginAdmin} from '../controllers/adminController.js'
import upload from '../middlewares/multer.js'
import authAdmin from '../middlewares/authAdmin.js';
import { changeAvailability } from '../controllers/doctorController.js';

const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin)
/*
   Only public admin route — the admin logs in here.
*/
adminRouter.post("/add-doctor", authAdmin, upload.single('image'), addDoctor)
/*
   Middleware chain: authAdmin (verify admin token) →
   upload.single('image') (extract doctor photo) →
   addDoctor (create doctor in DB + upload image to Cloudinary)
*/
adminRouter.get("/all-doctors", authAdmin, allDoctors)
adminRouter.post("/change-availability", authAdmin, changeAvailability)
/*
   changeAvailability is from doctorController.js!
   It toggles a doctor's available/unavailable status.
   Both doctors themselves AND the admin can do this.
*/
adminRouter.get("/appointments", authAdmin, appointmentsAdmin)
adminRouter.post("/cancel-appointment", authAdmin, appointmentCancel)
adminRouter.get("/dashboard", authAdmin, adminDashboard)

export default adminRouter;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: controllers/adminController.js                  │
  │                                                             │
  │  The admin controller — where the admin's business logic    │
  │  lives (login, adding doctors, dashboard stats).            │
  └─────────────────────────────────────────────────────────────┘
*/
