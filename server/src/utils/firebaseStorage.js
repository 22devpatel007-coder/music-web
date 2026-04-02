// PERMANENT FIX: The previous stub returned { url: '', path: '' } silently.
// If any code path ever called this thinking uploads would work, it would
// store blank URLs in Firestore with zero error output — impossible to debug.
//
// Now it throws immediately so the caller fails loudly with a clear message
// pointing to the correct upload path (Cloudinary via songs.controller.js).
async function uploadToFirebaseStorage() {
  throw new Error(
    '[firebaseStorage] Firebase Storage is not used in this project. ' +
    'Upload files via Cloudinary instead. ' +
    'See uploadToCloudinary() in server/src/controllers/songs.controller.js'
  );
}

module.exports = { uploadToFirebaseStorage };