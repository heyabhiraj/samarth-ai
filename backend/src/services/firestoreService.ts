import type { Env } from "../types";
import { getGoogleAccessToken, SCOPES } from "./googleAuthService";

type FirestoreValue = Record<string, unknown>;

function baseUrl(env: Env): string {
  return `https://firestore.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/databases/(default)/documents`;
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
  }
  throw new Error(`Unsupported value type for Firestore: ${typeof value}`);
}

function fromFirestoreValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] }).values ?? [];
    return values.map(fromFirestoreValue);
  }
  if ("mapValue" in value) {
    const fields = (value.mapValue as { fields?: Record<string, FirestoreValue> }).fields ?? {};
    return fromFirestoreFields(fields);
  }
  return null;
}

export function toFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

export function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    obj[key] = fromFirestoreValue(value);
  }
  return obj;
}

function extractId(documentName: string): string {
  const parts = documentName.split("/");
  return parts[parts.length - 1];
}

async function authHeaders(env: Env): Promise<HeadersInit> {
  const token = await getGoogleAccessToken(env, [SCOPES.firestore]);
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function getDocument<T = Record<string, unknown>>(
  env: Env,
  collection: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const res = await fetch(`${baseUrl(env)}/${collection}/${encodeURIComponent(id)}`, {
    headers: await authHeaders(env),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore getDocument failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { name: string; fields?: Record<string, FirestoreValue> };
  return { id: extractId(json.name), ...(fromFirestoreFields(json.fields ?? {}) as T) };
}

export async function setDocument(
  env: Env,
  collection: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${baseUrl(env)}/${collection}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: await authHeaders(env),
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore setDocument failed (${res.status}): ${await res.text()}`);
}

export async function createDocument<T = Record<string, unknown>>(
  env: Env,
  collection: string,
  data: Record<string, unknown>,
  id?: string
): Promise<T & { id: string }> {
  const url = id
    ? `${baseUrl(env)}/${collection}?documentId=${encodeURIComponent(id)}`
    : `${baseUrl(env)}/${collection}`;

  const res = await fetch(url, {
    method: "POST",
    headers: await authHeaders(env),
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore createDocument failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { name: string; fields?: Record<string, FirestoreValue> };
  return { id: extractId(json.name), ...(fromFirestoreFields(json.fields ?? {}) as T) };
}

export async function deleteDocument(env: Env, collection: string, id: string): Promise<void> {
  const res = await fetch(`${baseUrl(env)}/${collection}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(env),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Firestore deleteDocument failed (${res.status}): ${await res.text()}`);
  }
}

export interface FieldFilter {
  field: string;
  op: "EQUAL" | "LESS_THAN" | "GREATER_THAN" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN_OR_EQUAL";
  value: unknown;
}

export interface QueryOptions {
  filters?: FieldFilter[];
  orderBy?: { field: string; direction?: "ASCENDING" | "DESCENDING" };
  limit?: number;
}

export async function runQuery<T = Record<string, unknown>>(
  env: Env,
  collection: string,
  options: QueryOptions = {}
): Promise<Array<T & { id: string }>> {
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: collection }],
  };

  if (options.filters && options.filters.length > 0) {
    structuredQuery.where = {
      compositeFilter: {
        op: "AND",
        filters: options.filters.map((f) => ({
          fieldFilter: {
            field: { fieldPath: f.field },
            op: f.op,
            value: toFirestoreValue(f.value),
          },
        })),
      },
    };
  }

  if (options.orderBy) {
    structuredQuery.orderBy = [
      { field: { fieldPath: options.orderBy.field }, direction: options.orderBy.direction ?? "ASCENDING" },
    ];
  }

  if (options.limit) {
    structuredQuery.limit = options.limit;
  }

  const res = await fetch(`${baseUrl(env)}:runQuery`, {
    method: "POST",
    headers: await authHeaders(env),
    body: JSON.stringify({ structuredQuery }),
  });

  if (!res.ok) throw new Error(`Firestore runQuery failed (${res.status}): ${await res.text()}`);

  const json = (await res.json()) as Array<{ document?: { name: string; fields?: Record<string, FirestoreValue> } }>;
  return json
    .filter((entry) => entry.document)
    .map((entry) => ({
      id: extractId(entry.document!.name),
      ...(fromFirestoreFields(entry.document!.fields ?? {}) as T),
    }));
}
