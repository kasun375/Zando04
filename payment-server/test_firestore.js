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

function convertToDirectLink(url) {
  if (!url) return '';
  const lhMatch = url.match(/lh3\.googleusercontent\.com\/(?:u\/\d+\/)?d\/([^/?#&]+)/);
  if (lhMatch) return `https://lh3.googleusercontent.com/d/${lhMatch[1]}`;
  const driveMatch1 = url.match(/drive\.google\.com\/file\/d\/([^/?#&]+)/);
  if (driveMatch1) return `https://lh3.googleusercontent.com/d/${driveMatch1[1]}`;
  const driveMatch2 = url.match(/drive\.google\.com\/(?:uc|open|thumbnail)\?.*id=([^&?#]+)/);
  if (driveMatch2) return `https://lh3.googleusercontent.com/d/${driveMatch2[1]}`;
  return url;
}

console.log('Attempting to fetch and map products from Firestore...');
getDocs(collection(db, 'products'))
  .then(async snap => {
    console.log('SUCCESS: fetched ' + snap.size + ' products');
    const products = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        imageUrl: convertToDirectLink(data.imageUrl || ''),
        galleryImages: (data.galleryImages || []).map(convertToDirectLink),
      };
    });
    console.log('Successfully mapped ' + products.length + ' products without error!');

    console.log('Attempting to fetch banners from Firestore...');
    const banSnap = await getDocs(collection(db, 'banners'));
    console.log('SUCCESS: fetched ' + banSnap.size + ' banners');
    const banners = banSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      imageUrl: convertToDirectLink(d.data().imageUrl || '')
    }));
    console.log('Successfully mapped ' + banners.length + ' banners without error!');

    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR during fetch/map:', err);
    process.exit(1);
  });
