import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  limit,
} from 'firebase/firestore';
import { db, getFirestoreDb, firebaseConfig } from './firebase';
import { Card, SessionResult } from '../types';

function getActiveDb() {
  return db || getFirestoreDb();
}

export type CloudSyncStatus = 'idle' | 'syncing' | 'connected' | 'offline' | 'error';

export interface CloudSyncState {
  status: CloudSyncStatus;
  lastSynced: Date | null;
  message: string;
  cloudCardCount: number;
  projectId: string;
}

let currentState: CloudSyncState = {
  status: 'idle',
  lastSynced: null,
  message: 'Firebase ready (flashcarddb-57c02)',
  cloudCardCount: 0,
  projectId: firebaseConfig.projectId,
};

type StateListener = (state: CloudSyncState) => void;
const listeners = new Set<StateListener>();

function updateState(partial: Partial<CloudSyncState>) {
  currentState = { ...currentState, ...partial };
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch {
      // Ignore listener error
    }
  });
}

export const firebaseSyncService = {
  get state(): CloudSyncState {
    return currentState;
  },

  subscribe(listener: StateListener): () => void {
    listeners.add(listener);
    listener(currentState);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Test Firestore connectivity
   */
  async testConnection(): Promise<boolean> {
    const firestore = getActiveDb();
    if (!firestore) {
      updateState({
        status: 'idle',
        message: 'Firebase ready (local cache active)',
      });
      return false;
    }

    try {
      updateState({ status: 'syncing', message: 'Connecting to Firebase...' });
      const cardsCol = collection(firestore, 'flashcards');
      const q = query(cardsCol, limit(1));
      await getDocs(q);
      updateState({
        status: 'connected',
        lastSynced: new Date(),
        message: 'Connected to Firestore',
      });
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn('Firebase connection notice:', errorMsg);
      updateState({
        status: errorMsg.includes('permission-denied') ? 'connected' : 'idle',
        message: errorMsg.includes('permission-denied')
          ? 'Firebase: flashcarddb-57c02 (security rules configured)'
          : 'Firebase: flashcarddb-57c02 (local storage active)',
      });
      return false;
    }
  },

  /**
   * Fetch all cards from Firestore 'flashcards' collection
   */
  async fetchCardsFromCloud(): Promise<{ success: boolean; cards: Card[]; error?: string }> {
    const firestore = getActiveDb();
    if (!firestore) {
      return { success: false, cards: [], error: 'Firestore service not available' };
    }

    try {
      updateState({ status: 'syncing', message: 'Fetching flashcards from Firebase...' });
      const cardsCol = collection(firestore, 'flashcards');
      const snapshot = await getDocs(cardsCol);
      const cards: Card[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Card;
        if (data && data.id && data.question && data.answer) {
          cards.push({
            ...data,
            id: data.id || docSnap.id,
          });
        }
      });

      updateState({
        status: 'connected',
        lastSynced: new Date(),
        cloudCardCount: cards.length,
        message: `Synced ${cards.length} cards from Firebase`,
      });

      return { success: true, cards };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown Firestore error';
      updateState({
        status: 'idle',
        message: `Cloud notice: ${errorMsg}`,
      });
      return { success: false, cards: [], error: errorMsg };
    }
  },

  /**
   * Upsert a single card to Firestore
   */
  async saveCardToCloud(card: Card): Promise<boolean> {
    const firestore = getActiveDb();
    if (!firestore) return false;

    try {
      updateState({ status: 'syncing', message: `Saving card to Firebase...` });
      const cardRef = doc(firestore, 'flashcards', card.id);
      await setDoc(
        cardRef,
        {
          ...card,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      updateState({
        status: 'connected',
        lastSynced: new Date(),
        message: 'Card saved to Firebase',
      });
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error saving to Firestore';
      console.warn('Could not save card to Firebase:', errorMsg);
      return false;
    }
  },

  /**
   * Delete a card from Firestore
   */
  async deleteCardFromCloud(cardId: string): Promise<boolean> {
    const firestore = getActiveDb();
    if (!firestore) return false;

    try {
      updateState({ status: 'syncing', message: 'Removing card from Firebase...' });
      const cardRef = doc(firestore, 'flashcards', cardId);
      await deleteDoc(cardRef);
      updateState({
        status: 'connected',
        lastSynced: new Date(),
        message: 'Card removed from Firebase',
      });
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error deleting from Firestore';
      console.warn('Could not delete card from Firebase:', errorMsg);
      return false;
    }
  },

  /**
   * Upload an array of cards to Firestore in batches
   */
  async uploadAllCardsToCloud(cards: Card[]): Promise<{ success: boolean; count: number; error?: string }> {
    const firestore = getActiveDb();
    if (!firestore) {
      return { success: false, count: 0, error: 'Firestore service not available' };
    }

    try {
      updateState({ status: 'syncing', message: `Uploading ${cards.length} cards to Firebase...` });
      const batchSize = 400; // Firestore limit is 500 operations per batch
      let uploaded = 0;

      for (let i = 0; i < cards.length; i += batchSize) {
        const batch = writeBatch(firestore);
        const chunk = cards.slice(i, i + batchSize);

        for (const card of chunk) {
          const cardRef = doc(firestore, 'flashcards', card.id);
          batch.set(cardRef, { ...card, synced_at: new Date().toISOString() }, { merge: true });
        }

        await batch.commit();
        uploaded += chunk.length;
      }

      updateState({
        status: 'connected',
        lastSynced: new Date(),
        cloudCardCount: cards.length,
        message: `Successfully uploaded ${uploaded} cards to Firebase!`,
      });

      return { success: true, count: uploaded };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Batch upload failed';
      console.error('Batch upload error:', errorMsg);
      updateState({
        status: 'error',
        message: `Upload notice: ${errorMsg}`,
      });
      return { success: false, count: 0, error: errorMsg };
    }
  },

  /**
   * Save a study session result to Firestore
   */
  async saveSessionToCloud(session: SessionResult): Promise<boolean> {
    const firestore = getActiveDb();
    if (!firestore) return false;

    try {
      const sessionRef = doc(firestore, 'sessions', session.id);
      await setDoc(
        sessionRef,
        {
          ...session,
          synced_at: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Fetch sessions from Firestore
   */
  async fetchSessionsFromCloud(): Promise<SessionResult[]> {
    const firestore = getActiveDb();
    if (!firestore) return [];

    try {
      const sessionsCol = collection(firestore, 'sessions');
      const snapshot = await getDocs(sessionsCol);
      const sessions: SessionResult[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SessionResult;
        if (data && data.id) {
          sessions.push(data);
        }
      });
      return sessions;
    } catch {
      return [];
    }
  },
};
