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
  } catch (error) {
    console.error('Error sending drawing:', error);
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
  const db = getFirestoreDb();
  const drawingRef = doc(db, 'drawings', pairingId);

  const unsubscribe = onSnapshot(drawingRef, (snapshot) => {
    if (snapshot.exists()) {
      const drawing = snapshot.data() as DrawingData;
      onDrawingReceived(drawing);
    }
  });

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
export async function getPartnerFcmToken(pairingId: string): Promise<string | null> {
  try {
    const db = getFirestoreDb();
    const pairingRef = doc(db, 'pairings', pairingId);
    const pairingSnap = await getDoc(pairingRef);

    if (pairingSnap.exists()) {
      const data = pairingSnap.data();
      return data.partnerFcmToken || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting partner FCM token:', error);
    return null;
  }
}
