/*
╔══════════════════════════════════════════════════════════════╗
║                 config/cloudinary.js                         ║
║           "Where images go to live"                          ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: mongodb.js taught us how data gets stored.
  Now: where do user profile pictures and doctor photos live?

  WHAT IS CLOUDINARY?
  ───────────────────
  Cloudinary is a "CDN + image processing" service. You upload
  an image to their servers, they give you a URL back. You store
  that URL in your database. When someone needs to see the image,
  their browser downloads it from Cloudinary's fast global servers,
  not from your slow single server.

  WHY NOT STORE IMAGES IN MONGODB?
  ────────────────────────────────
  You CAN store images in MongoDB (as binary data), but:
    (a) It's slow — MongoDB is optimized for JSON, not files
    (b) It's expensive — you pay for database storage
    (c) It's wasteful — every image request hits your DB
    (d) No image processing — Cloudinary can resize/crop on the fly

  FIRST PRINCIPLE — How does image upload work?
  ─────────────────────────────────────────────
  1. User picks an image file on their computer
  2. Browser sends the file to YOUR server (via multer middleware)
  3. Your server temporarily holds the file on disk
  4. Your server uploads it to Cloudinary (this file's credentials)
  5. Cloudinary returns a URL like https://res.cloudinary.com/...
  6. You save that URL string in MongoDB
  7. The temporary file on your server gets deleted

  So your server is just a MIDDLEMAN. It never permanently stores
  the image — it passes it to Cloudinary and keeps only the URL.

  AUDIT NOTE:
  [!] The async function has no try-catch. If cloudinary.config()
      fails (bad credentials), the app silently continues. Later
      uploads will then fail with confusing errors. A validation
      check would catch this early.
*/

import { v2 as cloudinary } from 'cloudinary';

const connectCloudinary = async () => {

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_SECRET_KEY
    });

}

export default connectCloudinary;

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: models/userModel.js                             │
  │                                                             │
  │  Now that we can connect to MongoDB and Cloudinary, let's   │
  │  define the SHAPE of our data. We start with the USER —     │
  │  the patient who books appointments.                        │
  └─────────────────────────────────────────────────────────────┘
*/
