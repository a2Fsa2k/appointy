/*
╔══════════════════════════════════════════════════════════════╗
║           frontend/src/pages/MyAppointment.jsx               ║
║   "View bookings, pay online (Razorpay), cancel appointments"║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: Appointment.jsx — booking a doctor.
  Now: My Appointments — the user's personal dashboard of all
  their bookings. This is where they:
    1. See all appointments (past and upcoming)
    2. Pay for unpaid appointments (Razorpay integration)
    3. Cancel appointments they don't want
    4. See status: Paid, Completed, Cancelled

  FIRST PRINCIPLE — How does Razorpay work in the browser?
  ────────────────────────────────────────────────────────
  Razorpay works through a POPUP window that the Razorpay
  JavaScript SDK creates. The flow:

  1. User clicks "Pay Online" → appointmentRazorpay() runs
  2. Frontend calls YOUR backend: POST /api/user/payment-razorpay
  3. YOUR backend calls Razorpay's server: "Create an order for ₹500"
  4. Razorpay returns order details (id, amount, currency)
  5. Frontend receives the order → calls initPay(order)
  6. initPay creates a Razorpay popup: new window.Razorpay(options)
  7. User enters card/UPI details in the Razorpay popup
  8. Razorpay processes the payment
  9. On success, Razorpay calls the `handler` function
  10. handler sends payment details to YOUR backend: POST /api/user/verifyRazorpay
  11. YOUR backend asks Razorpay: "Was this payment real?"
  12. If yes → backend marks appointment as paid

  Why the verification step (step 10-12)? Because the browser
  popup could be FAKED by a hacker. Only your server talking
  directly to Razorpay can confirm the payment is genuine.

  FIRST PRINCIPLE — The sticky payment state:
  ────────────────────────────────────────────
  Notice the `payment` state variable. When the user clicks
  "Pay Online," it doesn't immediately open Razorpay. Instead:
    1. Click "Pay Online" → setPayment(appointmentId)
    2. This shows the Razorpay logo button instead of "Pay Online"
    3. Click the Razorpay logo → actually open the payment popup

  This two-click design prevents ACCIDENTAL payment popups.
  The user must confirm twice: once to reveal the payment option,
  once to actually pay. It's a UX pattern for potentially
  dangerous actions.

  AUDIT NOTES:
  [!] DUPLICATE DATA SOURCE: There are TWO effects that
      set appointments:
      1. getUserAppointments() fetches REAL appointments from API
      2. A second useEffect generates FAKE appointments from doctors
      The second effect OVERWRITES the first! Line 108-125 generates
      mock data that replaces real API data. This looks like
      leftover development/debugging code that should be removed.

  [!] RAZORPAY KEY EXPOSURE: The Razorpay Key ID is read from
      import.meta.env.VITE_RAZORPAY_KEY_ID and included in the
      frontend bundle. This is INTENTIONAL — Razorpay's key ID
      is public (it identifies your account in the browser).
      But if you accidentally use VITE_RAZORPAY_KEY_SECRET here,
      that would be a critical security breach.

  [!] window.Razorpay: This depends on Razorpay's script being
      loaded globally (via a <script> tag in index.html). If the
      script fails to load, window.Razorpay is undefined and the
      payment silently fails. No error handling for this case.

  [!] The `simulateStripe` and `simulateRazorpay` functions on
      lines 130-131 are dead code — never called. The README
      mentions Stripe but there's no Stripe integration in the
      actual code, only Razorpay.
*/

import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const MyAppointments = () => {
  const { backendUrl, token, getDoctorsData } = useContext(AppContext)
  const navigate = useNavigate()
  const { doctors } = useContext(AppContext)
  const [appointments, setAppointments] = useState([])
  const [payment, setPayment] = useState('')
  /*
     Tracks which appointment the user wants to pay for.
     Empty string '' = no appointment selected for payment.
     When set to an appointment ID, that appointment's
     "Pay Online" button becomes the Razorpay logo.
  */

  const months = [" ", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  /*
     Index 0 is a space (used as placeholder so January = index 1).
     This is because slotDate month numbers are 1-based.
  */

  const slotDateFormat = (slotDate) => {
    const [day, month, year] = slotDate.split('_')
    return `${day} ${months[Number(month)]} ${year}`
    /*
       Converts "15_6_2025" → "15 Jun 2025".
       Uses array destructuring to split the date string.
    */
  }

  // Getting User Appointments Data Using API
  const getUserAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
      setAppointments(data.appointments.reverse())
      /*
         .reverse() puts newest appointments first.
         This mutates the array from the API response.
         Safer: [...data.appointments].reverse()
      */
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  // Function to cancel appointment Using API
  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })
      if (data.success) {
        toast.success(data.message)
        getUserAppointments()  // Refresh the list
        getDoctorsData()       // Refresh doctor availability
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  /*
     initPay configures and opens the Razorpay payment popup.
     The `order` parameter comes from your backend's paymentRazorpay API.
  */
  const initPay = (order) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      /*
         Razorpay Key ID — PUBLIC, identifies your Razorpay account.
         This is safe to include in frontend code.
      */
      amount: order.amount,
      currency: order.currency,
      name: 'Appointment Payment',
      description: "Appointment Payment",
      order_id: order.id,
      receipt: order.receipt,
      /*
         receipt = appointment MongoDB ID (set by backend).
         Used for verification later.
      */
      handler: async (response) => {
        /*
           This function is called by Razorpay AFTER the user
           completes payment in the popup. The `response` object
           contains razorpay_order_id, razorpay_payment_id, and
           razorpay_signature.

           We send this to OUR backend for VERIFICATION.
        */
        console.log(response)
        try {
          const { data } = await axios.post(backendUrl + "/api/user/verifyRazorpay", response, { headers: { token } });
          if (data.success) {
            navigate('/my-appointments')
            getUserAppointments()
          }
        } catch (error) {
          console.log(error)
          toast.error(error.message)
        }
      }
    };
    const rzp = new window.Razorpay(options);
    /*
       window.Razorpay is the global Razorpay SDK loaded via
       <script> tag in index.html. This creates a Razorpay
       instance and calls .open() to show the payment popup.
    */
    rzp.open();
  }

  // First step: create a Razorpay order via your backend
  const appointmentRazorpay = async (appointmentId) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/user/payment-razorpay', { appointmentId }, { headers: { token } })
      if (data.success) {
        initPay(data.order)
        /*
           data.order contains { id, amount, currency, receipt }
           from Razorpay. Pass it to initPay to open the popup.
        */
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (token) {
      getUserAppointments()
    }
  }, [token])


  return (
    <div>
      <p className='pb-3 mt-12 text-lg font-medium text-gray-600 border-b'>My appointments</p>
      <div className=''>
        {appointments.map((item, index) => (
          <div key={index} className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-4 border-b'>
            <div>
              <img className='w-36 bg-[#EAEFFF]' src={item.docData.image} alt="" />
            </div>
            <div className='flex-1 text-sm text-[#5E5E5E]'>
              <p className='text-[#262626] text-base font-semibold'>{item.docData.name}</p>
              <p>{item.docData.speciality}</p>
              <p className='text-[#464646] font-medium mt-1'>Address:</p>
              <p className=''>{item.docData.address.line1}</p>
              <p className=''>{item.docData.address.line2}</p>
              <p className=' mt-1'><span className='text-sm text-[#3C3C3C] font-medium'>Date & Time:</span> {slotDateFormat(item.slotDate)} |  {item.slotTime}</p>
            </div>
            <div></div>
            <div className='flex flex-col gap-2 justify-end text-sm text-center'>
              {/*
                 The button logic below is a STATE MACHINE for appointment actions:
                 - Not cancelled/paid/completed + no payment selected → "Pay Online"
                 - Not cancelled/paid/completed + payment selected → Razorpay logo
                 - Paid but not completed → "Paid" (disabled)
                 - Completed → "Completed" (green, disabled)
                 - Not cancelled + not completed → "Cancel appointment"
                 - Cancelled → "Appointment cancelled" (red, disabled)
              */}
              {!item.cancelled && !item.payment && !item.isCompleted && payment !== item._id &&
                <button onClick={() => setPayment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-primary hover:text-white transition-all duration-300'>Pay Online</button>
              }
              {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id &&
                <button onClick={() => appointmentRazorpay(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.razorpay_logo} alt="" /></button>
              }
              {!item.cancelled && item.payment && !item.isCompleted &&
                <button className='sm:min-w-48 py-2 border rounded text-[#696969]  bg-[#EAEFFF]'>Paid</button>
              }
              {item.isCompleted &&
                <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500'>Completed</button>
              }
              {!item.cancelled && !item.isCompleted &&
                <button onClick={() => cancelAppointment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300'>Cancel appointment</button>
              }
              {item.cancelled && !item.isCompleted &&
                <button className='sm:min-w-48 py-2 border border-red-500 rounded text-red-500'>Appointment cancelled</button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyAppointments

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: pages/MyProfile.jsx                             │
  │                                                             │
  │  The user's profile page — edit name, phone, address,       │
  │  upload profile picture.                                    │
  └─────────────────────────────────────────────────────────────┘
*/
