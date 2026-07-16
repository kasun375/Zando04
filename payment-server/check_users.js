const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey:            'AIzaSyCAMt4rLwtm5htZhPZnWdT-bjyzGxnstPM',
  authDomain:        'zando-b574e.firebaseapp.com',
  projectId:         'zando-b574e',
  storageBucket:     'zando-b574e.appspot.com',
  messagingSenderId: '20423532374',
  appId:             '1:20423532374:web:213ad3f80bc841a9d880f7',
  measurementId:     'G-SM7F64PL0V'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUsers() {
  console.log('Fetching users collection...');
  try {
    const snap = await getDocs(collection(db, 'users'));
    console.log('Total users found:', snap.size);
    snap.forEach(d => {
      console.log(`- User ${d.id}:`, d.data());
    });
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

checkUsers();
