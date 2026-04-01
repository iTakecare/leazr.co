-- Fix 2026 data discrepancies vs Billit export
-- 1. ITC-2026-NC-003 : mauvaise date (2026-03-29 → 2026-02-08)
--    La note de crédit a été saisie le 29 mars mais sa date réelle (Billit) est le 8 février.
-- 2. ITC-2026-0043 : mauvais montant (63.92 → 52.83 €)
--    Le montant correct selon l'export Billit est 52.83 €.

-- Fix 1 : date de la note de crédit ITC-2026-NC-003
UPDATE credit_notes
SET
  issued_at   = '2026-02-08 00:00:00+00',
  updated_at  = NOW()
WHERE credit_note_number = 'ITC-2026-NC-003';

-- Fix 2 : montant de la facture ITC-2026-0043
UPDATE invoices
SET
  amount      = 52.83,
  updated_at  = NOW()
WHERE invoice_number = 'ITC-2026-0043';
