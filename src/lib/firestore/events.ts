import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import {
  DEFAULT_SHOW_FIELDS,
  createDefaultDisplay,
} from "@/lib/constants";
import { toDateTimeLocal } from "@/lib/format";
import type {
  DisplayConfig,
  EventDoc,
  EventInput,
} from "@/types";

import { stripUndefined } from "./helpers";
import { deleteQrsForEvent } from "./qrs";

function mapEvent(
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
): EventDoc {
  const data = snapshot.data() ?? {};
  return {
    display: createDefaultDisplay(),
    showFields: [...DEFAULT_SHOW_FIELDS],
    qrCount: 0,
    scanCount: 0,
    status: "active",
    mode: "reusable",
    defaultValidityHours: 48,
    name: "Untitled event",
    ...data,
    id: snapshot.id,
  } as EventDoc;
}

export function subscribeEvents(
  onData: (events: EventDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "events"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(mapEvent)),
    (error) => onError?.(error),
  );
}

export function subscribeEvent(
  eventId: string,
  onData: (event: EventDoc | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "events", eventId),
    (snapshot) => onData(snapshot.exists() ? mapEvent(snapshot) : null),
    (error) => onError?.(error),
  );
}

function inputToFields(input: EventInput) {
  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    startsAt:
      startsAt && !Number.isNaN(startsAt.getTime())
        ? Timestamp.fromDate(startsAt)
        : null,
    endsAt:
      endsAt && !Number.isNaN(endsAt.getTime())
        ? Timestamp.fromDate(endsAt)
        : null,
    defaultValidityHours: input.defaultValidityHours,
    mode: input.mode,
  };
}

export async function createEvent(
  input: EventInput,
  userId: string,
): Promise<string> {
  const ref = await addDoc(
    collection(getFirebaseDb(), "events"),
    stripUndefined({
      ...inputToFields(input),
      status: "active",
      display: createDefaultDisplay(),
      showFields: [...DEFAULT_SHOW_FIELDS],
      createdAt: Timestamp.now(),
      createdBy: userId,
      qrCount: 0,
      scanCount: 0,
    }),
  );
  return ref.id;
}

export async function updateEventDetails(
  eventId: string,
  input: EventInput,
): Promise<void> {
  await updateDoc(
    doc(getFirebaseDb(), "events", eventId),
    stripUndefined(inputToFields(input)),
  );
}

export async function updateEventDisplay(
  eventId: string,
  display: DisplayConfig,
  showFields: string[],
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "events", eventId), {
    display,
    showFields,
  });
}

export async function setEventArchived(
  eventId: string,
  archived: boolean,
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "events", eventId), {
    status: archived ? "archived" : "active",
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteQrsForEvent(eventId);
  await deleteDoc(doc(getFirebaseDb(), "events", eventId));
}

export function eventToFormDefaults(event: EventDoc): EventInput {
  return {
    name: event.name ?? "",
    description: event.description ?? "",
    location: event.location ?? "",
    startsAt: toDateTimeLocal(event.startsAt),
    endsAt: toDateTimeLocal(event.endsAt),
    defaultValidityHours: event.defaultValidityHours ?? 48,
    mode: event.mode ?? "reusable",
  };
}
