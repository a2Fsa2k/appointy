/*
╔══════════════════════════════════════════════════════════════╗
║                 middlewares/multer.js                        ║
║        "The file receiver — handles image uploads"           ║
╚══════════════════════════════════════════════════════════════╝

  PREVIOUSLY: We learned how auth middleware verifies identity.
  Now: a different kind of middleware — MULTER handles file uploads.

  WHAT IS MULTER?
  ───────────────
  When a browser sends a file (like a profile picture), it uses
  a special encoding called "multipart/form-data." Regular
  `express.json()` can't parse this — it only handles JSON.

  Multer is a middleware that:
    1. Detects multipart/form-data requests
    2. Extracts the file(s) from the raw HTTP body
    3. Saves them temporarily to disk (or memory)
    4. Makes them available as `req.file` (single) or `req.files` (multiple)

  FIRST PRINCIPLE — How does a file travel over HTTP?
  ───────────────────────────────────────────────────
  HTTP was designed for TEXT. To send a binary file (like an image),
  the browser encodes it as text using a format called "multipart."
  Think of it like putting a file in an envelope within a larger
  letter. The envelope has a label ("Content-Disposition: form-data;
  name='image'; filename='photo.jpg'") and the content is the raw
  binary data, base64-encoded or sent as-is with a boundary marker.

  FIRST PRINCIPLE — diskStorage vs memoryStorage:
  ────────────────────────────────────────────────
  diskStorage: file is saved to a temp folder on the server's
               hard drive. Good for large files. The file stays
               until you delete it.

  memoryStorage: file is kept in RAM (as a Buffer). Good for
                 small files that you want to process immediately.
                 The file disappears when the request ends.

  This code uses diskStorage — the file lands on the server's
  disk, then gets uploaded to Cloudinary, then (should be) deleted.

  AUDIT NOTES:
  [!] CRITICAL: No file type validation! Anyone can upload ANY
      file type — .exe, .zip, .php, etc. This is a major security
      risk. Multer supports a `fileFilter` option that can check
      MIME types (e.g., only allow image/jpeg, image/png).

  [!] CRITICAL: No file size limit! A malicious user could upload
      a multi-gigabyte file and fill up the server's disk. The
      `limits: { fileSize: 5 * 1024 * 1024 }` option (5MB limit)
      should be added.

  [!] FILENAME COLLISION: `file.originalname` is used as-is. If two
      users upload "photo.jpg", the second one overwrites the first.
      A unique name (like UUID or timestamp) should be generated.

  [!] NO CLEANUP: After uploading to Cloudinary, the temp files
      on disk are never deleted. This slowly fills up the server's
      storage. Each upload should be followed by a fs.unlink() call.

  [!] DIRECTORY: No `dest` option is specified, so multer stores
      files in the OS temp directory. This might not exist or be
      writable in some environments (like serverless functions).
*/

import multer from "multer";

const storage = multer.diskStorage({
    filename: function (req, file, callback) {
        /*
           This function decides the filename. Using the original
           name means "cat.jpg" stays "cat.jpg".

           callback(null, filename) tells multer: "success, use this name."
           callback(error) would tell multer: "something went wrong."
        */
        callback(null, file.originalname)
    }
});

const upload = multer({ storage })
/*
   `upload` is the configured multer instance. It's imported by
   route files and used like:
   router.post("/add-doctor", upload.single('image'), handler)

   upload.single('image') means: "expect ONE file in the field
   named 'image'." Multer supports:
   - .single('fieldName') → one file
   - .array('fieldName', maxCount) → multiple files
   - .fields([...]) → multiple named files
   - .none() → text-only, reject any files
*/

export default upload

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  NEXT FILE: routes/userRoute.js                             │
  │                                                             │
  │  We now have all the LEGO pieces:                           │
  │    - Models (data shapes)                                   │
  │    - Middleware (auth guards + file handler)                │
  │  Now we need to CONNECT URLs to actual code.                │
  │  Routes are the MAP that ties URLs to controller functions. │
  └─────────────────────────────────────────────────────────────┘
*/
