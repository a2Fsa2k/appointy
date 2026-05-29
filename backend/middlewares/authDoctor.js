/*
╔══════════════════════════════════════════════════════════════╗
║               middlewares/authDoctor.js                      ║
║        "Are you really a registered doctor?"                 ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: authUser.js (patient JWT) and authAdmin.js
  (hardcoded admin check).
  Now: doctor auth — the BEST implementation of the three.

  WHY THIS IS THE BEST AUTH MIDDLEWARE:
  ─────────────────────────────────────
  Compare all three:
    authUser   → custom `token` header, attaches to req.body
    authAdmin  → custom `atoken` header, weird payload comparison
    authDoctor → STANDARD `Authorization: Bearer <token>` header,
                  attaches to req.user (clean separation)

  This is the most "correct" implementation. It follows the
  HTTP standard (RFC 7235) for the Authorization header.

  KEY DETAIL — TWO HEADER NAMES:
  ──────────────────────────────
  const authHeader = req.headers.authorization || req.headers.dtoken;

  This checks BOTH the standard Authorization header AND a
  custom `dtoken` header. Why? Backward compatibility. When the
  developer switched to the standard format, old clients might
  still be sending the custom header. This dual check ensures
  neither breaks.

  FIRST PRINCIPLE — Why "Bearer"?
  ────────────────────────────────
  "Bearer" is the authentication SCHEME. It means: "whoever
  BEARS (holds) this token is authenticated." Other schemes
  exist (like "Basic" for username:password). The scheme tells
  the server HOW to interpret the credentials that follow.

  Format: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

  AUDIT NOTES:
  [!] STATUS CODES: This middleware correctly uses HTTP 401
      (Unauthorized) instead of 200 with success:false. This
      is the right approach — it tells browsers and HTTP clients
      "your credentials are missing or invalid."

  [!] TOKEN EXTRACTION: The `authHeader.startsWith('Bearer ')`
      check is case-sensitive. "bearer " (lowercase) would fall
      through to using the entire string as the token, which
      would fail verification. Should be case-insensitive.

  [!] req.user vs req.body: This puts the decoded ID on `req.user`
      (a dedicated object for auth info). This is better than
      the user middleware which puts it on `req.body` (which is
      for user-submitted data). Mixing auth data with form data
      is a bad pattern — this approach is cleaner.

  [!] LIKE THE OTHERS: No token expiration. Should add
      `expiresIn` when signing the JWT in doctorController.js.
*/

import jwt from 'jsonwebtoken';

// Doctor authentication middleware
const authDoctor = async (req, res, next) => {
    try {
        // Check for token in Authorization header OR custom dtoken header
        const authHeader = req.headers.authorization || req.headers.dtoken;

        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'Authorization token missing' });
        }

        /*
           If the header starts with "Bearer ", we extract just the
           token part (after the space). Otherwise, we use the entire
           header value as the token (for the custom `dtoken` header
           which sends the raw token without "Bearer ").
        */
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : authHeader;

        // Verify token and attach user info to req
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id };
        /*
           Now every handler after this middleware can access
           `req.user.id` to know WHICH doctor is calling.
           Example: doctorController.js does `const docId = req.user.id`
        */
        next();
    } catch (error) {
        console.error('Auth Error:', error.message);
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

export default authDoctor;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: middlewares/multer.js                           │
  │                                                             │
  │  We've secured WHO can access the API. Now: how do we       │
  │  handle FILE UPLOADS? Multer is the middleware that         │
  │  receives images from the browser.                          │
  └─────────────────────────────────────────────────────────────┘
*/
