
// JSON utility types to help with type compatibility
type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

declare global {
  type Json = JsonValue;
  
  // Helper utility types for transforming JSON data
  type JsonToRecord<T extends JsonObject> = {
    [K in keyof T]: T[K] extends JsonObject 
      ? JsonToRecord<T[K]> 
      : T[K] extends JsonArray 
        ? JsonToArray<T[K]> 
        : T[K];
  };
  
  type JsonToArray<T extends JsonArray> = {
    [K in keyof T]: T[K] extends JsonObject 
      ? JsonToRecord<T[K]> 
      : T[K] extends JsonArray 
        ? JsonToArray<T[K]> 
        : T[K];
  };
}

// Utility function to safely parse JSON
export function safeParseJson<T>(json: string | Json | null | undefined): T | null {
  if (json === null || json === undefined) return null;
  
  if (typeof json === 'string') {
    try {
      return JSON.parse(json) as T;
    } catch (e) {
      console.error('Failed to parse JSON string:', e);
      return null;
    }
  }
  
  return json as unknown as T;
}

// Utility to ensure a value is a Record
export function ensureRecord<T = string | number>(
  value: any
): Record<string, T> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (e) {
      return {};
    }
  }
  return typeof value === 'object' && value !== null ? value : {};
}
