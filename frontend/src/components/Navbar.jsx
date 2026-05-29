/*
╔══════════════════════════════════════════════════════════════╗
║              frontend/src/components/Navbar.jsx              ║
║        "The top bar — navigation, login state, branding"     ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: AppContext — the shared data store.
  Now: Navbar — the first component that CONSUMES that data.

  FIRST PRINCIPLE — What is a React Component?
  ────────────────────────────────────────────
  A component is a FUNCTION that returns JSX (HTML-like syntax).
  React calls this function, gets the JSX, and converts it to
  real DOM elements. When state changes, React calls the function
  AGAIN and efficiently updates only the parts of the DOM that
  changed (this is called "reconciliation").

  Components are the building blocks. Like LEGO: Navbar is one
  brick, Footer is another, Home page is a brick made of smaller
  bricks (Header, SpecialityMenu, TopDoctors).

  WHAT THIS COMPONENT DOES:
  ─────────────────────────
  1. Shows the logo (clickable, goes to home)
  2. Shows navigation links (HOME, ALL DOCTORS, ABOUT, CONTACT)
  3. Shows "Admin Panel" button (only on the home page)
  4. Shows user profile dropdown OR "Create Account" button
     (depending on whether the user is logged in)
  5. Shows a mobile hamburger menu

  FIRST PRINCIPLE — Conditional rendering:
  ────────────────────────────────────────
  {token && userData ? <logged-in-view> : <logged-out-view>}

  This is a TERNARY operator: condition ? value_if_true : value_if_false.
  In JSX, {} means "this is JavaScript, evaluate it."

  The Navbar REACTS to login state changes. When the user logs in,
  `token` and `userData` are set in AppContext → Navbar re-renders
  → the "Create Account" button becomes a profile picture. No
  page reload needed!

  AUDIT NOTES:
  [!] The Admin Panel button uses window.open() with a hardcoded
      URL. If the admin panel is redeployed to a different URL,
      this breaks. Should be an environment variable.
  [!] The logout function sets token to `false` (boolean) instead
      of `''` (empty string). The initial state is `''`. This
      inconsistency could cause subtle bugs — always use the same
      type for state values.
  [!] When the user logs in (token becomes truthy), useEffect in
      AppContext fetches userData. But there's a brief moment where
      token is set but userData is still false. During this gap,
      the navbar briefly shows "Create Account" then switches.
      A loading state would be smoother.
*/

import React, { useContext, useState } from 'react'
import { assets } from '../assets/assets'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)
  const { token, setToken, userData } = useContext(AppContext)
  /*
     useContext(AppContext) extracts values from the context.
     This is how Navbar "subscribes" to changes in token/userData.
     When setToken is called anywhere, this Navbar re-renders.
  */

  const logout = () => {
    localStorage.removeItem('token')
    setToken(false)
    navigate('/login')
  }

  return (
    <div className='flex items-center justify-between text-sm pt-2 pb-0 border-b border-b-gray-400'>
      <div className="w-28 h-28 overflow-hidden">
        <img
          onClick={() => navigate('/')}
          src={assets.logo || '/fallback-logo.png'}
          alt="Logo"
          className="w-full h-full object-cover object-center cursor-pointer"
        />
      </div>

      <ul className='hidden md:flex items-start gap-5 font-medium'>
        <li className='pb-0.5'>
          <NavLink to='/' className={({ isActive }) => isActive ? 'border-b-2 border-primary' : ''}>
            HOME
          </NavLink>
          {/*
             NavLink is like <a> but with routing superpowers.
             The className function receives { isActive } —
             true if the current URL matches this link.
             This is how the "active tab" underline works.
          */}
        </li>
        <li className='pb-0.5'>
          <NavLink to='/doctors' className={({ isActive }) => isActive ? 'border-b-2 border-primary' : ''}>ALL DOCTORS</NavLink>
        </li>
        <li className='pb-0.5'>
          <NavLink to='/about' className={({ isActive }) => isActive ? 'border-b-2 border-primary' : ''}>ABOUT</NavLink>
        </li>
        <li className='pb-0.5'>
          <NavLink to='/contact' className={({ isActive }) => isActive ? 'border-b-2 border-primary' : ''}>CONTACT</NavLink>
        </li>
      </ul>

      <div className='flex items-center gap-4'>

        {/* Admin Panel Button — only on the home page */}
        {location.pathname === '/' && (
          <button
            onClick={() => window.open('https://admin-alpha-rust-65.vercel.app', '_blank')}
            className='bg-primary text-white text-xs px-4 py-2 rounded-full hover:bg-gray-700 hidden md:block'
          >
            Admin Panel
          </button>
        )}

        {token && userData ? (
          // ---- LOGGED IN VIEW: profile picture with dropdown ----
          <div className='flex items-center gap-2 cursor-pointer group relative'>
            <img className='w-12 rounded-full' src={userData.image || '/fallback-user.png'} alt="profile" />
            <img className='w-2.5' src={assets.dropdown_icon || '/fallback-icon.png'} alt="dropdown" />
            <div className='absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20 hidden group-hover:block'>
              {/*
                 CSS-only dropdown! The "group" on parent + "group-hover:block"
                 on this div means: "show this div when hovering over parent."
                 No JavaScript needed — pure CSS.
              */}
              <div className='min-w-48 bg-stone-100 rounded flex flex-col gap-4 p-4'>
                <p onClick={() => navigate('my-profile')} className='hover:text-black cursor-pointer'>My Profile</p>
                <p onClick={() => navigate('my-appointments')} className='hover:text-black cursor-pointer'>My Appointments</p>
                <p onClick={logout} className='hover:text-black cursor-pointer'>Logout</p>
              </div>
            </div>
          </div>
        ) : (
          // ---- LOGGED OUT VIEW: Create Account button ----
          <button
            onClick={() => navigate('/login')}
            className='bg-primary text-white px-8 py-3 rounded-full font-light hidden md:block'
          >
            Create Account
          </button>
        )}

        {/* Mobile hamburger menu icon */}
        <img onClick={() => setShowMenu(true)} className='w-6 md:hidden' src={assets.menu_icon} alt="" />

        {/* ---- Mobile Menu ---- */}
        <div className={`md:hidden ${showMenu ? 'fixed w-full' : 'h-0 w-0'} right-0 top-0 bottom-0 z-20 overflow-hidden bg-white transition-all`}>
          <div className='flex items-center justify-between px-5 py-6'>
            <img src={assets.logo} className='w-36' alt="" />
            <img onClick={() => setShowMenu(false)} src={assets.cross_icon} className='w-7' alt="" />
          </div>
          <ul className='flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium'>
            <NavLink onClick={() => setShowMenu(false)} to='/'><p className='px-4 py-2 rounded full inline-block'>HOME</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/doctors' ><p className='px-4 py-2 rounded full inline-block'>ALL DOCTORS</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/about' ><p className='px-4 py-2 rounded full inline-block'>ABOUT</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/contact' ><p className='px-4 py-2 rounded full inline-block'>CONTACT</p></NavLink>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Navbar

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: pages/Home.jsx → then components/Header.jsx     │
  │                                                             │
  │  The Navbar is on every page. Now let's see what appears    │
  │  on the HOME PAGE — the first thing users see.              │
  └─────────────────────────────────────────────────────────────┘
*/
