/*
╔══════════════════════════════════════════════════════════════╗
║                 models/doctorModel.js                        ║
║           "The blueprint of a doctor"                        ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: userModel.js — we defined a patient/user.
  Now: the DOCTOR model. Similar idea, different fields.

  KEY DIFFERENCE FROM USER MODEL:
  ───────────────────────────────
  The user is a patient who books appointments.
  The doctor is a provider who GETS booked.

  Notice doctor has fields user doesn't: speciality, degree,
  experience, about, fees, slots_booked, available.
  These are the PROFESSIONAL details a patient needs to see.

  FIRST PRINCIPLE — The "slots_booked" field is clever:
  ─────────────────────────────────────────────────────
  slots_booked is an Object that acts as a mini-calendar:
  {
    "15_6_2025": ["10:00 AM", "10:30 AM"],
    "16_6_2025": ["11:00 AM"]
  }

  Each KEY is a date (day_month_year format).
  Each VALUE is an array of time slots already taken.

  When a patient books, the slot gets PUSHED into the array.
  When they cancel, it gets FILTERED out.

  This is stored directly on the doctor document — no need
  for a separate "slots" collection. This is called
  "embedding" data. It's fast (one read gets everything) but
  has limits (if a doctor had thousands of slots, the document
  would get huge).

  FIRST PRINCIPLE — `minimize: false`:
  ─────────────────────────────────────
  By default, Mongoose doesn't save empty objects `{}`. The
  `minimize: false` option tells it: "save the empty slots_booked
  object even if it has no keys yet." This ensures the field
  always exists and is always an object, avoiding `undefined`
  errors when you try to access slots_booked[someDate].

  AUDIT NOTES:
  [!] The `image` field is `required: true` but there's no
      default. If the admin forgets to upload an image when
      creating a doctor, the save will fail. This is correct
      behavior but the error message could be more user-friendly.
  [!] Experience is stored as String (e.g., "5 Years"), not
      Number. This makes sorting/filtering by experience hard.
      A Number type would allow queries like "find doctors with
      5+ years experience."
  [!] `date` field stores a timestamp (Number) from Date.now().
      It's named vaguely — `createdAt` would be clearer.
*/

import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true },
    /*
       available = true means "accepting appointments."
       Doctors can toggle this on/off. When false, the
       frontend shows "Not Available" and blocks booking.
    */
    fees: { type: Number, required: true },
    slots_booked: { type: Object, default: {} },
    /*
       slots_booked stores which time slots are taken.
       Key: date string like "15_6_2025"
       Value: array of time strings ["10:00 AM", "10:30 AM"]
       This is a simple "hash map" pattern — the date IS the key.
    */
    address: { type: Object, required: true },
    date: { type: Number, required: true },
    /*
       `date` is when the doctor was added to the system.
       Stored as a Number (Unix timestamp in milliseconds).
       Date.now() returns the current timestamp.
    */
}, { minimize: false })
/*
   minimize: false tells Mongoose: "Don't strip out empty objects."
   Without this, {} becomes missing from the saved document, which
   can cause `slots_booked[date]` to crash with "cannot read
   property of undefined."
*/

const doctorModel = mongoose.models.doctor || mongoose.model("doctor", doctorSchema);
export default doctorModel;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: models/appointmentModel.js                      │
  │                                                             │
  │  We have patients and doctors. Now we need the THING        │
  │  that connects them: the APPOINTMENT.                       │
  └─────────────────────────────────────────────────────────────┘
*/
