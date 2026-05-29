/*
╔══════════════════════════════════════════════════════════════╗
║              frontend/src/Appointment.jsx                    ║
║    "THE CORE — booking an appointment with a doctor"         ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: Login.jsx (authentication) and Doctors.jsx (browsing).
  Now: THE most important page — actually BOOKING an appointment.
  This is the product's main feature. Everything else supports this.

  THE USER JOURNEY:
  1. User sees doctor on the home page/doctors page
  2. Clicks a doctor card → navigates to /appointment/:docId
  3. This page shows doctor details + available time slots
  4. User picks a date, then a time, then clicks "Book"
  5. Backend creates the appointment → redirects to My Appointments

  FIRST PRINCIPLE — Generating time slots from nothing:
  ──────────────────────────────────────────────────
  The backend DOESN'T store available slots. It only stores
  BOOKED slots (slots_booked). Available slots are COMPUTED
  by generating all possible slots (every 30 minutes from
  10 AM to 9 PM for the next 7 days) and REMOVING the ones
  that are booked.

  This is a clever design choice:
    Storing available slots = massive data, constantly updating
    Computing them         = tiny data (just booked ones), fast math

  The "subtraction model": Universe of all slots minus booked = available.

  THE SLOT GENERATION ALGORITHM (getAvailableSlots):
  ──────────────────────────────────────────────────
  1. For each of the next 7 days:
     a. If today: start from current hour (minimum 10 AM), rounded to half-hour
     b. If future day: start from 10 AM
     c. End at 9 PM
     d. Generate slots at 30-minute intervals
     e. Check: is this slot NOT in docInfo.slots_booked?
     f. If free → add to available slots
  2. Set state with all 7 days × multiple time slots

  FIRST PRINCIPLE — Why 30-minute slots?
  ──────────────────────────────────────
  The granularity (30 min) is a business decision, not technical.
  A doctor's appointment typically takes 20-30 min. The slot size
  should match the appointment duration. Making it configurable
  would require changing the while loop increment.

  AUDIT NOTES:
  [!] TIMEZONE: The slot generation uses the BROWSER's local time.
      If the browser is in India and the doctor is in the US,
      the slots would be wrong. The server should generate slots
      in the doctor's timezone.

  [!] RACE CONDITION: Two users could see the same slot as
      "available" and both try to book it. The backend's
      bookAppointment function handles this partially (checks
      again before saving), but there's still a window where
      both requests pass the check before either updates.

  [!] The dependency array [doctors, docId] on the useEffect
      that calls fetchDocInfo — this re-runs when doctors list
      changes, which is correct. But if the doctor list hasn't
      loaded yet (empty array), it doesn't run. The second
      useEffect depends on docInfo being set.
*/

import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from './context/AppContext'
import { assets } from './assets/assets'
import RelatedDoctors from './components/RelatedDoctors'
import axios from 'axios'
import { toast } from 'react-toastify'

const Appointment = () => {
  const { docId } = useParams()
  /*
     useParams() extracts URL parameters. For URL
     /appointment/507f1f77bcf86cd799439011, docId = "507f1f..."
     This is the MongoDB _id of the doctor to book.
  */
  const navigate = useNavigate()
  const { doctors, currencySymbol, backendUrl, token, getDoctorsData } = useContext(AppContext)
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  const [docInfo, setDocInfo] = useState(null)
  const [docSlots, setDocSlots] = useState([])
  /*
     docSlots is an ARRAY OF ARRAYS:
     [
       [{datetime, time}, {datetime, time}, ...],  // Day 1 (today)
       [{datetime, time}, {datetime, time}, ...],  // Day 2
       ...                                         // Days 3-7
     ]
     Each inner array is one day's available time slots.
  */
  const [slotIndex, setSlotIndex] = useState(0)
  /*
     Which DAY the user selected (index into docSlots array).
     Default: 0 (today).
  */
  const [slotTime, setSlotTime] = useState('')
  /*
     Which TIME the user selected on the chosen day.
  */

  const fetchDocInfo = async () => {
    const doc = doctors.find((doc) => doc._id === docId)
    if (doc) {
      setDocInfo({ ...doc, slots_booked: doc.slots_booked || {} })
      /*
         Spread the doctor object and ensure slots_booked
         is at least an empty object (defensive programming).
         Without this, docInfo.slots_booked could be undefined,
         and checking slots_booked[slotDate] would crash.
      */
    }
  }

  const getAvailableSlots = () => {
    if (!docInfo) return
    setDocSlots([]) // Reset before regenerating

    const today = new Date()

    for (let i = 0; i < 7; i++) {
      /*
         Generate slots for 7 days: today through today+6.
         Each iteration creates one day's worth of time slots.
      */
      const currentDate = new Date(today)
      currentDate.setDate(today.getDate() + i)
      /*
         setDate() handles month/year rollover automatically.
         Adding 7 days to May 29 correctly gives June 5.
      */

      const endTime = new Date(currentDate)
      endTime.setHours(21, 0, 0, 0)
      /*
         Appointments end at 9 PM (21:00). No night appointments.
      */

      if (today.getDate() === currentDate.getDate()) {
        /*
           TODAY: Start from the NEXT available half-hour slot
           (minimum 10 AM). If it's 2:15 PM now, start at 2:30 PM.
           If it's before 10 AM, start at 10:00 AM.
           If it's after 9 PM, no slots today.
        */
        currentDate.setHours(currentDate.getHours() > 10 ? currentDate.getHours() + 1 : 10)
        currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0)
      } else {
        // FUTURE DAYS: Start from 10 AM
        currentDate.setHours(10)
        currentDate.setMinutes(0)
      }

      const timeSlots = []

      while (currentDate < endTime) {
        /*
           Generate slots by adding 30 minutes each iteration.
           This creates: 10:00, 10:30, 11:00, ..., 20:30
        */
        const formattedTime = currentDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
        /*
           toLocaleTimeString formats the time according to browser locale.
           In India: "10:00 AM" or "10:00 am" depending on browser settings.
           The [] empty array means "use browser default locale."
        */

        const day = currentDate.getDate()
        const month = currentDate.getMonth() + 1
        /*
           getMonth() is 0-indexed! January = 0, December = 11.
           Adding 1 converts to human-readable month numbers.
        */
        const year = currentDate.getFullYear()
        const slotDate = `${day}_${month}_${year}`
        /*
           Format: "29_5_2026" (day_month_year).
           This MUST match the format used in the backend's
           doctorModel.slots_booked keys.
        */
        const slotTime = formattedTime

        const isSlotAvailable =
          !docInfo?.slots_booked?.[slotDate] ||
          !docInfo.slots_booked[slotDate].includes(slotTime)
        /*
           Optional chaining (?.) prevents crashes:
           If slots_booked is undefined, slots_booked?.[slotDate]
           returns undefined instead of throwing.
           If the date key doesn't exist, the slot IS available
           (nothing booked on that date yet).
           If the date exists, check if the time is NOT in the array.
        */

        if (isSlotAvailable) {
          timeSlots.push({
            datetime: new Date(currentDate),
            time: formattedTime
          })
        }

        currentDate.setMinutes(currentDate.getMinutes() + 30)
        /*
           Step forward 30 minutes. setMinutes() handles hour
           rollover (e.g., 10:30 + 30 = 11:00).
        */
      }

      setDocSlots((prev) => [...prev, timeSlots])
      /*
         Using the functional update form of setState (prev => ...)
         ensures we're adding to the LATEST state, not a stale
         closure value. Important because this runs in a loop.
      */
    }
  }

  const bookAppointment = async () => {

    if (!token) {
      toast.warning('Login to book appointment')
      return navigate('/login')
      /*
         Gate check: if the user isn't logged in, redirect to
         login instead of trying the API call (which would fail).
      */
    }

    const date = docSlots[slotIndex][0].datetime

    let day = date.getDate()
    let month = date.getMonth() + 1
    let year = date.getFullYear()

    const slotDate = day + "_" + month + "_" + year

    try {

      const { data } = await axios.post(backendUrl + '/api/user/book-appointment',
        { docId, slotDate, slotTime },
        { headers: { token } }
      )
      /*
         Sends: which doctor, which date, which time, who's booking.
         The userId comes from the token in headers → authUser middleware
         adds it to req.body on the backend.
      */
      if (data.success) {
        toast.success(data.message)
        getDoctorsData()
        /*
           Re-fetch doctors to get updated slots_booked.
           This ensures the next user sees this slot as unavailable.
        */
        navigate('/my-appointments')
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }

  }

  useEffect(() => {
    if (doctors.length > 0) {
      fetchDocInfo()
    }
  }, [doctors, docId])
  /*
     Only try to find doctor info when the doctors list is loaded.
     If doctors is empty (still fetching), this effect does nothing.
     When doctors arrives, it finds the specific doctor by docId.
  */

  useEffect(() => {
    if (docInfo) {
      getAvailableSlots()
    }
  }, [docInfo])
  /*
     When docInfo is set (doctor found), generate available slots.
     The dependency on docInfo means: if doctor info changes
     (e.g., from a different doctor), regenerate slots.
  */

  return (
    docInfo && (
      <div>
        {/* Doctor details */}
        <div className='flex flex-col sm:flex-row gap-4'>
          <div>
            <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt="" />
          </div>
          <div className='flex-1 border border-[#ADADAD] rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>
            <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>
              {docInfo.name} <img src={assets.verified_icon} alt="" />
            </p>
            <div className='flex items-center gap-2 mt-1 text-gray-600'>
              <p>{docInfo.degree} - {docInfo.speciality}</p>
              <button className='py-0.5 px-2 border text-xs rounded-full'>{docInfo.experience}</button>
            </div>
            <div>
              <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>
                About <img src={assets.info_icon} alt="" />
              </p>
              <p className='text-sm text-gray-600 max-w-[700px] mt-1'>{docInfo.about}</p>
            </div>
            <p className='text-gray-600 font-medium mt-4'>
              Appointment fee: <span className='text-gray-800'>{currencySymbol} {docInfo.fees}</span>
            </p>
          </div>
        </div>

        {/* Booking Slots */}
        <div className='sm:ml-72 sm:pl-4 mt-8 font-medium text-[#565656]'>
          <p>Booking slots</p>

          {/* Days Scroll */}
          <div className='flex gap-3 items-center w-full overflow-x-scroll mt-4'>
            {docSlots.length > 0 &&
              docSlots.map((item, index) => (
                <div
                  onClick={() => setSlotIndex(index)}
                  key={index}
                  className={`text-center py-6 min-w-16 rounded-full cursor-pointer ${slotIndex === index ? 'bg-primary text-white' : 'border border-[#DDDDDD]'
                    }`}
                >
                  <p>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
                  <p>{item[0] && item[0].datetime.getDate()}</p>
                  {/*
                     Shows day abbreviation and date number.
                     getDay() returns 0-6 (Sun-Sat).
                     daysOfWeek[0] = 'SUN'.
                  */}
                </div>
              ))}
          </div>

          {/* Time Slots Scroll */}
          <div className='flex items-center gap-3 w-full overflow-x-scroll mt-4'>
            {docSlots.length > 0 &&
              docSlots[slotIndex] &&
              docSlots[slotIndex].map((item, index) => (
                <p
                  onClick={() => setSlotTime(item.time)}
                  key={index}
                  className={`text-sm font-light flex-shrink-0 px-5 py-2 rounded-full cursor-pointer ${item.time === slotTime
                      ? 'bg-primary text-white'
                      : 'text-[#949494] border border-[#B4B4B4]'
                    }`}
                >
                  {item.time.toLowerCase()}
                </p>
              ))}
          </div>

          {/* Book Button */}
          <button
            onClick={bookAppointment}
            className='bg-primary text-white text-sm font-light px-20 py-3 rounded-full my-6'
          >
            Book an appointment
          </button>
        </div>

        {/* Related Doctors: same specialty, different doctor */}
        <RelatedDoctors speciality={docInfo.speciality} docId={docId} />
      </div>
    )
  )
}

export default Appointment

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: pages/MyAppointment.jsx                         │
  │                                                             │
  │  After booking, the user goes to "My Appointments" to see   │
  │  their bookings, pay online (Razorpay), and cancel.         │
  │  This is where the PAYMENT integration lives.               │
  └─────────────────────────────────────────────────────────────┘
*/
