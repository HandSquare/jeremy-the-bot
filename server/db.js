const admin = require('firebase-admin');
const { getFirestore, db } = require('firebase-admin/firestore');
let serviceAccount;
try {
  serviceAccount = require('../jeremy-db-firebase-adminsdk-mrm2y-1a4ec8168b.json');
} catch (e) {
  console.log('no firebase config. this is expected if running from heroku');
}

let store;

async function startStore() {
  const creds = process.env.FIREBASE_CONFIG || serviceAccount;
  const app = admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
  store = getFirestore();
  const doc = store.doc('main/state');
}

const getState = () => {
  return store.doc('main/state');
};

const updateState = (diff) => {
  return store.doc('main/state').update(diff);
};

const getStateValue = async (field) => {
  return (await getState().get()).get(field);
};

module.exports = {
  startStore,
  getState,
  getStateValue,
  updateState,
};
