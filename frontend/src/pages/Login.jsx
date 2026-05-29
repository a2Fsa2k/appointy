/*
╔══════════════════════════════════════════════════════════════╗
║              frontend/src/pages/Login.jsx                    ║
║        "Sign Up and Login — the gateway to the app"          ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: Home page + its sub-components.
  Now: The Login/SignUp page. This is where the authentication
  FLOW starts — it's the bridge between "browsing" and "using."

  FIRST PRINCIPLE — The SINGLE form pattern:
  ───────────────────────────────────────────
  This ONE component handles BOTH "Sign Up" and "Login" modes.
  A state variable `state` toggles between them:
    state === 'Sign Up' → shows name field, calls /register API
    state === 'Login'   → hides name field, calls /login API

  Why one component instead of two? Because they share 90% of
  the same UI (email + password fields, styling, error handling).
  The DRY principle (Don't Repeat Yourself).

  THE AUTHENTICATION FLOW:
  ────────────────────────
  1. User fills form → clicks submit
  2. onSubmitHandler fires → calls axios.post(backend + '/api/user/register' OR '/login')
  3. Backend validates → hashes password (if registering) → creates JWT
  4. Frontend receives { success: true, token: "eyJ..." }
  5. Token saved to localStorage (survives page refresh)
  6. setToken(data.token) is called → AppContext updates
  7. useEffect sees token changed → navigates to home page

  Why is step 7 automatic? Because of this code:
    useEffect(() => { if (token) navigate('/') }, [token])
  This says: "whenever token becomes truthy, go to the home page."
  The login form disappears and the user is now "inside" the app.

  AUDIT NOTES:
  [!] NO LOADING STATE: There's no "Logging in..." spinner or
      disabled button while the API call is in progress. A user
      could click submit multiple times, triggering duplicate
      registrations. The button should be disabled during the
      API call.
  [!] NO RATE LIMITING: A malicious user could call the register
      endpoint thousands of times. The backend should have rate
      limiting, but the frontend should also debounce/deduplicate.
  [!] PASSWORD VISIBILITY: No "show password" toggle. This is a
      UX issue — users can't verify what they typed.
  [!] CLIENT-SIDE VALIDATION: The only validation is HTML5
      `required` attribute. No email format check or password
      strength meter on the frontend. The backend validates,
      but client-side validation gives instant feedback.
*/

import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const Login = () => {
  const { backendUrl, token, setToken } = useContext(AppContext)
  const [state, setState] = useState('Sign Up')
  /*
     'Sign Up' = registration mode (default)
     'Login'   = login mode
     Simple string toggle — no boolean needed.
  */

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  /*
     Each input has its own state. This is called "controlled
     components" — React state IS the input value. The <input>
     has `value={email}` and `onChange={(e) => setEmail(e.target.value)}`.
     React is the single source of truth for what's in the input.
  */

  const navigate = useNavigate()

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    /*
       preventDefault() stops the browser from doing its default
       form behavior: reloading the page. Without this, the page
       would refresh and we'd lose all state. React apps NEVER
       want page reloads for form submissions.
    */
    try{
    if (state === 'Sign Up') {

      const { data } = await axios.post(backendUrl + '/api/user/register', { name, email, password })
      /*
         Axios sends a POST request with JSON body { name, email, password }.
         The backend's registerUser function processes this.
         Axios automatically sets Content-Type: application/json.
      */

      if (data.success) {
        localStorage.setItem('token', data.token)
        /*
           Save to localStorage so the token survives page refresh.
           key: 'token', value: the JWT string.
        */
        setToken(data.token)
        /*
           This updates AppContext.token → Navbar re-renders →
           shows profile picture instead of "Create Account."
        */
      } else {
        toast.error(data.message)
      }

    } else {

      const { data } = await axios.post(backendUrl + '/api/user/login', { email, password })
      /*
         Login only sends email + password (no name needed).
         The { email, password } is shorthand for { email: email, password: password }.
      */

      if (data.success) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
      } else {
        toast.error(data.message)
      }

    }}catch(error){
      toast.error(error.message)
      /*
         This catch handles NETWORK errors (server down, no internet).
         The try block's if/else handles APPLICATION errors
         (wrong password, missing fields).
      */
    }

  }

  useEffect(() => {
    if (token) {
      navigate('/')
    }
  }, [token])
  /*
     After login succeeds and token is set, this effect fires
     and redirects to the home page. The [token] dependency means
     it only runs when token changes.
  */

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
        <p className='text-2xl font-semibold'>{state === 'Sign Up' ? 'Create Account' : 'Login'}</p>
        <p>Please {state === 'Sign Up' ? 'sign up' : 'log in'} to book appointment</p>
        {state === 'Sign Up'
          ? <div className='w-full '>
            <p>Full Name</p>
            <input onChange={(e) => setName(e.target.value)} value={name} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="text" required />
          </div>
          : null
        }
        {/*
           The name field only appears in Sign Up mode.
           In Login mode, it renders `null` (nothing).
        */}
        <div className='w-full '>
          <p>Email</p>
          <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
        </div>
        <div className='w-full '>
          <p>Password</p>
          <input onChange={(e) => setPassword(e.target.value)} value={password} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="password" required />
        </div>
        <button type='submit' className='bg-primary text-white w-full py-2 my-2 rounded-md text-base'>
          {state === 'Sign Up' ? 'Create account' : 'Login'}
        </button>
        {state === 'Sign Up'
          ? <p>Already have an account? <span onClick={() => setState('Login')} className='text-primary underline cursor-pointer'>Login here</span></p>
          : <p>Create an new account? <span onClick={() => setState('Sign Up')} className='text-primary underline cursor-pointer'>Click here</span></p>
        }
      </div>
    </form>
  )
}

export default Login

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: pages/Doctors.jsx                               │
  │                                                             │
  │  Now that a user can log in, let's see how they BROWSE      │
  │  doctors and filter by specialty.                           │
  └─────────────────────────────────────────────────────────────┘
*/
