

# Auto-update CO2 and device metrics on new equipment

## Approach
Create a PostgreSQL trigger on `contract_equipment` that fires on INSERT. It will automatically increment `companies.co2_saved` and `companies.devices_count` for each new device added.

## How it works

1. **Trigger function** `update_company_metrics_on_equipment_insert()`:
   - Gets `company_id` by joining `contract_equipment.contract_id` → `contracts.company_id`
   - Categorizes the equipment by matching keywords in `title` (case-insensitive):
     - "macbook", "thinkpad", "latitude", "elitebook", "laptop", "portable", "notebook" → laptop
     - "imac", "optiplex", "prodesk", "desktop", "fixe", "mini pc", "mac mini" → desktop
     - "iphone", "samsung galaxy s", "smartphone", "pixel" → smartphone
     - "ipad", "galaxy tab", "surface go", "tablette", "tablet" → tablet
   - If category matches a device type, looks up `co2_savings_kg` from `category_environmental_data` for that company + category
   - Falls back to hardcoded values (170kg laptop/desktop, 45kg smartphone, 87kg tablet) if no environmental data found
   - Updates `companies` set `devices_count = devices_count + quantity`, `co2_saved = co2_saved + (co2_per_unit * quantity / 1000)` (converting kg to tonnes since `co2_saved` is in tonnes)
   - Ignores non-device items (accessories, software, licenses, cables, etc.)

2. **Trigger**: `AFTER INSERT ON contract_equipment FOR EACH ROW`

3. **Also handle DELETE**: Decrement metrics if equipment is removed (optional but recommended for accuracy)

## Database migration
Single migration file creating:
- `update_company_metrics_on_equipment_insert()` function (SECURITY DEFINER)
- Trigger on `contract_equipment` AFTER INSERT

## Files impacted
| File | Change |
|---|---|
| `supabase/migrations/[timestamp].sql` | New trigger function + trigger |

No frontend changes needed — it's entirely server-side.

