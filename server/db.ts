import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { SlackMessage } from './types';

let store: Firestore;

export async function startStore(): Promise<void> {
  const creds = {
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY!.replace(/\\n/g, '\n'),
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(creds as admin.ServiceAccount),
  });
  store = getFirestore();
  store.settings({ ignoreUndefinedProperties: true });
}

export const getState = () => {
  return store.doc('main/state');
};

export const updateState = (diff: Record<string, any>) => {
  return store.doc('main/state').update(diff);
};

export const getStateValue = async (field: string) => {
  return (await getState().get()).get(field);
};

export const loadAllChannelHistories = async (): Promise<
  Record<string, SlackMessage[]>
> => {
  const snapshot = await store.collection('messageHistory').get();
  const result: Record<string, SlackMessage[]> = {};
  snapshot.forEach((doc) => {
    result[doc.id] = doc.data().messages || [];
  });
  return result;
};

export const saveChannelHistory = (
  channelId: string,
  messages: SlackMessage[]
) => {
  return store
    .doc(`messageHistory/${channelId}`)
    .set({ messages, updatedAt: Date.now() });
};

export const deleteChannelHistory = (channelId: string) => {
  return store.doc(`messageHistory/${channelId}`).delete();
};
