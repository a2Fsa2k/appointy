/*
╔══════════════════════════════════════════════════════════════╗
║              models/appointmentModel.js                      ║
║        "The bridge between patient and doctor"               ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: userModel.js (patient) and doctorModel.js (doctor).
  Now: the APPOINTMENT — the record that says "Patient X booked
  Doctor Y at Time Z."

  FIRST PRINCIPLE — What IS an appointment in data terms?
  ──────────────────────────────────────────────────────
  An appointment is a RELATIONSHIP between two entities:
    Patient ──books──▶ Doctor (at a specific date & time)

  In a SQL database, you'd have an appointments table with
  foreign keys to users and doctors tables. MongoDB doesn't
  have "foreign keys" — instead, you store the IDs as strings
  (userId, docId). Mongoose doesn't enforce that these IDs
  actually point to real documents (that's up to you).

  FIRST PRINCIPLE — Why store userData AND docData?
  ──────────────────────────────────────────────────
  Notice this model stores BOTH:
    (a) userId, docId (references to the actual documents)
    (b) userData, docData (full copies of the user and doctor info)

  This is called DENORMALIZATION or "data duplication." WHY?
  Because when you display an appointment, you need the patient's
  name and the doctor's name. Without duplication, you'd have to:
    1. Read the appointment (1 DB query)
    2. Read the user to get their name (another query)
    3. Read the doctor to get their name (another query)

  With duplication, you do ONE query and have everything. The
  tradeoff: if the user changes their name, old appointments
  still show the old name. For appointments (historical records),
  this is actually DESIRABLE — you want a snapshot of what was
  true at booking time.

  FIRST PRINCIPLE — Status flags (cancelled, payment, isCompleted):
  ─────────────────────────────────────────────────────────────────
  Three boolean flags track the appointment's lifecycle:
    cancelled=false  → appointment is active
    cancelled=true   → patient or admin cancelled it
    payment=false    → not paid yet (or paying cash)
    payment=true     → paid online (Razorpay)
    isCompleted=false → appointment hasn't happened yet
    isCompleted=true  → doctor marked it as done

  These are MUTUALLY EXCLUSIVE in practice:
    - If cancelled, payment/isCompleted don't matter
    - If completed, it can't be cancelled
  But the schema doesn't enforce this — it trusts the code.

  AUDIT NOTES:
  [!] DATA STALENESS: userData and docData are snapshots. If a
      doctor changes their fees, old appointments still show the
      old fee in `amount`. This is actually correct for historical
      records, but `docData` also contains address — if the doctor
      moves, old appointments show the wrong address.
  [!] NO INDEXES: There are no indexes except the implicit `_id`.
      Queries like `find({ userId })` or `find({ docId })` will
      scan the entire collection. As the app grows, these need
      indexes for performance.
  [!] NO TIMESTAMPS: Mongoose has a `timestamps: true` option
      that auto-adds `createdAt` and `updatedAt`. This model
      manually uses `date: Date.now()` — inconsistent.
*/

import mongoose from "mongoose"

const appointmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    /*
       The MongoDB _id of the patient who booked.
       Stored as String, not ObjectId. This is fine for
       simple lookups but loses the ability to use .populate()
       (Mongoose's JOIN-like feature).
    */
    docId: { type: String, required: true },
    slotDate: { type: String, required: true },
    /*
       slotDate format: "15_6_2025" (day_month_year)
       This matches the key format used in doctorModel.slots_booked.
       The underscore separator is used because "/" would create
       nested URL paths and "-" might be confused with date formats.
    */
    slotTime: { type: String, required: true },
    /*
       slotTime format: "10:00 AM" or "10:00"
       Matches the time format displayed in the frontend.
    */
    userData: { type: Object, required: true },
    /*
       A snapshot of the user's info at booking time:
       { name, email, image, address, ... } minus password.
       See userController.js bookAppointment — it does
       .select("-password") before copying here.
    */
    docData: { type: Object, required: true },
    /*
       A snapshot of the doctor's info at booking time:
       { name, speciality, image, fees, address, ... }
       slots_booked is DELETED from this copy (line 156 of
       userController.js) because we don't need to store all
       booked slots inside every appointment.
    */
    amount: { type: Number, required: true },
    /*
       The fee charged. Copied from docData.fees at booking time.
       This is the FINANCIAL record — even if the doctor raises
       fees later, this amount stays the same.
    */
    date: { type: Number, required: true },
    /*
       Unix timestamp of when the appointment was CREATED.
       Not the appointment date — that's slotDate.
       This is for sorting ("show newest appointments first").
    */
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false }
})

const appointmentModel = mongoose.models.appointment || mongoose.model("appointment", appointmentSchema)
export default appointmentModel

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: middlewares/authUser.js                         │
  │                                                             │
  │  Now we know WHAT data looks like. But HOW do we make       │
  │  sure only the right people can access it? Enter            │
  │  MIDDLEWARE — the security guards of the app.               │
  │  We start with the USER authentication guard.               │
  └─────────────────────────────────────────────────────────────┘
*/
