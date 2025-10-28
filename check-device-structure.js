import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('../radio-revive/rpi-agent/service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDevice() {
    const deviceDoc = await db.collection('config')
        .doc('devices')
        .collection('list')
        .doc('05d0dda82ffb5c5d')
        .get();
    
    console.log('Device structure:');
    console.log(JSON.stringify(deviceDoc.data(), null, 2));
    
    process.exit(0);
}

checkDevice().catch(console.error);
