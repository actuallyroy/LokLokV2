/**
 * End-to-End Encryption utilities for LokLok
 * Uses TweetNaCl for X25519 key exchange and secretbox encryption
 */

import nacl from 'tweetnacl';
import {
  encodeBase64,
  decodeBase64,
  encodeUTF8,
  decodeUTF8,
} from 'tweetnacl-util';
import EncryptedStorage from 'react-native-encrypted-storage';

// Secure storage keys
const PRIVATE_KEY_STORAGE = 'loklok_private_key';
const PUBLIC_KEY_STORAGE = 'loklok_public_key';
const SHARED_SECRET_STORAGE = 'loklok_shared_secret';

export interface KeyPair {
  publicKey: string; // Base64 encoded
  secretKey: string; // Base64 encoded
}

/**
 * Generate a new X25519 keypair for key exchange
 */
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Derive a shared secret from our private key and partner's public key
 * Uses X25519 Diffie-Hellman key exchange
 */
export function deriveSharedSecret(
  ourSecretKey: string,
  theirPublicKey: string
): string {
  const ourSecretKeyBytes = decodeBase64(ourSecretKey);
  const theirPublicKeyBytes = decodeBase64(theirPublicKey);

  // Use scalar multiplication to derive shared secret
  const sharedSecret = nacl.box.before(theirPublicKeyBytes, ourSecretKeyBytes);

  return encodeBase64(sharedSecret);
}

/**
 * Encrypt data using the shared secret (NaCl secretbox)
 * Returns base64-encoded ciphertext with nonce prepended
 */
export function encryptData(data: string, sharedSecret: string): string {
  const secretKeyBytes = decodeBase64(sharedSecret);
  const messageBytes = decodeUTF8(data);

  // Generate random nonce (24 bytes for secretbox)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  // Encrypt
  const encrypted = nacl.secretbox(messageBytes, nonce, secretKeyBytes);

  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  // Prepend nonce to ciphertext
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);

  return encodeBase64(fullMessage);
}

/**
 * Decrypt data using the shared secret
 * Expects base64-encoded ciphertext with nonce prepended
 */
export function decryptData(encryptedData: string, sharedSecret: string): string {
  const secretKeyBytes = decodeBase64(sharedSecret);
  const fullMessage = decodeBase64(encryptedData);

  // Extract nonce and ciphertext
  const nonce = fullMessage.slice(0, nacl.secretbox.nonceLength);
  const ciphertext = fullMessage.slice(nacl.secretbox.nonceLength);

  // Decrypt
  const decrypted = nacl.secretbox.open(ciphertext, nonce, secretKeyBytes);

  if (!decrypted) {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }

  return encodeUTF8(decrypted);
}

/**
 * Store keypair securely on device
 */
export async function storeKeyPair(keyPair: KeyPair): Promise<void> {
  await EncryptedStorage.setItem(PRIVATE_KEY_STORAGE, keyPair.secretKey);
  await EncryptedStorage.setItem(PUBLIC_KEY_STORAGE, keyPair.publicKey);
}

/**
 * Retrieve stored keypair
 */
export async function getStoredKeyPair(): Promise<KeyPair | null> {
  const secretKey = await EncryptedStorage.getItem(PRIVATE_KEY_STORAGE);
  const publicKey = await EncryptedStorage.getItem(PUBLIC_KEY_STORAGE);

  if (!secretKey || !publicKey) {
    return null;
  }

  return { publicKey, secretKey };
}

/**
 * Store the derived shared secret securely
 */
export async function storeSharedSecret(sharedSecret: string): Promise<void> {
  await EncryptedStorage.setItem(SHARED_SECRET_STORAGE, sharedSecret);
}

/**
 * Retrieve the stored shared secret
 */
export async function getStoredSharedSecret(): Promise<string | null> {
  return await EncryptedStorage.getItem(SHARED_SECRET_STORAGE);
}

/**
 * Clear all encryption keys (used when disconnecting)
 */
export async function clearEncryptionKeys(): Promise<void> {
  await EncryptedStorage.removeItem(SHARED_SECRET_STORAGE);
  // Keep keypair for future pairings - only clear shared secret
}

/**
 * Initialize encryption - generates keypair if not exists
 */
export async function initializeEncryption(): Promise<KeyPair> {
  let keyPair = await getStoredKeyPair();

  if (!keyPair) {
    keyPair = generateKeyPair();
    await storeKeyPair(keyPair);
    console.log('Generated new encryption keypair');
  }

  return keyPair;
}

/**
 * Encrypt stroke data for transmission
 */
export async function encryptStrokes(strokesJson: string): Promise<string | null> {
  const sharedSecret = await getStoredSharedSecret();

  if (!sharedSecret) {
    console.warn('No shared secret available - sending unencrypted');
    return null;
  }

  try {
    return encryptData(strokesJson, sharedSecret);
  } catch (error) {
    console.error('Failed to encrypt strokes:', error);
    return null;
  }
}

/**
 * Decrypt received stroke data
 */
export async function decryptStrokes(encryptedData: string): Promise<string | null> {
  const sharedSecret = await getStoredSharedSecret();

  if (!sharedSecret) {
    console.warn('No shared secret available - cannot decrypt');
    return null;
  }

  try {
    return decryptData(encryptedData, sharedSecret);
  } catch (error) {
    console.error('Failed to decrypt strokes:', error);
    return null;
  }
}
