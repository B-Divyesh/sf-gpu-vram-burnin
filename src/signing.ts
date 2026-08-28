import { casefile, type RunReceipt } from './diagnostic';

const DATABASE = 'gpu-vram-burnin';
const STORE = 'identities';
const KEY = 'casefile-signing-v1';

type StoredIdentity = { privateKey: CryptoKey; publicKey: CryptoKey; keyId: string };
export type SignedCasefile = {
  casefile: ReturnType<typeof JSON.parse>;
  signature: { algorithm: 'ECDSA-P256-SHA256'; value: string; public_key: JsonWebKey; key_id: string };
};

function base64(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local signing storage.'));
  });
}

async function readIdentity(): Promise<StoredIdentity | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    request.onsuccess = () => { db.close(); resolve(request.result as StoredIdentity | undefined); };
    request.onerror = () => { db.close(); reject(request.error || new Error('Could not read local signing identity.')); };
  });
}

async function writeIdentity(identity: StoredIdentity) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(identity, KEY);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Could not save local signing identity.')); };
  });
}

async function fingerprint(key: CryptoKey) {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(jwk)));
  return `local-p256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 24)}`;
}

export async function localSigningIdentity(): Promise<StoredIdentity> {
  const existing = await readIdentity();
  if (existing) return existing;
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']) as CryptoKeyPair;
  const identity = { privateKey: pair.privateKey, publicKey: pair.publicKey, keyId: await fingerprint(pair.publicKey) };
  await writeIdentity(identity);
  return identity;
}

export async function signedCasefile(receipt: RunReceipt): Promise<string> {
  const payload = casefile(receipt);
  const identity = await localSigningIdentity();
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, identity.privateKey, new TextEncoder().encode(payload));
  const output: SignedCasefile = {
    casefile: JSON.parse(payload),
    signature: {
      algorithm: 'ECDSA-P256-SHA256',
      value: base64(signature),
      public_key: await crypto.subtle.exportKey('jwk', identity.publicKey),
      key_id: identity.keyId
    }
  };
  return JSON.stringify(output, null, 2);
}

export async function verifySignedCasefile(value: string | SignedCasefile) {
  const signed = typeof value === 'string' ? JSON.parse(value) as SignedCasefile : value;
  if (signed.signature.algorithm !== 'ECDSA-P256-SHA256') return false;
  const publicKey = await crypto.subtle.importKey('jwk', signed.signature.public_key, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
  const bytes = Uint8Array.from(atob(signed.signature.value), character => character.charCodeAt(0));
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, bytes, new TextEncoder().encode(JSON.stringify(signed.casefile, null, 2)));
}
