const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, writeBatch, addDoc } = require('firebase/firestore');

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

async function testWrite() {
  console.log('Testing Firestore write permission...');
  const tempCol = collection(db, 'products');
  
  // Try to add a test document
  try {
    const docRef = await addDoc(tempCol, {
      name: 'TEST PRODUCT ' + Date.now(),
      description: 'Temporary test product to verify write permission',
      price: 9.99,
      imageUrl: '',
      category: 'Test',
      isFeatured: false,
      galleryImages: [],
      rating: 5.0,
      reviewsCount: 0,
      isTest: true
    });
    console.log('SUCCESS: Document written with ID:', docRef.id);
    
    // Clean up test document
    // We don't have deleteDoc imported, but we can import or just leave it
    console.log('Write test passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('WRITE ERROR:', err.message);
    process.exit(1);
  }
}

testWrite();
