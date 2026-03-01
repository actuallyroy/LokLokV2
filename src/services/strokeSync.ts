import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import { Stroke } from '../components/canvas';
import { encryptStrokes, decryptStrokes } from './crypto';

export interface DrawingData {
  strokes: Stroke[];
  senderId: string;
  senderName: string;
  timestamp: Timestamp | null;
  canvasWidth: number;
  canvasHeight: number;
  encrypted?: boolean;
  encryptedData?: string;
}

export interface PairingData {
  oderId: string;
  partnerDeviceId: string;
  partnerFcmToken: string;
  pairedAt: Timestamp;
}

/**
 * Send drawing strokes to partner
 * Stores in Firestore under the pairing document
 * Note: Only strokes are sent - receiver composites locally using their own background
 * Data is encrypted end-to-end if E2E is enabled
 */
export async function sendDrawingToPartner(
  pairingId: string,
  strokes: Stroke[],
  senderId: string,
  senderName: string,
  canvasWidth: number,
  canvasHeight: number
): Promise<boolean> {
  try {
    console.log('=== sendDrawingToPartner START ===');
    console.log('pairingId:', pairingId);
    console.log('strokeCount:', strokes.length);
    console.log('senderId:', senderId);

    if (!pairingId) {
      console.error('FAIL: No pairingId provided');
      return false;
    }

    const db = getFirestoreDb();
    console.log('Firestore DB obtained');
    const drawingRef = doc(db, 'drawings', pairingId);

    // Try to encrypt the stroke data
    const strokesJson = JSON.stringify(strokes);
    console.log('Encrypting strokes...');
    const encryptedData = await encryptStrokes(strokesJson);
    console.log('Encryption result:', encryptedData ? 'SUCCESS' : 'NO SHARED SECRET');

    let drawingData: any;

    if (encryptedData) {
      // E2E encrypted - only send encrypted blob
      console.log('Preparing E2E encrypted drawing data');
      drawingData = {
        encrypted: true,
        encryptedData,
        senderId,
        senderName,
        timestamp: serverTimestamp(),
        canvasWidth,
        canvasHeight,
        // Don't include raw strokes when encrypted
      };
    } else {
      // Fallback to unencrypted (for backwards compatibility or if no shared secret)
      console.log('Preparing unencrypted drawing data (no E2E key)');
      drawingData = {
        encrypted: false,
        strokes,
        senderId,
        senderName,
        timestamp: serverTimestamp(),
        canvasWidth,
        canvasHeight,
      };
    }

    console.log('Writing to Firestore...');
    await setDoc(drawingRef, drawingData);
    console.log('=== sendDrawingToPartner SUCCESS ===');
    return true;
  } catch (error: any) {
    console.error('=== sendDrawingToPartner FAILED ===');
    console.error('Error message:', error?.message || error);
    console.error('Error code:', error?.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
    return false;
  }
}

/**
 * Get the latest drawing for a pairing
 * Handles both encrypted and unencrypted data
 */
export async function getLatestDrawing(pairingId: string): Promise<DrawingData | null> {
  try {
    const db = getFirestoreDb();
    const drawingRef = doc(db, 'drawings', pairingId);
    const drawingSnap = await getDoc(drawingRef);

    if (drawingSnap.exists()) {
      const rawData = drawingSnap.data();

      if (rawData.encrypted && rawData.encryptedData) {
        // Decrypt the drawing data
        console.log('Decrypting stored drawing...');
        try {
          const decryptedJson = await decryptStrokes(rawData.encryptedData);
          if (decryptedJson) {
            const strokes = JSON.parse(decryptedJson) as Stroke[];
            return {
              strokes,
              senderId: rawData.senderId,
              senderName: rawData.senderName,
              timestamp: rawData.timestamp,
              canvasWidth: rawData.canvasWidth,
              canvasHeight: rawData.canvasHeight,
              encrypted: true,
            };
          } else {
            console.error('Failed to decrypt drawing - no shared secret');
            return null;
          }
        } catch (err) {
          console.error('Failed to decrypt drawing:', err);
          return null;
        }
      }

      return rawData as DrawingData;
    }
    return null;
  } catch (error) {
    console.error('Error getting drawing:', error);
    return null;
  }
}

/**
 * Subscribe to drawing updates for a pairing
 * Handles both encrypted and unencrypted data
 */
export function subscribeToDrawings(
  pairingId: string,
  onDrawingReceived: (drawing: DrawingData) => void
): () => void {
  console.log(`[${Date.now()}] Setting up Firestore subscription for: ${pairingId}`);
  const db = getFirestoreDb();
  const drawingRef = doc(db, 'drawings', pairingId);

  let snapshotCount = 0;

  const unsubscribe = onSnapshot(
    drawingRef,
    async (snapshot) => {
      snapshotCount++;
      console.log(`[${Date.now()}] Firestore snapshot #${snapshotCount} received, exists: ${snapshot.exists()}`);
      if (snapshot.exists()) {
        const rawData = snapshot.data();
        console.log(`[${Date.now()}] Drawing data received, encrypted: ${rawData.encrypted}`);

        let drawing: DrawingData;

        if (rawData.encrypted && rawData.encryptedData) {
          // Decrypt the drawing data
          console.log(`[${Date.now()}] Decrypting E2E encrypted drawing...`);
          try {
            const decryptedJson = await decryptStrokes(rawData.encryptedData);
            if (decryptedJson) {
              const strokes = JSON.parse(decryptedJson) as Stroke[];
              drawing = {
                strokes,
                senderId: rawData.senderId,
                senderName: rawData.senderName,
                timestamp: rawData.timestamp,
                canvasWidth: rawData.canvasWidth,
                canvasHeight: rawData.canvasHeight,
                encrypted: true,
              };
              console.log(`[${Date.now()}] Decrypted ${strokes.length} strokes successfully`);
            } else {
              console.error(`[${Date.now()}] Failed to decrypt drawing - no shared secret`);
              return;
            }
          } catch (err) {
            console.error(`[${Date.now()}] Failed to decrypt drawing:`, err);
            return;
          }
        } else {
          // Unencrypted data (backwards compatibility)
          drawing = rawData as DrawingData;
          console.log(`[${Date.now()}] Using unencrypted drawing: ${drawing.strokes?.length} strokes`);
        }

        console.log(`[${Date.now()}] Calling onDrawingReceived callback...`);
        try {
          onDrawingReceived(drawing);
          console.log(`[${Date.now()}] onDrawingReceived callback completed`);
        } catch (err) {
          console.error(`[${Date.now()}] ERROR in onDrawingReceived:`, err);
        }
      }
    },
    (error) => {
      console.error(`[${Date.now()}] Firestore subscription error:`, error);
    }
  );

  return unsubscribe;
}

/**
 * Store pairing information
 */
export async function storePairing(
  pairingId: string,
  deviceId: string,
  partnerDeviceId: string,
  partnerFcmToken: string
): Promise<boolean> {
  try {
    const db = getFirestoreDb();
    const pairingRef = doc(db, 'pairings', pairingId);

    await setDoc(pairingRef, {
      oderId: deviceId,
      partnerDeviceId,
      partnerFcmToken,
      pairedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error storing pairing:', error);
    return false;
  }
}

/**
 * Get partner's FCM token for sending push notifications
 */
export async function getPartnerFcmToken(pairingId: string, myDeviceId: string): Promise<string | null> {
  try {
    const db = getFirestoreDb();
    const pairingRef = doc(db, 'pairings', pairingId);
    const pairingSnap = await getDoc(pairingRef);

    if (pairingSnap.exists()) {
      const data = pairingSnap.data();
      // Find partner's token (the one that's not mine)
      const deviceTokens = data.deviceTokens || {};
      for (const [deviceId, token] of Object.entries(deviceTokens)) {
        if (deviceId !== myDeviceId) {
          return token as string;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting partner FCM token:', error);
    return null;
  }
}

export interface PairingInfo {
  pairingId: string;
  partnerName: string;
  partnerId: string;
  partnerFcmToken: string;
  partnerPublicKey?: string;
}

/**
 * Create a pairing in Firebase when Device B scans Device A's QR code
 * This stores the pairing info so Device A can be notified
 * Includes public key exchange for E2E encryption
 */
export async function createPairing(
  myDeviceId: string,
  myFcmToken: string,
  myName: string,
  myPublicKey: string,
  partnerDeviceId: string,
  partnerFcmToken: string,
  partnerName: string,
  partnerPublicKey: string
): Promise<string | null> {
  try {
    const db = getFirestoreDb();

    // Create a deterministic pairing ID from both device IDs
    const sortedIds = [myDeviceId, partnerDeviceId].sort();
    const pairingId = `pair_${sortedIds[0]}_${sortedIds[1]}`.replace(/[^a-zA-Z0-9_]/g, '');

    console.log('Creating pairing with E2E:', { pairingId, myDeviceId, partnerDeviceId });

    // Store pairing for Device A (the one who showed QR)
    // Include Device B's public key so Device A can derive shared secret
    await setDoc(doc(db, 'pending_pairings', partnerDeviceId), {
      pairingId,
      partnerId: myDeviceId,
      partnerName: myName,
      partnerFcmToken: myFcmToken,
      partnerPublicKey: myPublicKey, // Device B's public key for Device A
      createdAt: serverTimestamp(),
    });

    // Store the main pairing document with both public keys
    // Use setDoc to completely overwrite any existing document
    await setDoc(doc(db, 'pairings', pairingId), {
      devices: [myDeviceId, partnerDeviceId],
      deviceTokens: {
        [myDeviceId]: myFcmToken,
        [partnerDeviceId]: partnerFcmToken,
      },
      deviceNames: {
        [myDeviceId]: myName,
        [partnerDeviceId]: partnerName,
      },
      devicePublicKeys: {
        [myDeviceId]: myPublicKey,
        [partnerDeviceId]: partnerPublicKey,
      },
      e2eEnabled: true,
      status: 'active',
      createdAt: serverTimestamp(),
    });

    // Also delete any old drawing document for this pairing
    try {
      await deleteDoc(doc(db, 'drawings', pairingId));
      console.log('Old drawing document cleared');
    } catch (e) {
      // Ignore if doesn't exist
    }

    console.log('Pairing with E2E created successfully');
    return pairingId;
  } catch (error: any) {
    console.error('Error creating pairing:', error?.message || error);
    return null;
  }
}

/**
 * Listen for incoming pairing requests (when someone scans our QR code)
 * Includes partner's public key for E2E encryption
 */
export function listenForPairing(
  myDeviceId: string,
  onPaired: (pairingInfo: PairingInfo) => void
): () => void {
  const db = getFirestoreDb();
  const pendingRef = doc(db, 'pending_pairings', myDeviceId);

  console.log('Listening for pairing requests for device:', myDeviceId);

  const unsubscribe = onSnapshot(pendingRef, async (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      console.log('Pairing request received with E2E:', data);

      onPaired({
        pairingId: data.pairingId,
        partnerName: data.partnerName,
        partnerId: data.partnerId,
        partnerFcmToken: data.partnerFcmToken,
        partnerPublicKey: data.partnerPublicKey, // Partner's public key for E2E
      });

      // Clean up the pending pairing document
      try {
        await deleteDoc(pendingRef);
      } catch (e) {
        console.log('Could not delete pending pairing:', e);
      }
    }
  });

  return unsubscribe;
}

/**
 * Notify partner of disconnection and clean up Firestore data
 */
export async function notifyPartnerOfDisconnect(
  pairingId: string,
  myDeviceId: string
): Promise<boolean> {
  try {
    const db = getFirestoreDb();
    const pairingRef = doc(db, 'pairings', pairingId);
    const drawingRef = doc(db, 'drawings', pairingId);

    // Update the pairing document with disconnection info
    await updateDoc(pairingRef, {
      status: 'disconnected',
      disconnectedBy: myDeviceId,
      disconnectedAt: serverTimestamp(),
    });

    // Delete the drawing document to clean up for future re-pairing
    try {
      await deleteDoc(drawingRef);
      console.log('Drawing document deleted');
    } catch (e) {
      console.log('Could not delete drawing document:', e);
    }

    console.log('Partner notified of disconnection');
    return true;
  } catch (error) {
    console.error('Error notifying partner of disconnect:', error);
    return false;
  }
}

/**
 * Listen for pairing status changes (e.g., when partner disconnects)
 */
export function listenForPairingStatus(
  pairingId: string,
  myDeviceId: string,
  onPartnerDisconnected: () => void
): () => void {
  const db = getFirestoreDb();
  const pairingRef = doc(db, 'pairings', pairingId);
  let hasTriggeredDisconnect = false;

  console.log('Listening for pairing status changes:', pairingId);

  const unsubscribe = onSnapshot(
    pairingRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Check if pairing was disconnected by the other device
        // Only trigger once to avoid multiple disconnect calls
        if (data.status === 'disconnected' && data.disconnectedBy !== myDeviceId && !hasTriggeredDisconnect) {
          console.log('Partner disconnected, notifying...');
          hasTriggeredDisconnect = true;
          onPartnerDisconnected();
        }
      } else if (!hasTriggeredDisconnect) {
        // Document was deleted - partner disconnected
        console.log('Pairing document deleted, partner disconnected');
        hasTriggeredDisconnect = true;
        onPartnerDisconnected();
      }
    },
    (error) => {
      console.error('Error listening to pairing status:', error);
    }
  );

  return unsubscribe;
}
