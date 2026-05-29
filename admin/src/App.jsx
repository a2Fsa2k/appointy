/*
╔══════════════════════════════════════════════════════════════╗
║                 admin/src/App.jsx                            ║
║    "The dual-role router — admin OR doctor, one app"         ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: main.jsx — three context providers.
  Now: The App component with ROLE-BASED routing.

  This is the most architecturally interesting file in the admin
  panel. ONE React app serves TWO completely different user roles
  (Admin and Doctor) PLUS the login screen.

  THE THREE RETURN PATHS:
  ───────────────────────
  This component has THREE different return statements, each
  returning a completely different layout:

  PATH 1: if (aToken) → ADMIN LAYOUT
    - Shows Navbar (with "Admin" label)
    - Shows Sidebar (with admin links: Dashboard, Appointments,
      Add Doctor, Doctors List)
    - Routes to admin pages

  PATH 2: if (dToken) → DOCTOR LAYOUT
    - Shows Navbar (with "Doctor" label)
    - Shows Sidebar (with doctor links: Dashboard, Appointments,
      Profile)
    - Routes to doctor pages

  PATH 3: No token → LOGIN SCREEN
    - No Navbar, no Sidebar
    - Just the Login component

  FIRST PRINCIPLE — How does it know which role?
  ──────────────────────────────────────────────
  The login page sets EITHER aToken (if admin logs in) or
  dToken (if doctor logs in). These are stored in separate
  localStorage keys: 'aToken' and 'dToken'.

  On page load, AdminContext reads 'aToken' from localStorage
  and DoctorContext reads 'dToken'. One will have a value and
  the other will be empty. The App component checks both and
  renders the appropriate layout.

  THE REDIRECT MAGIC:
  ───────────────────
  if (location.pathname === '/') {
    if (aToken) return <Navigate to="/admin-dashboard" replace />
    if (dToken) return <Navigate to="/doctor-dashboard" replace />
  }

  When someone visits the base URL, they're auto-redirected
  based on their role. Admin goes to admin dashboard, doctor
  goes to doctor dashboard.

  AUDIT NOTES:
  [!] If BOTH tokens exist (edge case: someone logged in as
      admin, then as doctor without logging out admin), admin
      takes priority because it's checked FIRST.
  [!] No explicit logout clears both tokens. The logout in Navbar
      only clears the CURRENT role's token. If you somehow have
      both, one survives.
  [!] The wildcard <Route path="*"> redirects unknown URLs to
      the role's dashboard rather than showing a 404 page.
      This hides broken links but also confuses users who
      type wrong URLs.
*/

import React, { useContext, useEffect } from 'react'
import { DoctorContext } from './context/DoctorContext'
import { AdminContext } from './context/AdminContext'
import { Route, Routes, Navigate, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Admin/Dashboard'
import AllAppointments from './pages/Admin/AllAppointments'
import AddDoctor from './pages/Admin/AddDoctor'
import DoctorsList from './pages/Admin/DoctorsList'
import Login from './pages/Login'
import DoctorAppointments from './pages/Doctor/DoctorAppointments'
import DoctorDashboard from './pages/Doctor/DoctorDashboard'
import DoctorProfile from './pages/Doctor/DoctorProfile'

const App = () => {
  const { dToken } = useContext(DoctorContext)
  const { aToken } = useContext(AdminContext)
  const location = useLocation()

  // Redirect "/" to the proper dashboard based on role
  if (location.pathname === '/') {
    if (aToken) return <Navigate to="/admin-dashboard" replace />
    if (dToken) return <Navigate to="/doctor-dashboard" replace />
  }

  // ============ ADMIN LAYOUT ============
  if (aToken) {
    return (
      <div className='bg-[#F8F9FD]'>
        <ToastContainer />
        <Navbar />
        <div className='flex items-start'>
          <Sidebar />
          <Routes>
            <Route path="/admin-dashboard" element={<Dashboard />} />
            <Route path="/all-appointments" element={<AllAppointments />} />
            <Route path="/add-doctor" element={<AddDoctor />} />
            <Route path="/doctor-list" element={<DoctorsList />} />
            <Route path="*" element={<Navigate to="/admin-dashboard" />} />
            {/*
               Catch-all: any unknown URL redirects to dashboard.
               This prevents blank pages but masks typos.
            */}
          </Routes>
        </div>
      </div>
    )
  }

  // ============ DOCTOR LAYOUT ============
  if (dToken) {
    return (
      <div className='bg-[#F8F9FD]'>
        <ToastContainer />
        <Navbar />
        <div className='flex items-start'>
          <Sidebar />
          <Routes>
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor-appointments" element={<DoctorAppointments />} />
            <Route path="/doctor-profile" element={<DoctorProfile />} />
            <Route path="*" element={<Navigate to="/doctor-dashboard" />} />
          </Routes>
        </div>
      </div>
    )
  }

  // ============ NO ONE LOGGED IN ============
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="*" element={<Navigate to="/" />} />
        {/*
           Any URL visited without being logged in → redirect to login.
        */}
      </Routes>
    </>
  )
}

export default App

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: context/AppContext.jsx (admin)                  │
  │                                                             │
  │  The shared utility context — date formatting, currency,    │
  │  age calculation. Used by both admin and doctor pages.      │
  └─────────────────────────────────────────────────────────────┘
*/
