

## Fix: Clean `vprice_` prefix from existing data on load

### Problem
Previously saved `allowed_product_ids` in the database contain IDs prefixed with `vprice_` (e.g., `vprice_8ca0315-...`). When the editor loads these and tries to save/query, the DB rejects them as invalid UUIDs.

### Solution
In `PartnerPackOptionsEditor.tsx`, sanitize `allowed_product_ids` when loading an existing option in the `startEditing` function. Strip the `vprice_` prefix from any ID that has it.

### Change

**File: `src/components/partners/PartnerPackOptionsEditor.tsx`** — `startEditing` function (line 99):

```typescript
// Before:
allowed_product_ids: option.allowed_product_ids || [],

// After:
allowed_product_ids: (option.allowed_product_ids || []).map(
  (id: string) => id.startsWith("vprice_") ? id.replace("vprice_", "") : id
),
```

This is a single-line fix that cleans corrupted data on load. The next save will persist clean UUIDs, permanently fixing the data.

