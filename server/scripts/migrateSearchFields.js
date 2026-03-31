require('dotenv').config({ path: '../.env' });
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function migrate() {
  const snapshot = await db.collection('songs').get();
  if (snapshot.empty) { console.log('No songs found.'); return; }

  const batch = db.batch();
  let count = 0;

  snapshot.docs.forEach(doc => {
    const { title, artist } = doc.data();
    batch.update(doc.ref, {
      titleLower: (title || '').toLowerCase(),
      artistLower: (artist || '').toLowerCase(),
    });
    count++;
  });

  await batch.commit();
  console.log(`Migrated ${count} song(s).`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});