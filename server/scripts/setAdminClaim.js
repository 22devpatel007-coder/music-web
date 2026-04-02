require("dotenv").config();
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

// PERMANENT FIX: Previously only read the first value from ADMIN_EMAILS,
// even though isAdmin.js middleware treats it as a comma-separated list.
// Running the old script only promoted one account regardless of how many
// emails were listed. Now it loops over every email and sets the claim for each.
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

async function setAdminClaims() {
  if (adminEmails.length === 0) {
    console.error("❌ ADMIN_EMAILS not set in server/.env");
    console.error("   Add this line to your server/.env file:");
    console.error("   ADMIN_EMAILS=admin@example.com,other@example.com");
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (const email of adminEmails) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
      console.log(`✅ Admin claim set for ${email}`);
      successCount++;
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        console.error(`❌ No Firebase user found with email: ${email}`);
        console.error(
          "   Go to Firebase Console → Authentication → Users → Add user first.",
        );
      } else {
        console.error(`❌ Failed for ${email}:`, err.message);
      }
      failCount++;
    }
  }

  console.log(`\nDone: ${successCount} succeeded, ${failCount} failed.`);
  if (successCount > 0) {
    console.log(
      "ℹ️  Affected users must sign out and sign back in for the claim to take effect.",
    );
  }
  process.exit(failCount > 0 ? 1 : 0);
}

setAdminClaims();
