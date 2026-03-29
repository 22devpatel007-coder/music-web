const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'song' && !file.mimetype.includes('audio')) {
      return cb(new Error('Only audio files allowed'));
    }
    cb(null, true);
  },
});

module.exports = upload;