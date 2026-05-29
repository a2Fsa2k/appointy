/*
╔══════════════════════════════════════════════════════════════╗
║              controllers/userController.js                   ║
║     "The BRAINS — all patient/patient business logic"         ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: routes/userRoute.js mapped URLs to function names.
  Now: these ARE those functions. This is where the actual
  work happens.

  FIRST PRINCIPLE — What is a Controller?
  ───────────────────────────────────────
  A controller is the "C" in MVC (Model-View-Controller).
    Model      → database logic (models/)
    View       → what the user sees (frontend React code)
    Controller → the GLUE — takes request, does logic, sends response

  A controller function always follows this pattern:
    1. Extract data from req (body, params, headers)
    2. Validate the data
    3. Do something (query DB, call external API)
    4. Send a response (success or error)

  Every function here is: async (req, res) => { try {...} catch {...} }
  Async because database calls are asynchronous (they take time
  and return Promises).

  OVERVIEW OF FUNCTIONS IN THIS FILE:
  ────────────────────────────────────
    registerUser     → create a new patient account
    loginUser        → verify credentials, issue JWT
    getProfile       → fetch patient's info
    updateProfile    → edit patient's info + upload profile pic
    bookAppointment  → create an appointment (the core feature!)
    cancelAppointment → cancel an appointment + free the slot
    listAppointment  → get all of a patient's appointments
    paymentRazorpay  → create a Razorpay payment order
    verifyRazorpay   → confirm a payment was successful
*/

import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import jwt from "jsonwebtoken";
import {v2 as cloudinary} from 'cloudinary'
import razorpay from 'razorpay';



// API to register user
/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 1: registerUser                                   │
  │  What: Creates a brand new patient account                  │
  │  Flow: validate → hash password → save to DB → issue JWT   │
  └─────────────────────────────────────────────────────────────┘
*/
const registerUser = async (req, res) => {

    try {
        const { name, email, password } = req.body;

        /*
           DESTRUCTURING: This extracts name, email, password from
           req.body. If any of them are missing, they'll be `undefined`.
           req.body is created by the express.json() middleware.
        */

        // checking for all data to register user
        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' })
        }
        /*
          EARLY RETURN PATTERN: If something's wrong, return
          immediately with an error. This avoids deeply nested
          if-else blocks. The `return` is important — it stops
          the function. Without it, the code would continue
          executing.
        */

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }
        /*
           validator.isEmail() checks if the string looks like
           an email address. It uses regex internally to check
           for pattern like: something@something.something
           This is CLIENT-SIDE-STYLE validation on the server.
           Never trust the browser — always validate on the server.
        */

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        /*
           FIRST PRINCIPLE — Why hash passwords?
           ─────────────────────────────────────
           NEVER store passwords as plain text. If your database
           gets hacked, attackers can read everyone's passwords.
           Instead, store a HASH.

           A hash is a ONE-WAY transformation:
           password "hello123" → hash → "$2b$10$k8Y2s..." (looks random)
           You CANNOT reverse a hash back to the original password.

           When a user logs in, you hash their input and compare
           it to the stored hash. If they match, the password is
           correct. The actual password is never stored.

           SALT: bcrypt.genSalt(10) adds random data before hashing.
           This means two users with the same password get different
           hashes. Without salt, attackers could use "rainbow tables"
           (pre-computed hash→password dictionaries).

           The number 10 is "salt rounds" — it controls how SLOW
           the hashing is. More rounds = more secure but slower.
           10-12 is standard. Each increment DOUBLES the time.
        */
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()
        /*
           .save() actually writes to MongoDB. Until this point,
           the user only existed in memory. .save() returns the
           saved document, now with an _id field added by MongoDB.
        */

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
        /*
           jwt.sign() creates the JWT. The first argument is the
           PAYLOAD (data to encode = the user's MongoDB ID).
           The second is the SECRET KEY (used to create the
           signature).

           After this line, the user is "logged in" — they have
           a token that proves their identity for future requests.
        */

        res.json({ success: true, token })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
        /*
           AUDIT NOTE: Sending error.message to the client can
           leak database internals. For example, if there's a
           MongoDB duplicate key error for email, the message
           might include the connection string or collection name.
           Better: send a generic message and log the real error
           server-side.
        */
    }
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 2: loginUser                                      │
  │  What: Verifies email+password, issues JWT                  │
  │  Flow: find user → compare password hash → issue JWT       │
  └─────────────────────────────────────────────────────────────┘
*/
const loginUser = async (req, res) => {

    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })
        /*
           findOne() returns the FIRST document matching the query,
           or null if no match. It's like saying "find the user
           with this exact email address." Since email has a
           unique index, there'll be at most one match.
        */

        if (!user) {
            return res.json({ success: false, message: "User does not exist" })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        /*
           bcrypt.compare() takes a plain-text password and a hash,
           then checks if they match. It does NOT decrypt the hash
           (that's impossible). Instead, it hashes the plain-text
           password with the same salt (extracted from the stored
           hash) and checks if the results are identical.
        */

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        }
        else {
            res.json({ success: false, message: "Invalid credentials" })
        }

        /*
           AUDIT NOTE: The "User does not exist" vs "Invalid credentials"
           messages create an information leak. An attacker can
           determine which emails are registered by observing which
           error message they get. Better: always say "Invalid email
           or password" regardless of which was wrong. This is called
           "constant-time response" and prevents user enumeration.
        */
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 3: getProfile                                     │
  │  What: Returns the logged-in user's profile data            │
  │  Note: userId comes from authUser middleware (it added it    │
  │        to req.body after verifying the JWT)                 │
  └─────────────────────────────────────────────────────────────┘
*/
const getProfile = async (req, res) => {

    try {
        const { userId } = req.body
        /*
           userId was added to req.body by the authUser middleware.
           This is how we know WHICH user is making this request.
        */
        const userData = await userModel.findById(userId).select('-password')
        /*
           .select('-password') means "give me all fields EXCEPT
           password." The minus sign means EXCLUDE. Never send
           the password hash to the client — even though it's
           hashed, it's sensitive information.
        */
        res.json({ success: true, userData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 4: updateProfile                                  │
  │  What: Updates user info + uploads new profile picture       │
  │  Flow: validate fields → update text in DB → upload image   │
  │        (if provided) to Cloudinary → update image URL in DB │
  └─────────────────────────────────────────────────────────────┘
*/
const updateProfile = async (req, res) => {

    try {

        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file
        /*
           req.file comes from the multer middleware.
           It's undefined if no file was uploaded with the request.
           When present, it contains:
             - fieldname: 'image'
             - originalname: 'cat.jpg'
             - path: '/tmp/upload_abc123'
             - mimetype: 'image/jpeg'
             - size: 12345 (bytes)
        */

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })
        /*
           findByIdAndUpdate() does TWO things atomically:
           1. Finds the document by _id
           2. Updates the specified fields
           It returns the OLD document by default (before update).

           JSON.parse(address) converts the address from a JSON
           STRING back into a JavaScript object. Why is it a string?
           Because the frontend sends it via FormData, which can
           only send strings. So they JSON.stringify() the address
           object on the frontend and JSON.parse() it here.

           AUDIT NOTE: JSON.parse() will THROW if the string is
           malformed. If someone sends bad JSON, the entire request
           crashes. Should be wrapped in try-catch.
        */

        if (imageFile) {

            // upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
            /*
               cloudinary.uploader.upload() sends the file from your
               server's temp disk to Cloudinary's servers. It returns
               an object with:
                 - secure_url: "https://res.cloudinary.com/..."
                 - public_id: "abc123"
                 - width, height, format, etc.

               The { resource_type: "image" } tells Cloudinary it's
               an image (not a video or raw file).
            */
            const imageURL = imageUpload.secure_url
            /*
               secure_url is the HTTPS URL. Always use the HTTPS
               version to avoid mixed content warnings in browsers.
            */

            await userModel.findByIdAndUpdate(userId, { image: imageURL })
            /*
               AUDIT NOTE: This is a SECOND database call. If the
               first update succeeded but this one fails, the user's
               profile text is updated but the image is NOT. This
               is a partial update — no transaction wrapping these
               two operations. For a small app this is acceptable,
               but a production system would wrap both in a transaction.
            */
        }

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 5: bookAppointment                                │
  │  What: Creates an appointment — THE CORE FEATURE            │
  │  Flow: check availability → update doctor slots → save      │
  │        appointment → update doctor's slots_booked            │
  │                                                             │
  │  This is the most complex function. It coordinates THREE    │
  │  changes that must all succeed together:                     │
  │    1. Check slot is free                                    │
  │    2. Create appointment document                           │
  │    3. Update doctor's slots_booked (mark slot as taken)     │
  └─────────────────────────────────────────────────────────────┘
*/
const bookAppointment = async (req, res) => {

    try {

        const { userId, docId, slotDate, slotTime } = req.body
        const docData = await doctorModel.findById(docId).select("-password")

        if (!docData.available) {
            return res.json({ success: false, message: 'Doctor Not Available' })
        }

        let slots_booked = docData.slots_booked
        /*
           slots_booked is an object. Example:
           { "15_6_2025": ["10:00 AM", "10:30 AM"] }
        */

        // checking for slot availablity
        if (slots_booked[slotDate]) {
            /*
               Does this date already have booked slots?
               slots_booked["15_6_2025"] exists → check if
               the specific time is already taken.
            */
            if (slots_booked[slotDate].includes(slotTime)) {
                /*
                   Array.includes() checks if the time string
                   is already in the booked array. If yes, the
                   slot is taken → reject.
                */
                return res.json({ success: false, message: 'Slot Not Available' })
            }
            else {
                slots_booked[slotDate].push(slotTime)
                /*
                   Add this time to the existing date's array.
                   push() mutates the array in-place.
                */
            }
        } else {
            /*
               This date has NO booked slots yet. Create a new
               entry in the object for this date.
            */
            slots_booked[slotDate] = []
            slots_booked[slotDate].push(slotTime)
        }

        const userData = await userModel.findById(userId).select("-password")

        delete docData.slots_booked
        /*
           We remove slots_booked from the docData snapshot before
           storing it in the appointment. Reason: we don't need to
           store ALL booked slots inside every appointment record.
           It would be huge and redundant. The appointment only
           needs the doctor's name, specialty, fees, etc.
        */

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        /*
           save new slots data in docData. This updates the
           doctor document's slots_booked field with our modified
           version (which now includes the new booking).
        */
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        /*
           AUDIT NOTE: RACE CONDITION! Between checking slot
           availability and updating slots_booked, another request
           could book the SAME slot. This is because MongoDB
           operations are NOT atomic across separate calls.
           Two requests could both pass the availability check
           before either one updates slots_booked.

           Solution: Use MongoDB's $push with $addToSet or a
           findOneAndUpdate with conditions to make it atomic.
           For a small app, this race condition is unlikely to
           cause problems, but it's a critical bug for production.

           AUDIT NOTE: If .save() succeeds but
           doctorModel.findByIdAndUpdate() fails (e.g., network
           error), the appointment is created but the slot is NOT
           marked as booked. This means another user could book
           the same slot. A database transaction would solve this.
        */

        res.json({ success: true, message: 'Appointment Booked' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 6: cancelAppointment                              │
  │  What: Marks appointment as cancelled + frees the slot      │
  │  Flow: verify ownership → mark cancelled → free doctor slot │
  └─────────────────────────────────────────────────────────────┘
*/
const cancelAppointment = async (req, res) => {
    try {

        const { userId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        // verify appointment user
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
            /*
               AUTHORIZATION CHECK: The user can only cancel
               their OWN appointments. Even if they have a valid
               token, they can't cancel someone else's booking.
               This is authorization (what you're allowed to do),
               different from authentication (who you are).
            */
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // releasing doctor slot
        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        /*
           Remove the cancelled time from the doctor's booked slots.
           .filter() creates a NEW array with only items that
           pass the test. e !== slotTime means "keep everything
           that is NOT the cancelled time slot."
        */
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
  │  FUNCTION 7: listAppointment                                │
  │  What: Returns all of THIS user's appointments              │
  │  (Used by the "My Appointments" page in the frontend)       │
  └─────────────────────────────────────────────────────────────┘
*/
const listAppointment = async (req, res) => {
    try {

        const { userId } = req.body
        const appointments = await appointmentModel.find({ userId })
        /*
           find() with a filter returns ALL matching documents.
           find({ userId }) means "give me every appointment
           where the userId field matches this value."
        */

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  RAZORPAY PAYMENT FLOW                                      │
  │                                                             │
  │  Razorpay is an Indian payment gateway (like Stripe).       │
  │  The payment process has TWO steps:                         │
  │                                                             │
  │  Step 1 — CREATE ORDER (paymentRazorpay):                   │
  │    Your server tells Razorpay: "I want to charge ₹500."     │
  │    Razorpay returns an order object with an ID.             │
  │    The frontend uses this order to show a payment popup.    │
  │                                                             │
  │  Step 2 — VERIFY PAYMENT (verifyRazorpay):                  │
  │    After the user pays in the Razorpay popup, Razorpay      │
  │    calls back. The frontend sends the payment response      │
  │    to your server. Your server checks with Razorpay:        │
  │    "Did this payment actually succeed?" If yes, mark the    │
  │    appointment as paid in your database.                    │
  │                                                             │
  │  Why the two-step? Because you can NEVER trust the browser. │
  │  A hacker could modify the frontend code and fake a         │
  │  "payment successful" message. Only the server-to-server    │
  │  verification with Razorpay proves the payment is real.     │
  └─────────────────────────────────────────────────────────────┘
*/

const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})
/*
   The Razorpay instance is created ONCE when the module loads
   (not on each request). This is more efficient than creating
   a new instance for every payment.

   Two keys: key_id (public, safe to share with frontend)
            key_secret (PRIVATE, must NEVER be exposed)
*/

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 8: paymentRazorpay                                │
  │  What: Creates a Razorpay order for online payment          │
  └─────────────────────────────────────────────────────────────┘
*/
const paymentRazorpay = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }

        // creating options for razorpay payment
        const options = {
            amount: appointmentData.amount * 100,
            /*
               Razorpay expects amount in PAISE (smallest currency
               unit), not rupees. ₹500 = 50000 paise. So we multiply
               by 100. This is a common pattern in payment gateways
               — they use integers instead of decimals to avoid
               floating-point math errors.
            */
            currency: process.env.CURRENCY,
            /*
               Usually "INR" for Indian Rupees. ISO 4217 currency code.
            */
            receipt: appointmentId,
            /*
               The receipt field is used as a reference. We store the
               MongoDB appointment ID here so we can look up which
               appointment this payment was for when verifying.
            */
        }

        // creation of an order
        const order = await razorpayInstance.orders.create(options)
        /*
           This makes an API call to Razorpay's servers. Razorpay
           creates an order record on their side and returns details
           including the order ID. The frontend needs this to show
           the payment popup.
        */

        res.json({ success: true, order })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  FUNCTION 9: verifyRazorpay                                 │
  │  What: Confirms the payment was real by asking Razorpay     │
  └─────────────────────────────────────────────────────────────┘
*/
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id } = req.body
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
        /*
           Server-to-server call to Razorpay: "Tell me the
           status of this order." This is the verification step
           that can't be faked by a browser.
        */

        if (orderInfo.status === 'paid') {
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true })
            /*
               orderInfo.receipt contains the appointmentId we
               set when creating the order. We update the
               appointment's payment field to true.
            */
            res.json({ success: true, message: "Payment Successful" })
        }
        else {
            res.json({ success: false, message: 'Payment Failed' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}


export {registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: routes/adminRoute.js                            │
  │                                                             │
  │  We've covered the entire patient flow. Now let's see       │
  │  the ADMIN side — how does the admin manage doctors         │
  │  and view all appointments?                                 │
  │                                                             │
  │  But first, let's see the admin ROUTE map, then the         │
  │  admin controller.                                          │
  └─────────────────────────────────────────────────────────────┘
*/
