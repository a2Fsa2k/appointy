/*
  admin/src/components/Navbar.jsx — Admin/Doctor top bar.

  Shows:
    - Logo (clickable)
    - Role label ("Admin" or "Doctor")
    - "User Panel" button (links to the patient-facing app)
    - Logout button

  Dual-role awareness: reads BOTH aToken and dToken to determine
  which role label to show and which token to clear on logout.
  The logout function uses a short-circuit pattern:
    dToken && setDToken('') means "if dToken exists, clear it"
    aToken && setAToken('') means "if aToken exists, clear it"

  The "User Panel" button hardcodes the patient app URL.
  This creates a bridge between the admin and patient apps.

  AUDIT NOTE: window.location.href forces a full page navigation
  (loses all React state). Using a regular <a> tag with
  target="_blank" would be simpler and more semantic.
*/

import React, { useContext } from 'react'
import { assets } from '../assets/assets'
import { DoctorContext } from '../context/DoctorContext'
import { AdminContext } from '../context/AdminContext'
import { useNavigate, useLocation } from 'react-router-dom'

const Navbar = () => {
  const { dToken, setDToken } = useContext(DoctorContext)
  const { aToken, setAToken } = useContext(AdminContext)
  const navigate = useNavigate()
  const location = useLocation()

  const logout = () => {
    navigate('/')
    dToken && setDToken('')
    dToken && localStorage.removeItem('dToken')
    aToken && setAToken('')
    aToken && localStorage.removeItem('aToken')
    // Clears whichever token exists
  }

  const goToUserPanel = () => {
    window.location.href = 'https://appointy-roan.vercel.app/'
    // AUDIT: Hardcoded URL — should be an env variable
  }

  const isOnDashboard =
    location.pathname === '/admin-dashboard' ||
    location.pathname === '/doctor-dashboard'

  return (
    <div className='flex justify-between items-center px-4 sm:px-10 py-3 border-b bg-white'>
      <div className='flex items-center gap-3 text-xs'>
        <img onClick={() => navigate('/')} className='w-36 sm:w-40 cursor-pointer' src={assets.admin_logo} alt="Logo" />
        <p className='border px-2.5 py-0.5 rounded-full border-gray-500 text-gray-600'>
          {aToken ? 'Admin' : 'Doctor'}
        </p>
        {isOnDashboard && (
          <button onClick={goToUserPanel} className='ml-2 text-white bg-primary hover:bg-gray-700 px-3 py-1.5 rounded-full text-xs'>
            User Panel
          </button>
        )}
      </div>
      <button onClick={logout} className='bg-primary text-white text-sm px-10 py-2 rounded-full'>Logout</button>
    </div>
  )
}

export default Navbar
