/*
╔══════════════════════════════════════════════════════════════╗
║        admin/src/pages/Doctor/DoctorProfile.jsx              ║
║    "Doctor edits their own profile — fees, about, address"   ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: DoctorAppointments.jsx.
  Now: The FINAL file! DoctorProfile — where a doctor edits
  their professional details.

  EDITABLE FIELDS: about, fees, address (line1 + line2), available
  NON-EDITABLE: name, email, degree, specialty, experience, image
  (Those are set by admin when creating the doctor.)

  This is the same edit/view toggle pattern used in the patient's
  MyProfile page. However, notice:
    - NO image upload (doctor photo is set by admin only)
    - The "available" checkbox works even in VIEW mode but
      only updates when in EDIT mode (onChange checks isEdit).

  The available checkbox shows the doctor's current availability
  status. Changing it here calls the same changeAvailability API
  that the admin uses (doctorController.js changeAvailability).

  AUDIT NOTES:
  [!] The available checkbox calls setProfileData directly in view
      mode but the change is only saved when "Save" is clicked.
      If the doctor toggles availability and doesn't save, the
      UI shows the toggled state but it's not persisted.
  [!] Fees input has no min/max validation. A doctor could set
      fees to 0 or a negative number.
  [!] No confirmation dialog before saving profile changes.
  [!] The `dToken` is sent as a custom header, not using the
      standard Authorization: Bearer format. Inconsistent with
      DoctorContext which uses the standard format.

  YOU'VE COMPLETED THE ENTIRE CODEBASE! Here's the full picture:

  RELATIONSHIP GRAPH — How everything connects:
  ─────────────────────────────────────────────

  BACKEND (server-side):
  server.js ──starts──▶ mongodb.js (database)
    │                   cloudinary.js (images)
    ├── /api/admin ──▶ adminRoute.js ──▶ adminController.js
    │                   └── authAdmin.js (guard)
    ├── /api/doctor ─▶ doctorRoute.js ──▶ doctorController.js
    │                   └── authDoctor.js (guard)
    └── /api/user ───▶ userRoute.js ──▶ userController.js
                        └── authUser.js (guard)

    All controllers use: userModel, doctorModel, appointmentModel

  FRONTEND (patient-facing app):
  main.jsx ──▶ App.jsx (router) ──▶ AppContext (global state)
    │
    ├── Navbar (always visible)
    ├── Home ──▶ Header, SpecialityMenu, TopDoctors, Banner
    ├── Doctors (browse + filter)
    ├── Appointment (book + time slots + related doctors)
    ├── Login (sign up / log in toggle)
    ├── MyProfile (edit profile + upload photo)
    ├── MyAppointments (list + Razorpay payment + cancel)
    ├── About, Contact (static pages)
    └── Footer (always visible)

  ADMIN PANEL (admin + doctor dashboard):
  main.jsx ──▶ App.jsx (dual-role router)
    │           ├── AdminContext (admin state + API)
    │           ├── DoctorContext (doctor state + API)
    │           └── AppContext (shared utilities)
    │
    ├── Navbar (role-aware: Admin/Doctor label)
    ├── Sidebar (role-aware: different menu items)
    ├── Login (Admin/Doctor toggle)
    ├── Admin pages:
    │   ├── Dashboard (stats + latest bookings)
    │   ├── AllAppointments (every patient)
    │   ├── AddDoctor (registration form)
    │   └── DoctorsList (availability toggle)
    └── Doctor pages:
        ├── DoctorDashboard (earnings + stats)
        ├── DoctorAppointments (own patients)
        └── DoctorProfile (edit fees/about/address)

  DATA FLOW (end to end):
  1. Patient opens website → frontend loads → AppContext fetches doctor list
  2. Patient clicks doctor → Appointment page → generates available slots
  3. Patient books → POST /api/user/book-appointment → saves appointment
  4. Patient pays → Razorpay popup → backend verifies → marks paid
  5. Doctor logs into admin panel → sees appointment → marks complete
  6. Admin sees everything → manages doctors → cancels if needed

  This is a full-stack MERN application. You now understand every file.
*/
import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const DoctorProfile = () => {
    const { dToken, profileData, setProfileData, getProfileData, backendUrl } = useContext(DoctorContext)
    const { currency } = useContext(AppContext)
    const [isEdit, setIsEdit] = useState(false)

    const updateProfile = async () => {
        try {
            const updateData = {
                address: profileData.address,
                fees: profileData.fees,
                about: profileData.about,
                available: profileData.available
            }
            const { data } = await axios.post(backendUrl + '/api/doctor/update-profile', updateData, { headers: { dToken } })
            if (data.success) {
                toast.success(data.message)
                setIsEdit(false)
                getProfileData() // Refresh from server
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }
    }

    useEffect(() => {
        if (dToken) { getProfileData() }
    }, [dToken])

    return profileData && (
        <div>
            <div className='flex flex-col gap-4 m-5'>
                <div>
                    <img className='bg-primary/80 w-full sm:max-w-64 rounded-lg' src={profileData.image} alt="" />
                </div>
                <div className='flex-1 border border-stone-100 rounded-lg p-8 py-7 bg-white'>
                    <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>{profileData.name}</p>
                    <div className='flex items-center gap-2 mt-1 text-gray-600'>
                        <p>{profileData.degree} - {profileData.speciality}</p>
                        <button className='py-0.5 px-2 border text-xs rounded-full'>{profileData.experience}</button>
                    </div>
                    <div>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>About :</p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>
                            {isEdit
                                ? <textarea onChange={(e) => setProfileData(prev => ({ ...prev, about: e.target.value }))} className='w-full outline-primary p-2' rows={8} value={profileData.about} />
                                : profileData.about}
                        </p>
                    </div>
                    <p className='text-gray-600 font-medium mt-4'>
                        Appointment fee: <span className='text-gray-800'>{currency} {isEdit ? <input type='number' onChange={(e) => setProfileData(prev => ({ ...prev, fees: e.target.value }))} value={profileData.fees} /> : profileData.fees}</span>
                    </p>
                    <div className='flex gap-2 py-2'>
                        <p>Address:</p>
                        <p className='text-sm'>
                            {isEdit ? <input type='text' onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))} value={profileData.address.line1} /> : profileData.address.line1}
                            <br />
                            {isEdit ? <input type='text' onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))} value={profileData.address.line2} /> : profileData.address.line2}
                        </p>
                    </div>
                    <div className='flex gap-1 pt-2'>
                        <input type="checkbox" onChange={() => isEdit && setProfileData(prev => ({ ...prev, available: !prev.available }))} checked={profileData.available} />
                        <label htmlFor="">Available</label>
                    </div>
                    {isEdit
                        ? <button onClick={updateProfile} className='px-4 py-1 border border-primary text-sm rounded-full mt-5 hover:bg-primary hover:text-white transition-all'>Save</button>
                        : <button onClick={() => setIsEdit(prev => !prev)} className='px-4 py-1 border border-primary text-sm rounded-full mt-5 hover:bg-primary hover:text-white transition-all'>Edit</button>
                    }
                </div>
            </div>
        </div>
    )
}

export default DoctorProfile
