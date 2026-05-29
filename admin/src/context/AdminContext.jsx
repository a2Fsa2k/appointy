/*
╔══════════════════════════════════════════════════════════════╗
║           admin/src/context/AdminContext.jsx                 ║
║   "Admin's global state — doctors, appointments, dashboard"  ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: AppContext — utility functions.
  Now: AdminContext — the admin's data and API calls.

  PATTERN: This context follows the SAME pattern as the patient
  app's AppContext: fetch data from backend, store in state,
  expose via context value. Each function is an API wrapper
  that updates state on success and shows toast on error.

  KEY DIFFERENCE FROM PATIENT APP:
  The admin uses `aToken` (not `token`). Admin token is stored
  in localStorage under a DIFFERENT key ('aToken' vs 'token').
  This is how the admin panel and patient app can coexist in
  the same browser without token conflicts.

  FUNCTIONS:
    getAllDoctors()     → fetch all doctors for doctor list page
    changeAvailability() → toggle a doctor's availability
    getAllAppointments() → fetch ALL appointments (not scoped)
    cancelAppointment()  → admin cancels any appointment
    getDashData()        → fetch dashboard statistics

  FIRST PRINCIPLE — Why store `aToken` in state AND localStorage?
  ──────────────────────────────────────────────────────────────
  localStorage survives page refreshes but doesn't trigger
  re-renders (it's not React state). useState triggers re-renders
  but doesn't survive refreshes. Using BOTH gives you:
    - Persistent login (localStorage)
    - Reactive UI updates (useState)

  The initial value reads from localStorage, and every time
  setAToken is called, it's also saved to localStorage.
*/

import axios from "axios";
import { createContext, useState } from "react";
import { toast } from "react-toastify";

export const AdminContext = createContext()

const AdminContextProvider = (props) => {
    const [aToken, setAToken] = useState(localStorage.getItem('aToken') ? localStorage.getItem('aToken') : '')
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [appointments, setAppointments] = useState([])
    const [doctors, setDoctors] = useState([])
    const [dashData, setDashData] = useState(false)

    const getAllDoctors = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/all-doctors', { headers: { aToken } })
            // aToken sent as a custom header — matches authAdmin middleware
            if (data.success) {
                setDoctors(data.doctors)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const changeAvailability = async (docId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/change-availability', { docId }, { headers: { aToken } })
            if (data.success) {
                toast.success(data.message)
                getAllDoctors() // Refresh the list after change
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    const getAllAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/appointments', { headers: { aToken } })
            if (data.success) {
                setAppointments(data.appointments.reverse())
                // .reverse() puts newest first (mutates the original array)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }
    }

    const cancelAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/cancel-appointment', { appointmentId }, { headers: { aToken } })
            if (data.success) {
                toast.success(data.message)
                getAllAppointments() // Refresh list
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }
    }

    const getDashData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/dashboard', { headers: { aToken } })
            if (data.success) {
                setDashData(data.dashData)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    const value = {
        aToken, setAToken,
        backendUrl, doctors,
        getAllDoctors, changeAvailability,
        appointments, setAppointments,
        getAllAppointments, cancelAppointment,
        getDashData, dashData
    }

    return (
        <AdminContext.Provider value={value}>
            {props.children}
        </AdminContext.Provider>
    )
}
export default AdminContextProvider

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: context/DoctorContext.jsx                       │
  │                                                             │
  │  The doctor's data store — same pattern, different APIs.    │
  │  Notice this uses Authorization Bearer header (standard),    │
  │  not a custom header like the admin context.                │
  └─────────────────────────────────────────────────────────────┘
*/
