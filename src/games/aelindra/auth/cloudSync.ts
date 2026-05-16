/* ============================================
   AELINDRA · auth/cloudSync.ts
   Lecture / écriture du save dans Firestore
   ============================================ */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { PersistedGameState } from '../state/types';

const COL = 'saves';

export async function uploadSave(
  uid: string,
  save: Partial<PersistedGameState>,
): Promise<void> {
  await setDoc(doc(db, COL, uid), { ...save, _ts: Date.now() });
}

export async function downloadSave(
  uid: string,
): Promise<Partial<PersistedGameState> | null> {
  const snap = await getDoc(doc(db, COL, uid));
  if (!snap.exists()) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _ts, ...save } = snap.data() as Record<string, unknown>;
  return save as Partial<PersistedGameState>;
}
