/**
 * setAdminClaim.js
 *
 * Usage (run from project root OR server/ folder):
 *   cd music-web/server && node scripts/setAdminClaim.js
 *
 * FIXES:
 * 1. dotenv is loaded with an explicit path so the script works regardless
 *    of which directory you run it from.
 * 2. Claim is set as { admin: true } — this matches the check in AuthContext:
 *      tokenResult.claims.admin === true
 *    The old script set { role: 'admin' } which never matched, so isAdmin
 *    was always false and admin users were redirected to /home.
 */

const path = require("path");

// Load .env from server/ directory regardless of where the script is invoked
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

// Validate required env vars before trying to use them
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, ADMIN_EMAILS } = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("❌ Missing Firebase credentials in server/.env");
  console.error("   Required keys:");
  console.error("   FIREBASE_PROJECT_ID=...");
  console.error("   FIREBASE_CLIENT_EMAIL=...");
  console.error('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."');
  process.exit(1);
}

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const adminEmails = (ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

async function setAdminClaims() {
  if (adminEmails.length === 0) {
    console.error("❌ ADMIN_EMAILS not set in server/.env");
    console.error("   Add this line to your server/.env:");
    console.error("   ADMIN_EMAILS=you@example.com,other@example.com");
    process.exit(1);
  }

  let successCount = 0;
  let failCount    = 0;

  for (const email of adminEmails) {
    try {
      const user = await admin.auth().getUserByEmail(email);

      // FIX: Must be { admin: true } to match AuthContext.js check:
      //   tokenResult.claims.admin === true
      // The old { role: 'admin' } claim never matched — isAdmin was always
      // false — every admin was redirected to /home and saw the wrong page.
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });

      console.log(`✅ Admin claim set for: ${email} (uid: ${user.uid})`);
      successCount++;
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        console.error(`❌ No account found for: ${email}`);
        console.error("   Create the user in Firebase Console → Authentication → Users first.");
      } else {
        console.error(`❌ Failed for ${email}:`, err.message);
      }
      failCount++;
    }
  }

  console.log(`\nResult: ${successCount} succeeded, ${failCount} failed.`);

  if (successCount > 0) {
    console.log("ℹ️  IMPORTANT: Affected users must sign out and sign back in.");
    console.log("   Firebase ID tokens are cached — the new claim won't appear");
    console.log("   until a fresh token is issued on next login.");
  }

  process.exit(failCount > 0 ? 1 : 0);
}

setAdminClaims();