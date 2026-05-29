/*
  pages/Admin/AllAppointments.jsx — Complete list of ALL appointments.

  Displays a table with all appointments across the entire system.
  Columns: #, Patient (with photo), Age, Date & Time, Doctor (with photo),
  Fees, Action (cancel icon or status label).

  Uses calculateAge and slotDateFormat from AppContext — the shared
  utility functions used throughout the admin panel.

  The grid layout uses CSS Grid with specific column widths:
  grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr]
  This gives precise control over column proportions:
    0.5fr = row number (narrow)
    3fr   = patient name + photo (wide)
    1fr   = age
    3fr   = date & time (wide)
    3fr   = doctor name + photo (wide)
    1fr   = fees
    1fr   = action button

  Unlike the doctor's appointment view, the admin sees ALL patient
  appointments — no owner filtering (getAllAppointments calls
  appointmentsAdmin which uses find({}) with no filter).
*/

import React, { useEffect } from 'react'
import { assets } from '../../assets/assets'
import { useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'

const AllAppointments = () => {
  const { aToken, appointments, cancelAppointment, getAllAppointments } = useContext(AdminContext)
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext)

  useEffect(() => {
    if (aToken) { getAllAppointments() }
  }, [aToken])

  return (
    <div className='w-full max-w-6xl m-5 '>
      <p className='mb-3 text-lg font-medium'>All Appointments</p>
      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] grid-flow-col py-3 px-6 border-b'>
          <p>#</p><p>Patient</p><p>Age</p><p>Date & Time</p><p>Doctor</p><p>Fees</p><p>Action</p>
        </div>
        {appointments.map((item, index) => (
          <div className='flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50' key={index}>
            <p className='max-sm:hidden'>{index + 1}</p>
            <div className='flex items-center gap-2'>
              <img src={item.userData.image} className='w-8 rounded-full' alt="" /> <p>{item.userData.name}</p>
            </div>
            <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
            <p>{slotDateFormat(item.slotDate)} {item.slotTime}</p>
            <div className='flex items-center gap-2'>
              <img src={item.docData.image} className='w-8 rounded-full bg-gray-200' alt="" /> <p>{item.docData.name}</p>
            </div>
            <p>{currency}{item.amount}</p>
            {item.cancelled ? <p className='text-red-400 text-xs font-medium'>Cancelled</p>
              : item.isCompleted ? <p className='text-green-500 text-xs font-medium'>Completed</p> :
                <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AllAppointments
