/*
╔══════════════════════════════════════════════════════════════╗
║              frontend/src/context/AppContext.jsx             ║
║        "The brain — shared data for all components"          ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: App.jsx — the page map.
  Now: AppContext — the SHARED MEMORY of the app.

  WHAT IS REACT CONTEXT?
  ──────────────────────
  Imagine a family group chat. Instead of each person calling
  every other person individually, you post once to the group
  and everyone sees it. React Context is that group chat.

  Without context: Parent passes data to Child, who passes to
  Grandchild (props drilling — tedious and fragile).

  With context: Any component can directly "tap in" and read
  the shared data using useContext(AppContext).

  WHAT DATA DOES THIS CONTEXT HOLD?
  ─────────────────────────────────
    doctors[]    → list of all doctors (fetched from backend)
    token        → JWT token (proves user is logged in)
    userData     → logged-in user's profile data
    currencySymbol → '₹' (Indian Rupee symbol)
    backendUrl   → the API server address (from .env)

  FIRST PRINCIPLE — useState:
  ────────────────────────────
  useState is React's way of saying "remember this value and
  re-render when it changes." It returns [value, setterFunction].

  Example: const [token, setToken] = useState(initialValue)
    - `token` is the current value
    - `setToken(newValue)` changes it and triggers a re-render
    - `initialValue` is what it starts as

  The magic: when you call setToken(), EVERY component that
  reads `token` through context automatically re-renders with
  the new value. You don't need to manually update anything.

  FIRST PRINCIPLE — localStorage:
  ────────────────────────────────
  localStorage is a key-value store that SURVIVES page refreshes.
  When the user logs in, we save the token to localStorage.
  When the page reloads, we check localStorage to see if a token
  exists (so the user stays logged in).

  localStorage vs sessionStorage:
    localStorage  → survives browser close (persistent login)
    sessionStorage → cleared when tab closes (temporary)

  AUDIT NOTES:
  [!] TOKEN IN LOCALSTORAGE: Storing JWTs in localStorage is
      vulnerable to Cross-Site Scripting (XSS) attacks. If an
      attacker injects JavaScript into the page, they can read
      localStorage.getItem('token') and steal the token.
      httpOnly cookies are more secure (JS can't read them).

  [!] AUTOMATIC RE-FETCH: loadUserProfileData() is called
      whenever `token` changes (via useEffect). This means
      if setToken is called multiple times, the profile is
      fetched each time. A debounce or guard would help.

  [!] DEFAULT VALUES: userData is initialized as `false` (boolean).
      This is unusual — normally it'd be `null`. The components
      check `userData ? ... : null` which works because false
      is falsy, but it's a confusing pattern.
*/

import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from 'axios'

export const AppContext = createContext()
/*
   createContext() creates the "group chat." Components subscribe
   with useContext(AppContext) to read the shared data.
*/

const AppContextProvider = (props) => {
    const currencySymbol = '₹'
    /*
       Hardcoded currency symbol. For multi-currency support,
       this would come from user preferences or locale detection.
    */
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    /*
       import.meta.env is Vite's way of reading .env files.
       VITE_BACKEND_URL is defined in .env (e.g., http://localhost:4000).
       In production, this would be the deployed backend URL.
    */

    const [doctors, setDoctors] = useState([])
    const [token, setToken] = useState(localStorage.getItem('token') || '')
    const [userData, setUserData] = useState(false)

    // Fetches ALL doctors from the backend public endpoint
    const getDoctorsData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/list')
            /*
               This calls the PUBLIC doctorList endpoint (no auth needed).
               The backend strips password and email from doctor data.
            */
            if (data.success) {
                setDoctors(data.doctors)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Fetches the logged-in user's profile from the backend
    const loadUserProfileData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/user/get-profile', {
                headers: { token }
            })
            /*
               This calls the PROTECTED getProfile endpoint.
               The `token` header is sent so authUser middleware
               can verify the user's identity.
            */

            if (data.success) {
                const safeUserData = {
                    ...data.userData,
                    address: data.userData.address || { line1: '', line2: '' },
                    gender: data.userData.gender || '',
                    dob: data.userData.dob || ''
                }
                /*
                   Defensive defaults — ensures address, gender, dob
                   always exist, even if the backend returns null/undefined.
                   Prevents "cannot read property line1 of undefined" errors.
                */
                setUserData(safeUserData)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    useEffect(() => {
        getDoctorsData()
    }, [])
    /*
       useEffect with empty [] runs ONCE when the app first loads.
       It fetches the doctor list so the home page can show
       doctor cards immediately.

       The [] means "no dependencies — only run on mount."
    */

    useEffect(() => {
        if (token) {
            loadUserProfileData()
        }
    }, [token])
    /*
       Runs whenever `token` changes. If token exists (user logged in),
       fetch their profile. If token is empty (logged out), skip.

       This is how the Navbar knows to show the user's profile picture
       instead of "Create Account" button — because userData is populated.
    */

    const value = {
        doctors, getDoctorsData,
        currencySymbol,
        backendUrl,
        token, setToken,
        userData, setUserData, loadUserProfileData
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
        /*
           Every component inside this Provider can access `value`
           by calling: const { token, doctors } = useContext(AppContext)
        */
    )
}

export default AppContextProvider

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: components/Navbar.jsx                           │
  │                                                             │
  │  The context provides the data. Now let's see the first     │
  │  component that USES it — the Navbar (top navigation bar).  │
  │  It shows different buttons based on login state.           │
  └─────────────────────────────────────────────────────────────┘
*/
