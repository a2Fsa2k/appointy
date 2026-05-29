/*
╔══════════════════════════════════════════════════════════════╗
║             controllers/doctorController.js                  ║
║      "The doctor's brain — appointments, earnings, profile"  ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: adminController.js (admin logic), doctorRoute.js (URL map).
  Now: the DOCTOR controller — the final backend file!

  The doctor's workflow:
    1. Login → get JWT
    2. See dashboard (earnings, patient count, appointment count)
    3. View their appointments list
    4. Complete or cancel appointments
    5. Toggle their availability (online/offline)
    6. Edit their profile (fees, about, address)

  HOW THIS FILE CONNECTS TO THE REST:
  ────────────────────────────────────
  doctorController.js uses:
    - doctorModel    → to query/update doctor docs
    - appointmentModel → to query/update appointments
    - jwt            → to create tokens on login
    - bcrypt         → to verify passwords on login

  The doctor list (doctorList) is used by the PUBLIC frontend
  to display doctors. It strips out sensitive fields (password,
  email) before sending.

  OVERVIEW OF FUNCTIONS:
    loginDoctor          → authenticate a doctor
    appointmentsDoctor   → get THIS doctor's appointments
    appointmentCancel    → cancel an appointment (with ownership check)
    appointmentComplete  → mark appointment as done
    doctorList           → GET ALL doctors (public — for frontend listing)
    changeAvailability   → toggle available/unavailable
    doctorProfile        → get THIS doctor's profile data
    updateDoctorProfile  → update fees, address, about, availability
    doctorDashboard      → get earnings + stats summary
*/

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 1: loginDoctor                                    │
  │  What: Verifies email+password, returns JWT with doctor ID  │
  │  Similar to loginUser but queries the doctor collection.    │
  └─────────────────────────────────────────────────────────────┘
*/
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await doctorModel.findOne({ email });
    /*
       Variable name is `user` but it's a doctor document.
       This is because the code was likely copied from userController
       and the variable wasn't renamed. Doesn't affect functionality
       but shows the code's evolutionary nature.
    */

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    /*
       Same "Invalid credentials" for both missing user and wrong
       password — this is GOOD security practice. It doesn't reveal
       whether the email exists (prevents user enumeration).
    */

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    /*
       The token payload is { id: doctor's MongoDB _id }.
       The authDoctor middleware will decode this and put it on
       req.user.id. This is how subsequent requests identify
       WHICH doctor is calling.
    */
    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 2: appointmentsDoctor                             │
  │  What: Get THIS doctor's appointments (scoped by docId)     │
  └─────────────────────────────────────────────────────────────┘
*/
const appointmentsDoctor = async (req, res) => {
  try {
    const docId = req.user.id;
    /*
       req.user.id was set by authDoctor middleware.
       This is the doctor's MongoDB _id from the JWT.
       This ensures a doctor can ONLY see their OWN appointments.
    */
    const appointments = await appointmentModel.find({ docId });
    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 3: appointmentCancel                              │
  │  What: Doctor cancels an appointment (with ownership check) │
  └─────────────────────────────────────────────────────────────┘
*/
const appointmentCancel = async (req, res) => {
  try {
    const docId = req.user.id;
    const { appointmentId } = req.body;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment || appointment.docId.toString() !== docId) {
      return res.status(403).json({ success: false, message: "Invalid doctor or appointment" });
      /*
         Double security:
         1. Check appointment exists
         2. Check this doctor OWNS the appointment (docId matches)

         .toString() is needed because MongoDB ObjectIds look like
         strings when printed but are actually objects. Comparing
         ObjectId to ObjectId works, but comparing to a string
         (from JWT) requires .toString() for reliable comparison.
      */
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    // Free the time slot so another patient can book it
    const { slotDate, slotTime } = appointment;
    // docId already declared above from req.user.id
    const doctorData = await doctorModel.findById(docId);
    let slots_booked = doctorData.slots_booked;
    slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime);
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 4: appointmentComplete                            │
  │  What: Doctor marks appointment as done (after the visit)   │
  └─────────────────────────────────────────────────────────────┘
*/
const appointmentComplete = async (req, res) => {
  try {
    const docId = req.user.id;
    const { appointmentId } = req.body;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment || appointment.docId.toString() !== docId) {
      return res.status(403).json({ success: false, message: "Invalid doctor or appointment" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true });
    res.json({ success: true, message: "Appointment Completed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 5: doctorList                                     │
  │  What: Returns ALL doctors — PUBLIC endpoint                │
  │  This is how the frontend homepage shows doctor cards.      │
  │  Strips password and email (patients shouldn't see those).  │
  └─────────────────────────────────────────────────────────────┘
*/
const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password -email");
    /*
       .select("-password -email") excludes TWO fields.
       Password: obvious (security)
       Email: privacy (patients don't need to see doctor emails,
              they book through the app)
    */
    res.json({ success: true, doctors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 6: changeAvailability                             │
  │  What: Toggles a doctor's available/unavailable status      │
  │  This is used by BOTH the doctor (self) and the admin.      │
  │                                                             │
  │  This function is also imported by adminRoute.js!           │
  │  Code sharing between admin and doctor controllers.         │
  └─────────────────────────────────────────────────────────────┘
*/
const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;
    /*
       When called by admin: docId comes from the admin's request body.
       When called by doctor: docId should come from the JWT (req.user.id),
       but this function takes it from req.body. This means a doctor
       COULD change another doctor's availability if they know their ID.

       AUDIT NOTE: When called via the doctor route, this should
       use req.user.id, not req.body.docId. Currently a doctor
       can toggle ANY doctor's availability by guessing IDs.
    */

    if (!docId) {
      return res.status(400).json({ success: false, message: "Doctor ID missing" });
    }

    const doctor = await doctorModel.findById(docId);

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    doctor.available = !doctor.available;
    await doctor.save();
    /*
       The TOGGLE pattern: read current value, flip it, save.
       doctor.available starts as true (from the model default).
       Each call flips it.

       This approach has a minor race condition (read-modify-write)
       but for a toggle it's unlikely to cause issues.
    */

    res.json({ success: true, message: "Availability changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 7: doctorProfile                                  │
  │  What: Returns THIS doctor's full profile (for editing)     │
  └─────────────────────────────────────────────────────────────┘
*/
const doctorProfile = async (req, res) => {
  try {
    const docId = req.user.id;
    const profile = await doctorModel.findById(docId).select("-password");
    res.json({ success: true, profileData: profile });
    /*
       Note: the field is named `profileData` in the response.
       The frontend DoctorContext expects `data.profileData`.
       This is a naming inconsistency — sometimes it's userData,
       sometimes profileData, sometimes just the data directly.
    */
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 8: updateDoctorProfile                            │
  │  What: Updates fees, address, about, availability           │
  │  Note: Does NOT update name, email, degree, specialty —     │
  │        those are set at creation and can't be changed.       │
  └─────────────────────────────────────────────────────────────┘
*/
const updateDoctorProfile = async (req, res) => {
  try {
    const docId = req.user.id;
    const { fees, address, available, about } = req.body;

    await doctorModel.findByIdAndUpdate(docId, {
      fees,
      address,
      available,
      about,
    });

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 9: doctorDashboard                                │
  │  What: Returns earnings, appointment count, patient count,  │
  │        and latest 5 appointments for THIS doctor            │
  └─────────────────────────────────────────────────────────────┘
*/
const doctorDashboard = async (req, res) => {
  try {
    const docId = req.user.id;
    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;
    /*
       Earnings calculation: sum the amount for every appointment
       that is EITHER completed OR paid. This is intentionally
       generous — if a patient paid online but the appointment
       isn't marked complete, the doctor still earned the money.
    */
    const patientSet = new Set();
    /*
       A Set is like an array but with ONLY unique values.
       If you add the same value twice, it only keeps one copy.
       We use it to count unique patients (a patient who booked
       3 appointments should count as 1, not 3).
    */

    appointments.forEach((a) => {
      if (a.isCompleted || a.payment) earnings += a.amount;
      patientSet.add(a.userId.toString());
      /*
         .toString() because we want string comparison.
         The userId in the appointment is stored as String,
         but ensuring consistent type avoids subtle bugs.
      */
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patientSet.size,
      /*
         patientSet.size gives the number of UNIQUE user IDs.
         This is how many distinct patients the doctor has seen.
      */
      latestAppointments: appointments.reverse().slice(0, 5),
      /*
         Same pattern as admin dashboard: reverse (newest first),
         then take first 5.

         AUDIT NOTE: .reverse() MUTATES the original array.
         If this array is used elsewhere (e.g., React state),
         the mutation could cause unexpected re-rendering.
         Safer: [...appointments].reverse().slice(0, 5)
      */
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  doctorList,
  changeAvailability,
  doctorProfile,
  updateDoctorProfile,
  doctorDashboard,
};

/*
  ╔══════════════════════════════════════════════════════════════╗
  ║                 END OF BACKEND                              ║
  ║                                                            ║
  ║  You've completed the entire backend! Here's what you       ║
  ║  learned:                                                   ║
  ║                                                            ║
  ║  server.js         → the entry point, starts everything     ║
  ║  config/           → database + cloud connections           ║
  ║  models/           → data shapes (User, Doctor, Appointment)║
  ║  middlewares/       → auth guards + file handler            ║
  ║  routes/           → URL maps connecting URLs to code      ║
  ║  controllers/      → the actual business logic              ║
  ║                                                            ║
  ║  RELATIONSHIP MAP (how files connect):                      ║
  ║                                                            ║
  ║  server.js                                                 ║
  ║  ├── config/mongodb.js                                     ║
  ║  ├── config/cloudinary.js                                  ║
  ║  ├── routes/adminRoute.js ──→ controllers/adminController.js║
  ║  │   ├── middlewares/authAdmin.js                           ║
  ║  │   └── middlewares/multer.js                              ║
  ║  ├── routes/doctorRoute.js ──→ controllers/doctorController║
  ║  │   └── middlewares/authDoctor.js                          ║
  ║  └── routes/userRoute.js ──→ controllers/userController.js ║
  ║      ├── middlewares/authUser.js                            ║
  ║      └── middlewares/multer.js                              ║
  ║                                                            ║
  ║  All controllers use the models:                            ║
  ║  models/userModel.js, doctorModel.js, appointmentModel.js   ║
  ║                                                            ║
  ║  NEXT: The FRONTEND — where this data becomes visible.     ║
  ║  Start with: ../frontend/src/main.jsx                      ║
  ╚══════════════════════════════════════════════════════════════╝
*/
