import { and, desc, eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { contacts, InsertContact, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } }
  values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) { values.role = user.role ?? "admin"; updateSet.role = values.role; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return rows[0]; }
export async function listContacts(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.updatedAt)); }
export async function findContactsByNamePrefix(userId: number, prefix: string) { const db = await getDb(); if (!db) return []; return db.select().from(contacts).where(and(eq(contacts.userId, userId), like(contacts.name, `${prefix}%`))).orderBy(contacts.name); }
export async function findContactsByPhonePrefix(userId: number, prefix: string) { const db = await getDb(); if (!db) return []; return db.select().from(contacts).where(and(eq(contacts.userId, userId), like(contacts.phone, `${prefix}%`))).orderBy(contacts.phone); }
export async function createContact(input: InsertContact) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(contacts).values(input); return { id: Number(result[0].insertId), ...input }; }
export async function updateContact(userId: number, id: number, input: Partial<InsertContact>) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(contacts).set(input).where(and(eq(contacts.id, id), eq(contacts.userId, userId))); const rows = await db.select().from(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId))).limit(1); return rows[0]; }
export async function deleteContact(userId: number, id: number) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId))); return { success: true as const }; }
