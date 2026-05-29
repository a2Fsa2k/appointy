/*
╔══════════════════════════════════════════════════════════════╗
║               middlewares/authUser.js                        ║
║        "Are you really a registered patient?"                ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: We defined the data shapes (models).
  Now: Before anyone can read or change data, we need to
  verify WHO they are. This is AUTHENTICATION.

  WHAT IS MIDDLEWARE?
  ───────────────────
  In Express, middleware is a function that runs BETWEEN the
  request arriving and the final handler running. It's like
  a security checkpoint at an airport:

    Request → [Middleware 1] → [Middleware 2] → [Your Handler]

  If any middleware says "no," the request never reaches the handler.
  If middleware says "yes" (calls `next()`), the request continues.

  FIRST PRINCIPLE — JWT (JSON Web Token):
  ────────────────────────────────────────
  A JWT is like a PASSPORT that the server issues after login.
  It's a string that looks like: xxxxx.yyyyy.zzzzz (three parts
  separated by dots).

  Part 1 (Header):   Says "this is a JWT, signed with algorithm X"
  Part 2 (Payload):  Contains data like { id: "user123" }
  Part 3 (Signature): A cryptographic seal — proves the server
                      created this token and nobody tampered with it.

  The magic: the signature uses a SECRET KEY that only the server
  knows. Anyone can READ the payload (it's base64, not encrypted),
  but nobody can CREATE or MODIFY a valid token without the secret.

  Flow:
    1. User logs in → server verifies password → creates JWT with user ID
    2. User sends JWT with every request (in headers)
    3. Server verifies signature → extracts user ID → knows who's calling

  AUDIT NOTES:
  [!] TOKEN TRANSMISSION: The token is sent in a custom header
      called `token`, not the standard `Authorization: Bearer <token>`.
      This works but is non-standard. The doctor auth uses the
      standard format — inconsistency.
  [!] NO EXPIRATION: jwt.sign() doesn't include `expiresIn`, so
      tokens NEVER expire. If someone steals a token, they have
      access forever. Tokens should expire (e.g., 24 hours).
  [!] ERROR LEAK: `error.message` is sent directly to the client.
      JWT errors can include stack traces or internal info. Better
      to send a generic "invalid token" message.
  [!] req.body CHECK: The `if (!req.body) req.body = {}` check
      is a defensive fix for cases where body is undefined (e.g.,
      GET requests). But adding userId to req.body means controllers
      get it from `req.body.userId` instead of a dedicated `req.userId`.
      This mixes auth data with user-submitted data — not ideal.
*/

import jwt from 'jsonwebtoken'

// user authentication middleware
const authUser = async (req, res, next) => {
    /*
       This middleware expects the client to send:
       headers: { token: "eyJhbGciOi..." }

       It reads the token, verifies it, and attaches the user's
       ID to the request so the next handler knows who's calling.
    */
    const { token } = req.headers
    if (!token) {
        return res.json({ success: false, message: 'Not Authorized Login Again' })
    }
    try {
        /*
           jwt.verify() does two things:
           1. Checks the signature (was this token created with OUR secret?)
           2. Decodes the payload (extracts the data we put in)
           If the signature is invalid or the token is expired, it THROWS.
        */
        const token_decode = jwt.verify(token, process.env.JWT_SECRET)

        // Defensive: ensure req.body exists (GET requests have no body)
        if (!req.body) req.body = {}

        /*
           This is how the controller knows WHICH user is calling.
           The user's ID (from the JWT payload) is attached to req.body.
           The controller then uses req.body.userId to fetch that user's data.
        */
        req.body.userId = token_decode.id
        next()
        /*
           next() tells Express: "I'm done, pass the request to the
           next middleware or the final handler." Without calling
           next(), the request would hang forever.
        */
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export default authUser

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: middlewares/authAdmin.js                        │
  │                                                             │
  │  We just saw how PATIENT auth works with JWT.               │
  │  Admin auth is DIFFERENT — it uses env variables.           │
  │  Let's see why and how.                                     │
  └─────────────────────────────────────────────────────────────┘
*/
