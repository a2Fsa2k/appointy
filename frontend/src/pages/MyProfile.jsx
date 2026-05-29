/*
╔══════════════════════════════════════════════════════════════╗
║              pages/MyProfile.jsx                             ║
║    "View and edit the user's personal information"           ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: MyAppointment.jsx — the user's booking dashboard.
  Now: MyProfile — where the user edits their own info.

  THE EDIT PATTERN:
  This page has TWO modes controlled by `isEdit` state:
    isEdit = false → DISPLAY mode (read-only, shows values as text)
    isEdit = true  → EDIT mode (shows inputs, user can modify)

  Click "Edit" → isEdit becomes true → text turns into inputs
  Click "Save" → updateUserProfileData() → API call → back to display

  IMAGE UPLOAD FLOW:
  1. User clicks profile photo → hidden <input type="file"> opens
  2. onChange captures the File object: setImage(e.target.files[0])
  3. URL.createObjectURL(image) creates a temporary browser URL
     to preview the image before uploading
  4. On save, image is appended to FormData and sent to backend
  5. Backend uploads to Cloudinary, returns URL, saves to MongoDB

  FIRST PRINCIPLE — Why FormData instead of JSON?
  ──────────────────────────────────────────────
  JSON can't carry files — it's text-only. FormData (multipart/form-data)
  can mix text fields AND binary files in one request. Each field
  is appended with formData.append('key', value).
  Address is JSON.stringify()'d because objects can't be sent
  directly — they need to be serialized to a string first.

  AUDIT NOTES:
  [!] The address is sent as JSON.stringify(userData.address) but
      there's no try-catch if the parse fails on the backend.
  [!] URL.createObjectURL creates a memory reference. If not
      revoked (URL.revokeObjectURL), it causes memory leaks.
  [!] No validation on image size or type before sending.
*/

import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const MyProfile = () => {
    const [isEdit, setIsEdit] = useState(false)
    const [image, setImage] = useState(false)

    const { token, backendUrl, userData, setUserData, loadUserProfileData } = useContext(AppContext)

    const updateUserProfileData = async () => {
        try {
            const formData = new FormData()
            // FormData: the only way to send files + text in one HTTP request
            formData.append('name', userData.name)
            formData.append('phone', userData.phone)
            formData.append('address', JSON.stringify(userData.address))
            // address must be stringified — FormData can't hold objects directly
            formData.append('gender', userData.gender)
            formData.append('dob', userData.dob)
            image && formData.append('image', image)
            // Only append image if a new one was selected

            const { data } = await axios.post(backendUrl + '/api/user/update-profile', formData, { headers: { token } })
            // Note: no Content-Type header! Axios auto-detects FormData and sets
            // multipart/form-data with the correct boundary automatically.

            if (data.success) {
                toast.success(data.message)
                await loadUserProfileData()  // Refresh profile data from server
                setIsEdit(false)
                setImage(false)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    return userData ? (
        <div className='max-w-lg flex flex-col gap-2 text-sm pt-5'>
            {/* IMAGE: edit mode = clickable with upload hint, view mode = static */}
            {isEdit ? (
                <label htmlFor='image'>
                    <div className='inline-block relative cursor-pointer'>
                        <img className='w-36 rounded opacity-75' src={image ? URL.createObjectURL(image) : userData.image} alt="" />
                        {/*
                           URL.createObjectURL() creates a blob: URL that the browser
                           can display as an image. This gives instant preview before
                           the file is uploaded to the server.
                        */}
                        <img className='w-10 absolute bottom-12 right-12' src={image ? '' : assets.upload_icon} alt="" />
                    </div>
                    <input onChange={(e) => setImage(e.target.files[0])} type="file" id="image" hidden />
                </label>
            ) : (
                <img className='w-36 rounded' src={userData.image} alt="" />
            )}

            {/* NAME: edit = input, view = text */}
            {isEdit ? (
                <input className='bg-gray-50 text-3xl font-medium max-w-60' type="text"
                    onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                    value={userData.name}
                />
            ) : (
                <p className='font-medium text-3xl text-[#262626] mt-4'>{userData.name}</p>
            )}

            <hr className='bg-[#ADADAD] h-[1px] border-none' />

            {/* CONTACT INFORMATION: phone + address (edit = inputs, view = text) */}
            <div>
                <p className='text-gray-600 underline mt-3'>CONTACT INFORMATION</p>
                <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-[#363636]'>
                    <p className='font-medium'>Email id:</p>
                    <p className='text-blue-500'>{userData.email}</p>
                    {/* Email is NOT editable — it's the user's identity */}

                    <p className='font-medium'>Phone:</p>
                    {isEdit ? (
                        <input className='bg-gray-50 max-w-52' type="text"
                            onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                            value={userData.phone}
                        />
                    ) : (
                        <p className='text-blue-500'>{userData.phone}</p>
                    )}

                    <p className='font-medium'>Address:</p>
                    {isEdit ? (
                        <p>
                            <input className='bg-gray-50' type="text" onChange={(e) => setUserData(prev => ({
                                ...prev, address: { ...(prev.address || {}), line1: e.target.value }
                            }))} value={userData.address?.line1 || ''} />
                            <br />
                            <input className='bg-gray-50' type="text" onChange={(e) => setUserData(prev => ({
                                ...prev, address: { ...(prev.address || {}), line2: e.target.value }
                            }))} value={userData.address?.line2 || ''} />
                        </p>
                    ) : (
                        <p className='text-gray-500'>{userData.address?.line1} <br /> {userData.address?.line2}</p>
                    )}
                </div>
            </div>

            {/* BASIC INFORMATION: gender + birthday */}
            <div>
                <p className='text-[#797979] underline mt-3'>BASIC INFORMATION</p>
                <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-gray-600'>
                    <p className='font-medium'>Gender:</p>
                    {isEdit ? (
                        <select className='max-w-20 bg-gray-50'
                            onChange={(e) => setUserData(prev => ({ ...prev, gender: e.target.value }))}
                            value={userData.gender}>
                            <option value="Not Selected">Not Selected</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    ) : (
                        <p className='text-gray-500'>{userData.gender}</p>
                    )}
                    <p className='font-medium'>Birthday:</p>
                    {isEdit ? (
                        <input className='max-w-28 bg-gray-50' type='date'
                            onChange={(e) => setUserData(prev => ({ ...prev, dob: e.target.value }))}
                            value={userData.dob} />
                    ) : (
                        <p className='text-gray-500'>{userData.dob}</p>
                    )}
                </div>
            </div>

            <div className='mt-10'>
                {isEdit ? (
                    <button onClick={updateUserProfileData} className='border border-primary px-8 py-2 rounded-full hover:bg-primary hover:text-white transition-all'>Save information</button>
                ) : (
                    <button onClick={() => setIsEdit(true)} className='border border-primary px-8 py-2 rounded-full hover:bg-primary hover:text-white transition-all'>Edit</button>
                )}
            </div>
        </div>
    ) : null
}

export default MyProfile

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: ../admin/src/main.jsx                           │
  │                                                             │
  │  This completes the main patient frontend. The remaining     │
  │  components (Doctors page, Header, SpecialityMenu, etc.)    │
  │  follow the same patterns you've already learned.           │
  │                                                             │
  │  Now let's move to the ADMIN PANEL — where the clinic       │
  │  manages doctors and oversees all appointments.             │
  └─────────────────────────────────────────────────────────────┘
*/
