const multer = require('multer');

const storage = multer.memoryStorage();

// FIX: 50 MB overall limit (Cloudinary accepts large audio files).
// Per-field validation is done in fileFilter below.
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB hard ceiling
    files: 2,                    // exactly song + cover
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'song') {
      // Only accept audio files
      if (!file.mimetype.startsWith('audio/')) {
        return cb(Object.assign(new Error('Only audio files are allowed for the song field'), { status: 400 }));
      }
    } else if (file.fieldname === 'cover') {
      // Only accept images
      if (!file.mimetype.startsWith('image/')) {
        return cb(Object.assign(new Error('Only image files are allowed for the cover field'), { status: 400 }));
      }
    } else {
      // Reject unexpected fields
      return cb(Object.assign(new Error(`Unexpected field: ${file.fieldname}`), { status: 400 }));
    }
    cb(null, true);
  },
});

module.exports = upload;