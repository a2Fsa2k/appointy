/*
╔══════════════════════════════════════════════════════════════╗
║                 admin/src/main.jsx                           ║
║        "Entry point for the admin/doctor dashboard"          ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: The main frontend (patient-facing app).
  Now: The ADMIN PANEL — a SEPARATE React app for admins and doctors.

  WHY A SEPARATE APP?
  ───────────────────
  The admin panel is a completely different React application from
  the patient frontend. They have:
    - Separate index.html files
    - Separate vite.config.js
    - Separate package.json
    - Separate deployments (different Vercel URLs)

  The patient app: https://appointy-roan.vercel.app/
  The admin app:   https://appointy-six.vercel.app/

  They share the SAME backend API. Both call /api/admin/* and
  /api/doctor/* endpoints on the same server.

  THREE CONTEXT PROVIDERS:
  ────────────────────────
  Notice there are THREE nested providers (vs one in the patient app):
    AdminContextProvider  → admin token, dashboard data, doctor management
    DoctorContextProvider → doctor token, appointments, profile
    AppContextProvider    → shared utilities (date formatting, currency)

  Why three? Because this one app serves TWO roles (admin AND doctor),
  each with their own state, token storage, and API calls.
*/

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import AdminContextProvider from './context/AdminContext.jsx'
import DoctorContextProvider from './context/DoctorContext.jsx'
import AppContextProvider from './context/AppContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AdminContextProvider>
      <DoctorContextProvider>
        <AppContextProvider>
          <App />
        </AppContextProvider>
      </DoctorContextProvider>
    </AdminContextProvider>
  </BrowserRouter>,
)

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: App.jsx                                         │
  │                                                             │
  │  The admin panel router — but with a TWIST: it switches     │
  │  between admin layout, doctor layout, and login screen      │
  │  based on which token is present.                           │
  └─────────────────────────────────────────────────────────────┘
*/
