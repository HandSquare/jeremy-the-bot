const admin = require('firebase-admin');
const { getFirestore, db } = require('firebase-admin/firestore');

let store;

async function startStore() {
  const creds = {
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  };

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
