/*
  pages/Admin/DoctorsList.jsx — Grid view of all doctors with availability toggle.

  Displays all doctors as cards (photo, name, specialty, availability checkbox).
  The checkbox calls changeAvailability(docId) which toggles available<->unavailable.

  The grid uses flex-wrap — cards flow horizontally and wrap to the next line.
  Each card has a hover effect on the image (group-hover:bg-primary).

  The availability checkbox is directly wired to the doctor's `available` field.
  onChange triggers immediately — no save button, no confirmation dialog.
  This is good UX for a simple toggle but could accidentally change availability.
*/

import React, { useContext, useEffect } from 'react'
import { AdminContext } from '../../context/AdminContext'

const DoctorsList = () => {
  const { doctors, aToken, getAllDoctors, changeAvailability } = useContext(AdminContext)

  useEffect(() => {
    if (aToken) { getAllDoctors() }
  }, [aToken])

  return (
    <div className='m-5 max-h-[90vh] overflow-y-scroll'>
      <h1 className='text-lg font-medium'>All Doctors</h1>
      <div className='w-full flex flex-wrap gap-4 pt-5 gap-y-6'>
        {doctors.map((item, index) => (
          <div className='border border-[#C9D8FF] rounded-xl max-w-56 overflow-hidden cursor-pointer group' key={index}>
            <img className='bg-[#EAEFFF] group-hover:bg-primary transition-all duration-500' src={item.image} alt="" />
            <div className='p-4'>
              <p className='text-[#262626] text-lg font-medium'>{item.name}</p>
              <p className='text-[#5C5C5C] text-sm'>{item.speciality}</p>
              <div className='mt-2 flex items-center gap-1 text-sm'>
                <input onChange={() => changeAvailability(item._id)} type="checkbox" checked={item.available} />
                <p>Available</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DoctorsList
