import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import { Stroke } from '../components/canvas';

export interface DrawingData {
  strokes: Stroke[];
  senderId: string;
  senderName: string;
  timestamp: Timestamp | null;
  canvasWidth: number;
  canvasHeight: number;
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
    console.log('Sending drawing to partner...', { pairingId, strokeCount: strokes.length });

    if (!pairingId) {
      console.error('No pairingId provided');
      return false;
    }

    const db = getFirestoreDb();
    const drawingRef = doc(db, 'drawings', pairingId);

    const drawingData: DrawingData = {
      strokes,
      senderId,
      senderName,
      timestamp: serverTimestamp() as Timestamp,
      canvasWidth,
      canvasHeight,
    };

    await setDoc(drawingRef, drawingData);
    console.log('Drawing sent to partner successfully');
    return true;
  } catch (error: any) {
    console.error('Error sending drawing:', error?.message || error);
    console.error('Error code:', error?.code);
    return false;
  }
}

/**
 * Get the latest drawing for a pairing
 */
export async function getLatestDrawing(pairingId: string): Promise<DrawingData | null> {
  try {
    const db = getFirestoreDb();
    const drawingRef = doc(db, 'drawings', pairingId);
    const drawingSnap = await getDoc(drawingRef);

    if (drawingSnap.exists()) {
      return drawingSnap.data() as DrawingData;
    }
    return null;
  } catch (error) {
    console.error('Error getting drawing:', error);
    return null;
  }
}

/**
 * Subscribe to drawing updates for a pairing
 */
export function subscribeToDrawings(
  pairingId: string,
  onDrawingReceived: (drawing: DrawingData) => void
): () => void {
  console.log('Setting up Firestore subscription for:', pairingId);
  const db = getFirestoreDb();
  const drawingRef = doc(db, 'drawings', pairingId);

  const unsubscribe = onSnapshot(
    drawingRef,
    (snapshot) => {
      console.log('Firestore snapshot received, exists:', snapshot.exists());
      if (snapshot.exists()) {
        const drawing = snapshot.data() as DrawingData;
        console.log('Drawing data:', drawing.strokes?.length, 'strokes, sender:', drawing.senderId);
        onDrawingReceived(drawing);
      }
    },
    (error) => {
      console.error('Firestore subscription error:', error);
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
}

/**
 * Create a pairing in Firebase when Device B scans Device A's QR code
 * This stores the pairing info so Device A can be notified
 */
export async function createPairing(
  myDeviceId: string,
  myFcmToken: string,
  myName: string,
  partnerDeviceId: string,
  partnerFcmToken: string,
  partnerName: string
): Promise<string | null> {
  try {
    const db = getFirestoreDb();

    // Create a deterministic pairing ID from both device IDs
    const sortedIds = [myDeviceId, partnerDeviceId].sort();
    const pairingId = `pair_${sortedIds[0]}_${sortedIds[1]}`.replace(/[^a-zA-Z0-9_]/g, '');

    console.log('Creating pairing:', { pairingId, myDeviceId, partnerDeviceId });

    // Store pairing for Device A (the one who showed QR)
    await setDoc(doc(db, 'pending_pairings', partnerDeviceId), {
      pairingId,
      partnerId: myDeviceId,
      partnerName: myName,
      partnerFcmToken: myFcmToken,
      createdAt: serverTimestamp(),
    });

    // Store the main pairing document
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
      createdAt: serverTimestamp(),
    });

    console.log('Pairing created successfully');
    return pairingId;
  } catch (error: any) {
    console.error('Error creating pairing:', error?.message || error);
    return null;
  }
}

/**
 * Listen for incoming pairing requests (when someone scans our QR code)
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
      console.log('Pairing request received:', data);

      onPaired({
        pairingId: data.pairingId,
        partnerName: data.partnerName,
        partnerId: data.partnerId,
        partnerFcmToken: data.partnerFcmToken,
      });

      // Clean up the pending pairing document
      try {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(pendingRef);
      } catch (e) {
        console.log('Could not delete pending pairing:', e);
      }
    }
  });

  return unsubscribe;
}
