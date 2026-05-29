/*
╔══════════════════════════════════════════════════════════════╗
║          admin/src/context/DoctorContext.jsx                 ║
║  "Doctor's global state — appointments, dashboard, profile"  ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: AdminContext.
  Now: DoctorContext — the doctor's data layer.

  KEY DIFFERENCE — authHeader pattern:
  ─────────────────────────────────────
  While AdminContext uses `{ headers: { aToken } }` (custom header),
  DoctorContext uses a STANDARD Authorization header:

  const authHeader = {
    headers: {
      Authorization: `Bearer ${dToken}`,
    },
  };

  This is the CORRECT way to send auth tokens in HTTP. The
  "Bearer" scheme tells the server HOW to interpret the token.
  The authDoctor middleware expects this format.

  Why the inconsistency? The admin routes were built first (using
  custom header). The doctor routes were built later and followed
  the standard. Both work, but the doctor approach is better.

  FUNCTIONS:
    getAppointments()     → fetch THIS doctor's appointments
    completeAppointment() → mark appointment as done
    cancelAppointment()   → cancel an appointment
    getDashData()         → fetch earnings + patient stats
    getProfileData()      → fetch doctor's own profile

  AUDIT NOTES:
  [!] console.log of data.dashData and data.profileData are
      leftover debug statements — should be removed in production.
  [!] The dToken is stored in localStorage, same XSS vulnerability
      as the patient app.
*/

import { createContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const DoctorContext = createContext();

const DoctorContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [dToken, setDToken] = useState(
    localStorage.getItem("dToken") || ""
  );
  const [appointments, setAppointments] = useState([]);
  const [dashData, setDashData] = useState(false);
  const [profileData, setProfileData] = useState(false);

  const authHeader = {
    headers: {
      Authorization: `Bearer ${dToken}`,
    },
  };
  /*
     Centralized auth header object. Instead of writing
     { headers: { Authorization: `Bearer ${dToken}` } }
     in every function, this is defined once and reused.
     This is DRY (Don't Repeat Yourself) in action.
  */

  const getAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/appointments", authHeader);
      if (data.success) {
        setAppointments(data.appointments.reverse());
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const completeAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(backendUrl + "/api/doctor/complete-appointment", { appointmentId }, authHeader);
      if (data.success) {
        toast.success(data.message);
        getAppointments();  // Refresh list
        getDashData();      // Refresh dashboard (earnings change)
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(backendUrl + "/api/doctor/cancel-appointment", { appointmentId }, authHeader);
      if (data.success) {
        toast.success(data.message);
        getAppointments();
        getDashData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const getDashData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/dashboard", authHeader);
      if (data.success) {
        setDashData(data.dashData);
        console.log(data.dashData); // DEBUG LEFTOVER
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const getProfileData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/profile", authHeader);
      if (data.success) {
        setProfileData(data.profileData);
        console.log(data.profileData); // DEBUG LEFTOVER
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const value = {
    dToken, setDToken, backendUrl,
    getAppointments, appointments, setAppointments,
    completeAppointment, cancelAppointment,
    getDashData, dashData, setDashData,
    getProfileData, setProfileData, profileData,
  };

  return (
    <DoctorContext.Provider value={value}>
      {props.children}
    </DoctorContext.Provider>
  );
};

export default DoctorContextProvider;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: components/Navbar.jsx (admin)                   │
  │                                                             │
  │  The admin/doctor navbar — shows role label, "User Panel"   │
  │  button, and logout.                                        │
  └─────────────────────────────────────────────────────────────┘
*/
