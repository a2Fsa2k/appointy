/*
  admin/src/pages/Login.jsx — Admin/Doctor login with role toggle.

  Same pattern as the patient Login page but with a ROLE SELECTOR
  instead of Sign Up/Login toggle. The `state` variable is 'Admin'
  or 'Doctor' — it determines which API endpoint to call:
    Admin:  POST /api/admin/login
    Doctor: POST /api/doctor/login

  On success, the token is saved to different localStorage keys:
    Admin:  localStorage.setItem('aToken', data.token)
    Doctor: localStorage.setItem('dToken', data.token)

  And different context setters are called:
    Admin:  setAToken(data.token)
    Doctor: setDToken(data.token)

  This is how App.jsx knows WHICH role logged in — it checks
  which context has a truthy token value.

  AUDIT NOTE: Same issues as the patient Login — no loading state,
  no rate limiting, no password visibility toggle.
*/

import axios from 'axios'
import React, { useContext, useState } from 'react'
import { DoctorContext } from '../context/DoctorContext'
import { AdminContext } from '../context/AdminContext'
import { toast } from 'react-toastify'

const Login = () => {
  const [state, setState] = useState('Admin') // 'Admin' or 'Doctor'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const { setDToken } = useContext(DoctorContext)
  const { setAToken } = useContext(AdminContext)

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (state === 'Admin') {
      const { data } = await axios.post(backendUrl + '/api/admin/login', { email, password })
      if (data.success) {
        setAToken(data.token)
        localStorage.setItem('aToken', data.token)
      } else {
        toast.error(data.message)
      }
    } else {
      const { data } = await axios.post(backendUrl + '/api/doctor/login', { email, password })
      if (data.success) {
        setDToken(data.token)
        localStorage.setItem('dToken', data.token)
      } else {
        toast.error(data.message)
      }
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
        <p className='text-2xl font-semibold m-auto'><span className='text-primary'>{state}</span> Login</p>
        <div className='w-full '>
          <p>Email</p>
          <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
        </div>
        <div className='w-full '>
          <p>Password</p>
          <input onChange={(e) => setPassword(e.target.value)} value={password} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="password" required />
        </div>
        <button className='bg-primary text-white w-full py-2 rounded-md text-base'>Login</button>
        {
          state === 'Admin'
            ? <p>Doctor Login? <span onClick={() => setState('Doctor')} className='text-primary underline cursor-pointer'>Click here</span></p>
            : <p>Admin Login? <span onClick={() => setState('Admin')} className='text-primary underline cursor-pointer'>Click here</span></p>
        }
      </div>
    </form>
  )
}

export default Login

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: pages/Admin/Dashboard.jsx                       │
  │                                                             │
  │  The admin dashboard — stats cards + latest bookings list.  │
  └─────────────────────────────────────────────────────────────┘
*/
