/*
╔══════════════════════════════════════════════════════════════╗
║               middlewares/authAdmin.js                       ║
║        "Are you THE administrator?"                          ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: authUser.js — JWT-based auth for patients.
  Now: admin auth. This is DIFFERENT and more primitive.

  THE BIG DIFFERENCE FROM USER AUTH:
  ──────────────────────────────────
  User auth:  Verifies a JWT that contains the user's MongoDB ID.
  Admin auth: Verifies a JWT that contains email+password from .env.

  There's only ONE admin (defined by ADMIN_EMAIL and ADMIN_PASSWORD
  in the .env file). The admin doesn't exist in the database.
  The admin credentials are hardcoded server-side.

  WHY THIS APPROACH?
  ──────────────────
  It's simple — no admin collection in MongoDB needed. For a
  small app with one admin, this works. For multiple admins,
  you'd need an admin model (like the user model).

  FIRST PRINCIPLE — How the admin JWT works:
  ─────────────────────────────────────────
  Notice the JWT payload: `email + password` (concatenated strings).
  jwt.sign() treats the first argument (the payload) as the data
  to encode. Normally you pass an object { id: ... }, but here it's
  a plain string.

  jwt.sign("admin@email.comadminpass123", secret)
  → creates token with payload: "admin@email.comadminpass123"

  jwt.verify(token, secret) returns that same string.
  Then the middleware checks: does this string match
  ADMIN_EMAIL + ADMIN_PASSWORD from the .env file?

  If they match → this request came from the admin.
  If they don't → someone tampered with the token.

  AUDIT NOTES:
  [!] CRITICAL: This is NOT how JWT should be used. The token
      payload contains the admin's PASSWORD embedded in it.
      While JWTs are signed (tamper-proof), the payload is
      BASE64-ENCODED, NOT ENCRYPTED. Anyone who sees the token
      can decode the middle part and see the admin password.

      Better approach: jwt.sign({ role: "admin" }, secret)
      Then just check that decoded.role === "admin".

  [!] The header name is `atoken` (admin token) instead of the
      standard `Authorization`. The user middleware uses `token`
      and the doctor middleware uses `Authorization`. Three
      different header names for the same concept — inconsistent
      and confusing.

  [!] The error response uses `res.json()` without a status code
      (defaults to 200). For auth failures, HTTP 401 (Unauthorized)
      is the correct status code. Returning 200 with
      `success: false` means the browser cache treats it as a
      successful response.

  [!] If the token is valid but the string doesn't match, you get
      the same error as an invalid token. This leaks no info
      (good for security), but makes debugging hard.
*/

import jwt from "jsonwebtoken"

// admin authentication middleware
const authAdmin = async (req, res, next) => {
    try {
        const { atoken } = req.headers
        if (!atoken) {
            return res.json({ success: false, message: 'Not Authorized Login Again' })
        }
        const token_decode = jwt.verify(atoken, process.env.JWT_SECRET)
        /*
           token_decode is the string that was passed to jwt.sign():
           ADMIN_EMAIL + ADMIN_PASSWORD (concatenated from .env)

           We compare it against the current .env values.
           If someone changed the .env file after the token was
           issued, all existing tokens become invalid.
        */
        if (token_decode !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
            return res.json({ success: false, message: 'Not Authorized Login Again' })
        }
        next()
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export default authAdmin;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: middlewares/authDoctor.js                       │
  │                                                             │
  │  We've seen patient auth (JWT with user ID) and admin       │
  │  auth (JWT with env comparison). Now doctor auth — a        │
  │  cleaner JWT implementation with proper Authorization       │
  │  headers.                                                   │
  └─────────────────────────────────────────────────────────────┘
*/
