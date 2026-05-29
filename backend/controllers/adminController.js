/*
╔══════════════════════════════════════════════════════════════╗
║             controllers/adminController.js                   ║
║        "The admin's brain — manage doctors, view all"       ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: userController.js (patient logic), adminRoute.js (URL map).
  Now: the admin controller. Admin can:
    - Login (using hardcoded credentials from .env)
    - Add new doctors (with image upload)
    - View all doctors
    - View/manage all appointments
    - View dashboard statistics

  The admin has MORE POWER than regular users — they can see
  ALL appointments (not just their own) and manage doctors.

  FIRST PRINCIPLE — Why separate admin from regular users?
  ──────────────────────────────────────────────────────
  In this app, "admin" isn't stored in the database. It's a
  single hardcoded account defined by environment variables.
  This works for small apps but doesn't scale. A more robust
  approach would be having a "role" field on the user model
  (user, doctor, admin) and checking roles in middleware.

  OVERVIEW OF FUNCTIONS:
    loginAdmin        → authenticate admin (env vars)
    addDoctor         → register a new doctor
    allDoctors        → list all doctors
    appointmentsAdmin → list ALL appointments
    appointmentCancel → cancel any appointment (admin override)
    adminDashboard    → get summary stats for the dashboard
*/

import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import userModel from "../models/userModel.js"

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 1: loginAdmin                                     │
  │  What: Checks email+password against .env values            │
  │  Note: This is DIFFERENT from user login. No database query.│
  └─────────────────────────────────────────────────────────────┘
*/
const loginAdmin = async (req, res) => {
    try {

        const { email, password } = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            /*
               Simple string comparison. If it matches .env,
               the admin is authenticated.

               The JWT payload is `email + password` — a string
               concatenation. This is unusual (normally you'd put
               an object like { role: 'admin' }).

               AUDIT NOTE: See authAdmin.js for why embedding the
               password in the JWT payload is problematic.
            */
            const token = jwt.sign(email + password, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 2: addDoctor                                      │
  │  What: Registers a new doctor in the system                 │
  │  Flow: validate → hash password → upload image to Cloudinary│
  │        → save doctor to MongoDB                              │
  │  This is like registerUser but with MORE fields and the     │
  │  image is required (not optional like user profile pic).    │
  └─────────────────────────────────────────────────────────────┘
*/
const addDoctor = async (req, res) => {
  try {
    const { name, email, password, speciality, degree, experience, about, fees, address } = req.body;
    const imageFile = req.file;

    if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
      return res.status(400).json({ success: false, message: "Missing Details" });
    }
    /*
       Note: This uses HTTP 400 (Bad Request) status codes!
       This is more correct than the user controller which
       returns 200 with success:false. Inconsistent across
       the codebase.
    */

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Please enter a strong password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    /*
       Upload the doctor's image to Cloudinary.
       If this fails (e.g., Cloudinary is down), the function
       throws and the doctor is NOT created. This is correct —
       the image is REQUIRED for a doctor.
    */
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
    const imageUrl = imageUpload.secure_url;

    const doctorData = {
      name,
      email,
      image: imageUrl,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fees,
      address: JSON.parse(address),
      /*
         address arrives as a JSON string because it was sent
         via FormData (which only supports strings and files).
         JSON.parse converts it back to an object.
         Example: '{"line1":"123 St","line2":"Apt 4"}' → {line1: "123 St", line2: "Apt 4"}
      */
      date: Date.now()
    };

    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();

    res.status(200).json({ success: true, message: "Doctor Added" });

  } catch (error) {
    console.error("Error adding doctor:", error);
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 3: appointmentCancel                              │
  │  What: Admin cancels ANY appointment (no ownership check!)   │
  │  Unlike the user version, admin can cancel anyone's booking.│
  └─────────────────────────────────────────────────────────────┘
*/
const appointmentCancel = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        /*
           Notice: NO ownership check! The user version of cancel
           checks `if (appointmentData.userId !== userId)`. The
           admin version deliberately skips this — admin can cancel
           anyone's appointment.

           This is intentional: the admin needs absolute power to
           manage the system.
        */

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // releasing doctor slot
        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 4: allDoctors                                     │
  │  What: Returns ALL doctors (for admin doctor list)          │
  └─────────────────────────────────────────────────────────────┘
*/
const allDoctors = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select('-password')
        /*
           find({}) with an empty filter means "give me EVERYTHING."
           .select('-password') removes the password field from
           each doctor document. We never send password hashes
           to the client, even to the admin.
        */
        res.json({ success: true, doctors })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 5: appointmentsAdmin                              │
  │  What: Returns ALL appointments in the system               │
  │  Unlike user's listAppointment (which filters by userId),   │
  │  this returns every single appointment across all patients. │
  └─────────────────────────────────────────────────────────────┘
*/
const appointmentsAdmin = async (req, res) => {
    try {

        const appointments = await appointmentModel.find({})
        /*
           No userId filter — returns ALL appointments.
           This could be problematic at scale (thousands of
           appointments). Pagination should be added:
           .find({}).skip(0).limit(20)
        */
        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 6: adminDashboard                                 │
  │  What: Returns summary statistics for the admin dashboard   │
  │  Returns: number of doctors, appointments, patients, and    │
  │           the 5 most recent appointments                    │
  └─────────────────────────────────────────────────────────────┘
*/
const adminDashboard = async (req, res) => {
    try {

        const doctors = await doctorModel.find({})
        const users = await userModel.find({})
        const appointments = await appointmentModel.find({})

        /*
           All three queries run SEQUENTIALLY (one after another).
           They could run in PARALLEL with Promise.all():
           const [doctors, users, appointments] = await Promise.all([
             doctorModel.find({}),
             userModel.find({}),
             appointmentModel.find({})
           ]);
           This would be ~3x faster since the queries don't depend
           on each other.
        */

        const dashData = {
            doctors: doctors.length,
            /*
               Note: This fetches ALL doctors then counts them.
               More efficient: doctorModel.countDocuments({})
               which only returns the count, not the full documents.
            */
            appointments: appointments.length,
            patients: users.length,
            latestAppointments: appointments.reverse().slice(0,5)
            /*
               .reverse() mutates the array! It reverses the order
               in-place. If you called .reverse() again, you'd get
               the original order back.

               .slice(0,5) takes the first 5 elements (index 0-4).
               If there are fewer than 5, it returns all of them.

               So this gives the 5 MOST RECENT appointments (since
               they were sorted by insertion order, reversing puts
               newest first).
            */
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}


export {loginAdmin, addDoctor, allDoctors, appointmentsAdmin, appointmentCancel, adminDashboard}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: routes/doctorRoute.js                           │
  │                                                             │
  │  We've covered admin. The final role: DOCTOR.               │
  │  Doctors can see their appointments, complete them,         │
  │  and manage their own profile.                              │
  └─────────────────────────────────────────────────────────────┘
*/
