const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

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

  admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
  store = getFirestore();
  store.settings({ ignoreUndefinedProperties: true });
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

const loadAllChannelHistories = async () => {
  const snapshot = await store.collection('messageHistory').get();
  const result = {};
  snapshot.forEach((doc) => {
    result[doc.id] = doc.data().messages || [];
  });
  return result;
};

const saveChannelHistory = (channelId, messages) => {
  return store
    .doc(`messageHistory/${channelId}`)
    .set({ messages, updatedAt: Date.now() });
};

const deleteChannelHistory = (channelId) => {
  return store.doc(`messageHistory/${channelId}`).delete();
};

module.exports = {
  startStore,
  getState,
  getStateValue,
  updateState,
  loadAllChannelHistories,
  saveChannelHistory,
  deleteChannelHistory,
};
