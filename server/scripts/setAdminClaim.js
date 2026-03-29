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
    console.error('ADMIN_EMAIL not set in server/.env');
    process.exit(1);
  }

  const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });

  console.log(`✅ Admin claim set for ${ADMIN_EMAILS}`);
  console.log('Sign out and sign back in for the claim to take effect.');
  process.exit(0);
}

setAdminClaim().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
