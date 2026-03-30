require('dotenv').config();
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const ADMIN_EMAIL = process.env.ADMIN_EMAILS;

async function setAdminClaim() {
  if (!ADMIN_EMAIL) {
    console.error('❌ ADMIN_EMAILS not set in server/.env');
    console.error('   Add this line to your server/.env file:');
    console.error('   ADMIN_EMAILS=youradmin@email.com');
    process.exit(1);
  }

  try {
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });

    console.log(`✅ Admin claim set for ${ADMIN_EMAIL}`);  // fixed: was ADMIN_EMAILS (undefined)
    console.log('ℹ️  Sign out and sign back in for the claim to take effect.');
    process.exit(0);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ No Firebase user found with email: ${ADMIN_EMAIL}`);
      console.error('   Go to Firebase Console → Authentication → Users → Add user first.');
    } else {
      console.error('❌ Failed:', err.message);
    }
    process.exit(1);
  }
}

setAdminClaim();