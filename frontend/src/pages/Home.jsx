/*
╔══════════════════════════════════════════════════════════════╗
║              frontend/src/pages/Home.jsx                     ║
║        "The landing page — first impression"                 ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: Navbar.jsx — top navigation.
  Now: Home page. This is a COMPOSITION component — it doesn't
  have much logic itself, it ASSEMBLES other components.

  FIRST PRINCIPLE — Composition over complexity:
  ──────────────────────────────────────────────
  Instead of one giant Home.jsx with 500 lines, the page is
  split into focused, reusable pieces:
    Header        → hero banner with CTA (Call To Action)
    SpecialityMenu → filter by medical specialty
    TopDoctors    → grid of top doctor cards
    Banner        → promotional section

  Each piece does ONE thing. This is the Single Responsibility
  Principle: a component should have exactly one reason to change.

  Home.jsx is the "orchestrator" — it arranges the pieces in order.
*/

import React from 'react'
import Header from '../components/Header'
import SpecialityMenu from '../components/SpecialityMenu'
import TopDoctors from '../components/TopDoctors'
import Banner from '../components/Banner'


const Home = () => {
  return (
    <div>
      <Header />
      <SpecialityMenu />
      <TopDoctors />
      <Banner />
    </div>
  )
}

export default Home

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: components/Header.jsx                           │
  │                                                             │
  │  The first section of the home page — the hero banner       │
  │  with "Book Appointment With Trusted Doctors."              │
  └─────────────────────────────────────────────────────────────┘
*/
