import {
  Timestamp,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { nanoid } from "nanoid";

import { FIRESTORE_BATCH_LIMIT } from "@/lib/constants";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { QrDoc, QrStatus } from "@/types";

import { sanitizeMeta, stripUndefined } from "./helpers";

export interface NewQrInput {
  name: string;
  email?: string;
  label?: string;
  meta?: Record<string, string>;
}

export interface QrValidityWindow {
  validFrom: Date;
  validUntil: Date;
}

export interface QrDetailsInput {
  name: string;
  email?: string;
  label?: string;
  meta?: Record<string, string>;
}

function mapQr(
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
): QrDoc {
  const data = snapshot.data() ?? {};
  return {
    meta: {},
    status: "active",
    used: false,
    scanCount: 0,
    ...data,
    token: snapshot.id,
  } as QrDoc;
}

export function subscribeQrs(
  eventId: string,
  onData: (qrs: QrDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "qrs"),
    where("eventId", "==", eventId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(mapQr)),
    (error) => onError?.(error),
  );
}

export async function createQrs(
  eventId: string,
  inputs: NewQrInput[],
  window: QrValidityWindow,
): Promise<string[]> {
  if (inputs.length === 0) return [];

  const db = getFirebaseDb();
  const eventRef = doc(db, "events", eventId);
  const validFrom = Timestamp.fromDate(window.validFrom);
  const validUntil = Timestamp.fromDate(window.validUntil);
  const createdAt = Timestamp.now();
  const tokens: string[] = [];

  for (let offset = 0; offset < inputs.length; offset += FIRESTORE_BATCH_LIMIT) {
    const chunk = inputs.slice(offset, offset + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);

    for (const input of chunk) {
      const token = nanoid(24);
      tokens.push(token);
      batch.set(
        doc(db, "qrs", token),
        stripUndefined({
          eventId,
          name: input.name.trim(),
          email: input.email?.trim() || null,
          label: input.label?.trim() || null,
          meta: sanitizeMeta(input.meta),
          validFrom,
          validUntil,
          status: "active",
          used: false,
          scanCount: 0,
          firstScannedAt: null,
          lastScannedAt: null,
          createdAt,
        }),
      );
    }

    batch.update(eventRef, { qrCount: increment(chunk.length) });
    await batch.commit();
  }

  return tokens;
}

export async function updateQrDetails(
  token: string,
  details: QrDetailsInput,
): Promise<void> {
  await updateDoc(
    doc(getFirebaseDb(), "qrs", token),
    stripUndefined({
      name: details.name.trim(),
      email: details.email?.trim() || null,
      label: details.label?.trim() || null,
      meta: sanitizeMeta(details.meta),
    }),
  );
}

export async function setQrStatus(
  token: string,
  status: QrStatus,
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "qrs", token), { status });
}

export async function setManyQrStatus(
  tokens: string[],
  status: QrStatus,
): Promise<void> {
  if (tokens.length === 0) return;
  const db = getFirebaseDb();
  for (let offset = 0; offset < tokens.length; offset += FIRESTORE_BATCH_LIMIT) {
    const chunk = tokens.slice(offset, offset + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const token of chunk) {
      batch.update(doc(db, "qrs", token), { status });
    }
    await batch.commit();
  }
}

export async function setQrValidityWindow(
  token: string,
  window: QrValidityWindow,
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "qrs", token), {
    validFrom: Timestamp.fromDate(window.validFrom),
    validUntil: Timestamp.fromDate(window.validUntil),
  });
}

async function collectScanRefs(tokens: string[]): Promise<DocumentReference[]> {
  const db = getFirebaseDb();
  const refs: DocumentReference[] = [];

  for (const token of tokens) {
    const scans = collection(db, "qrs", token, "scans");
    let last: QueryDocumentSnapshot<DocumentData> | null = null;

    for (;;) {
      const page: QuerySnapshot<DocumentData> = last
        ? await getDocs(query(scans, startAfter(last), limit(400)))
        : await getDocs(query(scans, limit(400)));
      page.forEach((scan) => refs.push(scan.ref));
      if (page.size < 400) break;
      last = page.docs[page.docs.length - 1] ?? null;
      if (!last) break;
    }
  }

  return refs;
}

/**
 * Delete QR documents and their scan history. Optionally decrements the
 * parent event's `qrCount`.
 */
export async function deleteQrs(
  tokens: string[],
  eventId?: string,
): Promise<void> {
  if (tokens.length === 0) return;

  const db = getFirebaseDb();
  const scanRefs = await collectScanRefs(tokens);
  const qrRefs = tokens.map((token) => doc(db, "qrs", token));
  const refs = [...scanRefs, ...qrRefs];

  for (let offset = 0; offset < refs.length; offset += FIRESTORE_BATCH_LIMIT) {
    const chunk = refs.slice(offset, offset + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const ref of chunk) batch.delete(ref);
    await batch.commit();
  }

  if (eventId) {
    await updateDoc(doc(db, "events", eventId), {
      qrCount: increment(-tokens.length),
    });
  }
}

export async function deleteQr(token: string, eventId?: string): Promise<void> {
  await deleteQrs([token], eventId);
}

/** Delete every QR belonging to an event (used when deleting the event). */
export async function deleteQrsForEvent(eventId: string): Promise<void> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    query(collection(db, "qrs"), where("eventId", "==", eventId)),
  );
  await deleteQrs(snapshot.docs.map((document) => document.id));
}
