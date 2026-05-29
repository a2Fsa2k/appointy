/*
  admin/src/context/AppContext.jsx — Shared utilities for admin panel.
  This is much SIMPLER than the patient app's AppContext.

  It only provides:
    - slotDateFormat: converts "15_6_2025" → "15 Jun 2025"
    - calculateAge:   converts a DOB string to age number
    - currency:       the currency symbol from .env

  These are PURE utility functions — no API calls, no state
  management. They're shared between admin and doctor views
  (both need to format dates and calculate patient ages).

  The months array has " " at index 0 as a placeholder because
  slotDate months are 1-based (January = 1, not 0).
*/

import { createContext } from "react";

export const AppContext = createContext()

const AppContextProvider = (props) => {
    const currency = import.meta.env.VITE_CURRENCY
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const months = [" ","Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const slotDateFormat = (slotDate) => {
        const dateArray = slotDate.split('_')
        return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
    }

    const calculateAge = (dob) => {
        const today = new Date()
        const birthDate = new Date(dob)
        let age = today.getFullYear() - birthDate.getFullYear()
        return age
        // Simplified age calculation — doesn't account for month/day.
        // Full version would check if birthday has passed this year.
    }

    const value = {
        calculateAge, slotDateFormat, currency
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}
export default AppContextProvider

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: context/AdminContext.jsx                        │
  │                                                             │
  │  The admin's data store — doctor management, appointments,  │
  │  dashboard stats. All admin API calls live here.            │
  └─────────────────────────────────────────────────────────────┘
*/
