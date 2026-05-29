/*
╔══════════════════════════════════════════════════════════════╗
║                 frontend/src/App.jsx                         ║
║           "The map of the entire website"                    ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: main.jsx — the entry point that boots React.
  Now: App.jsx — the ROADMAP of the entire frontend.

  WHAT DOES THIS FILE DO?
  ───────────────────────
  It defines which COMPONENT appears at which URL. This is
  called "client-side routing." When a user clicks a link or
  types a URL, React Router intercepts it and shows the right
  page WITHOUT reloading the whole page (unlike traditional
  websites where every click reloads everything).

  FIRST PRINCIPLE — How does client-side routing work?
  ────────────────────────────────────────────────────
  Traditional routing: Each URL = a different HTML file on the server.
  Client-side routing:   All URLs load the SAME HTML file. JavaScript
                         looks at the URL and decides which component
                         to show.

  This is why React apps feel faster — only the changing part
  re-renders, not the entire page.

  THE PAGE MAP (URL → Component):
    /                        → Home page (hero, specialties, top doctors)
    /doctors                 → All doctors with filter
    /doctors/:speciality     → Doctors filtered by specialty
    /login                   → Login / sign up form
    /about                   → About page
    /contact                 → Contact page
    /my-profile              → User's profile (edit name, image, etc.)
    /my-appointments         → User's appointment list
    /appointment/:docId      → Book appointment with specific doctor

  Notice the `:speciality` and `:docId` — these are URL PARAMETERS.
  `:speciality` matches anything like "Dermatologist" or "Neurologist."
  `:docId` matches a MongoDB ID like "507f1f77bcf86cd799439011."
  The component extracts these with useParams() to know WHAT to display.

  THE LAYOUT:
  ───────────
  <div className='mx-4 sm:mx-[10%]'>  ← page margins
    <ToastContainer />                 ← popup notifications
    <Navbar />                         ← top navigation (always visible)
    <Routes>                           ← the page content (changes)
      ...routes...
    </Routes>
    <Footer />                         ← bottom footer (always visible)
  </div>

  Navbar and Footer are OUTSIDE <Routes> — they appear on EVERY page.
  Only the content inside <Routes> changes when you navigate.

  AUDIT NOTES:
  [!] The ToastContainer is rendered but its position isn't customized.
      It appears at the default position (top-right).
  [!] No 404/"Not Found" route. If someone visits /nonexistent,
      they see an empty page with just Navbar and Footer.
      Should add: <Route path="*" element={<NotFound />} />
  [!] No lazy loading. All page components are imported upfront,
      which means the browser downloads ALL page code on first load.
      React.lazy() + Suspense would load pages only when needed.
*/

import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Doctors from './pages/Doctors'
import Login from './pages/Login'
import About from './pages/About'
import Contact from './pages/Contact'
import MyProfile from './pages/MyProfile'
import MyAppointment from './pages/MyAppointment'
import Appointment from './Appointment'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
/*
   react-toastify is a notification library. It shows popup
   messages (success, error, warning). The ToastContainer is
   the invisible anchor point where these popups appear.
   Calling toast.success("message") anywhere in the app
   triggers a popup.
*/

const App = () => {
  return (
    <div className='mx-4 sm:mx-[10%]'>
      {/*
         mx-4 = horizontal margin of 1rem on small screens
         sm:mx-[10%] = 10% margin on screens wider than 640px
         This creates the centered content look with breathing room.
      */}
      <ToastContainer />
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/doctors' element={<Doctors />} />
        <Route path='/doctors/:speciality' element={<Doctors />} />
        {/*
           Two routes use the SAME component (Doctors)!
           The component checks if `speciality` exists to
           decide whether to show all doctors or filter.
        */}
        <Route path='/login' element={<Login />} />
        <Route path='/about' element={<About />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/my-profile' element={<MyProfile />} />
        <Route path='/my-appointments' element={<MyAppointment />} />
        <Route path='/appointment/:docId' element={<Appointment />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: context/AppContext.jsx                          │
  │                                                             │
  │  App.jsx defines WHAT pages exist. But HOW does each page   │
  │  know about the logged-in user, the list of doctors, and    │
  │  the backend URL? That's the AppContext — the GLOBAL STATE. │
  └─────────────────────────────────────────────────────────────┘
*/
