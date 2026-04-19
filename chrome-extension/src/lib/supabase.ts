/**
 * Client Supabase pour l'extension, avec auth persistée dans chrome.storage.local.
 * À partager entre popup, content script et background.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://cifbetjefyfocafanlhv.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw";

/** Storage adapter pour chrome.storage.local — utilisé par le Supabase client */
const chromeStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const result = await chrome.storage.local.get(key);
    return (result[key] as string | undefined) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },
  async removeItem(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: chromeStorageAdapter as unknown as Storage,
      storageKey: "leazr-ext-auth",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** Appelle une edge function Leazr avec la session courante */
export async function callFunction<T = unknown>(
  name: string,
  body?: unknown,
  method: "GET" | "POST" = "POST"
): Promise<T> {
  const supa = getSupabase();
  const { data, error } = await supa.functions.invoke<T>(name, { body, method });
  if (error) throw new Error(error.message);
  return data as T;
}
