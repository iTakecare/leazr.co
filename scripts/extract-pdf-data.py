#!/usr/bin/env python3
"""
extract-pdf-data.py

Parcourt tous les PDFs de factures 2023 et extrait :
- Factures GRENKE LEASE : numéro de dossier + numéros de série par équipement
- Factures vente directe (non-Grenke) : détails complets de la facture

Résultat : deux fichiers JSON :
  - grenke-serial-numbers.json  (dossier → équipements avec SN)
  - direct-sales-invoices.json  (factures de vente directe complètes)

Usage:
  python3 scripts/extract-pdf-data.py
"""

import pdfplumber
import json
import re
import os
from pathlib import Path

FOLDER = Path("/Users/itakecare/Desktop/iTakecare/Clients/factures 2023")
OUT_GRENKE   = Path(__file__).parent / "grenke-serial-numbers.json"
OUT_DIRECT   = Path(__file__).parent / "direct-sales-invoices.json"

# Invoices à ignorer (factures internes Sergi/Gianni)
SKIP_PATTERNS = ["SergiGianni", "sergigianni", "SERGIGIANNI"]

def is_skip(filename):
    for p in SKIP_PATTERNS:
        if p.lower() in filename.lower():
            return True
    return False

def is_grenke(filename):
    return "GRENKELEASE" in filename.upper()

def parse_date(s):
    """Convert DD/MM/YYYY to YYYY-MM-DD."""
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', s)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return f"{y}-{int(mo):02d}-{int(d):02d}"
    return None

def extract_amount(s):
    """Extract a float from a string like '€ 1.858,13' or '1 858,13'."""
    # Remove € and spaces, handle European number format
    s = s.replace('€','').strip()
    # Remove thousand separators (dots before comma)
    # Format: 1.234,56 → 1234.56
    m = re.search(r'([\d\.]+),([\d]{2})', s)
    if m:
        integer_part = m.group(1).replace('.', '')
        decimal_part = m.group(2)
        return float(f"{integer_part}.{decimal_part}")
    # Try integer only
    m2 = re.search(r'([\d\.]+)', s)
    if m2:
        return float(m2.group(1).replace('.', ''))
    return 0.0

def clean_text(t):
    """Remove double-encoded characters from pdfplumber output."""
    if not t:
        return ""
    # pdfplumber double-encodes some chars - clean up
    # Replace runs of doubled chars: "FFaaccttuurree" -> "Facture"
    # This is due to the font encoding; we can detect it and halve the string
    # Actually pdfplumber extracts doubled characters for some fonts
    # The content is still readable; just use regex to extract what we need
    return t

def extract_grenke_pdf(path):
    """Extract dossier number and serial numbers from a Grenke invoice PDF."""
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"

    lines = text.split('\n')

    # Extract invoice number
    invoice_number = None
    for line in lines:
        m = re.search(r'ITC-2023-(\d+)', line)
        if m:
            invoice_number = f"ITC-2023-{m.group(1).zfill(4)}"
            break

    # Extract dossier number
    dossier_number = None
    for line in lines:
        m = re.search(r'(180-\d+)', line)
        if m:
            dossier_number = m.group(1)
            break

    # Extract invoice date
    invoice_date = None
    for line in lines:
        if 'Date:' in line or 'DDaattee::' in line:
            m = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', line)
            if m:
                invoice_date = parse_date(m.group(1))
                break

    # Extract equipment lines with serial numbers
    # Pattern: find lines with "SN :" or "S/N :"
    equipment = []

    # We'll parse the description lines carefully
    # Equipment lines format: "[Description] | SN : [SERIAL] [price] [qty] [total] [tva%] [incl]"
    # or: "[Description] | SN :" on one line, then "[SERIAL]" on next line

    i = 0
    while i < len(lines):
        line = lines[i]

        # Skip header/footer lines
        if any(kw in line for kw in ['Payé', 'iTakecare SRL', 'Charleroi', 'IBAN', 'BIC',
                                       'TVA', 'Communication', 'conditions générales',
                                       'DDaattee', 'FFaaccttuurree', 'OObbjjeett', 'VVoottrree',
                                       'NN°°', 'IIBBAANN', 'BBIICC', 'Excl.', 'EExxccll',
                                       'CCoomm', 'Les cond', '+++', 'DDeesscc', 'PP.. UU',
                                       'Ukkel', 'Ruisbroek', 'Belgique', 'hello@',
                                       '0795', '0873', 'Quai Paul', 'CLI-']):
            i += 1
            continue

        # Check for SN in this line
        has_sn = 'SN :' in line or 'S/N :' in line or 'SN:' in line

        if has_sn:
            # Try to extract the serial number
            # Case 1: SN is on this line: "... | SN : ABCD1234 € ..."
            sn_match = re.search(r'[Ss]/?\s*N\s*:\s*([A-Z0-9]{5,20})', line)

            if sn_match:
                serial = sn_match.group(1).strip()
                # Extract description (before the SN marker)
                desc_part = re.split(r'\s*\|?\s*[Ss]/?\s*N\s*:', line)[0].strip()
                # Clean up description
                desc = re.sub(r'\s+', ' ', desc_part).strip()

                # Extract quantity and prices from the line
                # Price format: € X.XXX,XX qty € X.XXX,XX XX% € X.XXX,XX
                amounts = re.findall(r'(\d[\d\.]*,\d{2})', line)
                qty_match = re.search(r'€\s*[\d\.]+,\d{2}\s+(\d+)\s+€', line)
                qty = int(qty_match.group(1)) if qty_match else 1
                unit_price = float(amounts[0].replace('.','').replace(',','.')) if amounts else 0

                equipment.append({
                    'title': desc,
                    'serial_number': serial,
                    'quantity': qty,
                    'unit_price_htva': unit_price
                })
            else:
                # Case 2: SN is on the NEXT line
                # "... | SN :" then next line is "[SN] [possibly nothing else]"
                desc_part = re.split(r'\s*\|?\s*[Ss]/?\s*N\s*:', line)[0].strip()
                desc = re.sub(r'\s+', ' ', desc_part).strip()

                # Get prices from current line
                amounts = re.findall(r'(\d[\d\.]*,\d{2})', line)
                qty_match = re.search(r'€\s*[\d\.]+,\d{2}\s+(\d+)\s+€', line)
                qty = int(qty_match.group(1)) if qty_match else 1
                unit_price = float(amounts[0].replace('.','').replace(',','.')) if amounts else 0

                # Get SN from next line
                serial = None
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    # SN should be a sequence of alphanumeric chars (5-20 chars)
                    sn_m = re.match(r'^([A-Z0-9]{5,20})\s*$', next_line)
                    if sn_m:
                        serial = sn_m.group(1)
                        i += 1  # Skip next line

                if desc:
                    equipment.append({
                        'title': desc,
                        'serial_number': serial,
                        'quantity': qty,
                        'unit_price_htva': unit_price
                    })

        elif line.strip() and len(line.strip()) > 10:
            # Non-SN equipment line - might still be equipment without SN
            # Check if it has price pattern: "Description € price qty € total tva% € incl"
            price_match = re.search(r'€\s*([\d\.]+,\d{2})\s+(\d+)\s+€', line)
            if price_match and not any(kw in line for kw in ['6,00%', '12,00%', '21,00%', '0% TVA', 'Total']):
                desc = re.split(r'\s*€\s*[\d]', line)[0].strip()
                desc = re.sub(r'\s+', ' ', desc).strip()
                amounts = re.findall(r'([\d\.]+,\d{2})', line)
                qty = int(price_match.group(2))
                unit_price = float(amounts[0].replace('.','').replace(',','.')) if amounts else 0

                if desc and len(desc) > 5:
                    equipment.append({
                        'title': desc,
                        'serial_number': None,
                        'quantity': qty,
                        'unit_price_htva': unit_price
                    })

        i += 1

    return {
        'filename': path.name,
        'invoice_number': invoice_number,
        'dossier_number': dossier_number,
        'invoice_date': invoice_date,
        'equipment': equipment
    }

def extract_direct_sale_pdf(path):
    """Extract invoice data from a non-Grenke (direct sale) invoice PDF."""
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"

    lines = text.split('\n')

    # Extract invoice number
    invoice_number = None
    for line in lines:
        m = re.search(r'(ITC-2023-\d+|2023-\d+)', line)
        if m:
            num = m.group(1)
            # Normalize to ITC-2023-XXXX format with 4 digits
            parts = num.split('-')
            if len(parts) >= 2:
                last = parts[-1]
                if num.startswith('ITC'):
                    invoice_number = f"ITC-2023-{last.zfill(4)}"
                else:
                    invoice_number = f"ITC-2023-{last.zfill(4)}"
            break

    # Extract date
    invoice_date = None
    for line in lines:
        if 'DDaattee::' in line or 'Date:' in line:
            m = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', line)
            if m and not invoice_date:
                invoice_date = parse_date(m.group(1))

    # Extract client reference
    client_ref = None
    for line in lines:
        if 'VVoottrree' in line or 'Votre référence' in line:
            # After the label, get the client name
            parts = line.split('::')
            if len(parts) > 1:
                client_ref = parts[-1].strip()
            elif ':' in line:
                client_ref = line.split(':', 1)[-1].strip()

    # Extract client VAT number (from client address block)
    client_vat = None
    for line in lines:
        m = re.search(r'(BE\s*\d{10}|ES[A-Z]\d+)', line)
        if m and 'iTakecare' not in line and '0795' not in line:
            client_vat = m.group(1).replace(' ', '')
            break

    # Extract client N° (customer number in iTakecare system)
    client_num = None
    for line in lines:
        if 'NN°°' in line and 'cclliieenntt' in line:
            m = re.search(r'cclliieenntt::\s*(\d+)', line)
            if m:
                client_num = int(m.group(1))
        elif 'N° de client' in line or 'client:' in line.lower():
            m = re.search(r':\s*(\d+)', line)
            if m:
                client_num = int(m.group(1))

    # Extract total HTVA
    total_htva = 0.0
    for line in lines:
        if 'Total' in line or 'TOTAL' in line:
            # Look for the final total
            amounts = re.findall(r'€\s*([\d\.]+,\d{2})', line)
            if amounts:
                try:
                    total_htva = float(amounts[0].replace('.','').replace(',','.'))
                except:
                    pass

    # Also try Excl. TVA total line
    for line in lines:
        if ('Excl.' in line or 'EExxccll' in line) and '0%' not in line:
            amounts = re.findall(r'€\s*([\d\.]+,\d{2})', line)
            if amounts:
                try:
                    # Last amount on this line is the total excl TVA
                    total_htva = float(amounts[-1].replace('.','').replace(',','.'))
                except:
                    pass

    # Extract TVA rate (most common)
    tva_rate = 21  # default
    for line in lines:
        if '0%' in line and 'Total' in line:
            tva_rate = 0  # auto-liquidation
            break

    # Extract equipment lines
    equipment = []
    i = 0
    while i < len(lines):
        line = lines[i]

        # Skip header/footer/tax lines
        if any(kw in line for kw in ['Payé', 'iTakecare SRL', 'Charleroi', 'IBAN', 'BIC',
                                       'Communication', 'conditions générales',
                                       'DDaattee', 'FFaaccttuurree', 'OObbjjeett', 'VVoottrree',
                                       'NN°°', 'IIBBAANN', 'BBIICC',
                                       'CCoomm', 'Les cond', '+++',
                                       'DDeesscc', 'PP.. UU', 'hello@',
                                       '0795', '0873', 'Quai Paul', 'CLI-',
                                       'TVA autoliquidée', 'livraison', 'Livraison',
                                       'échéance', 'Echéance']):
            i += 1
            continue

        # Equipment line has: price pattern
        price_match = re.search(r'€\s*([\d\.]+,\d{2})\s+(\d+)\s+€', line)
        tva_line = re.search(r'(\d+,00%\s+TVA|6,00%|12,00%|21,00%|0%\s+TVA)', line)

        if price_match and not tva_line:
            desc = re.split(r'\s*€\s*[\d]', line)[0].strip()
            # Also handle S/N in description for direct sales
            sn_match = re.search(r'[Ss]/?\s*N\s*:?\s*([A-Z0-9]{5,20})', desc)
            serial = sn_match.group(1) if sn_match else None
            if sn_match:
                desc = re.sub(r'\s*\|?\s*[Ss]/?\s*N\s*:?\s*[A-Z0-9]{5,20}', '', desc).strip()

            desc = re.sub(r'\s+', ' ', desc).strip()

            amounts = re.findall(r'([\d\.]+,\d{2})', line)
            qty = int(price_match.group(2))
            unit_price = float(amounts[0].replace('.','').replace(',','.')) if amounts else 0
            total_line = unit_price * qty

            # Extract TVA for this line
            tva_match = re.search(r'(\d+)\s*%', line)
            tva = int(tva_match.group(1)) if tva_match else tva_rate

            if desc and len(desc) > 3 and unit_price > 0:
                equipment.append({
                    'title': desc,
                    'serial_number': serial,
                    'quantity': qty,
                    'unit_price_htva': unit_price,
                    'total_htva': round(total_line, 2),
                    'tva_pct': tva
                })

        i += 1

    # Recalculate total if not found
    if total_htva == 0 and equipment:
        total_htva = round(sum(e['total_htva'] for e in equipment), 2)

    return {
        'filename': path.name,
        'invoice_number': invoice_number,
        'invoice_date': invoice_date,
        'client_ref': client_ref,
        'client_vat': client_vat,
        'client_num': client_num,
        'total_htva': total_htva,
        'tva_rate': tva_rate,
        'equipment': equipment,
        'type': 'direct_sale'
    }

def main():
    if not FOLDER.exists():
        print(f"❌ Dossier introuvable: {FOLDER}")
        return

    pdf_files = sorted(FOLDER.glob("*.pdf"))
    print(f"📁 {len(pdf_files)} PDF trouvés dans {FOLDER.name}")

    grenke_results = []
    direct_results = []
    errors = []

    for pdf_path in pdf_files:
        fname = pdf_path.name

        # Skip internal invoices
        if is_skip(fname):
            print(f"  ⏭️  Skip: {fname}")
            continue

        try:
            if is_grenke(fname):
                result = extract_grenke_pdf(pdf_path)
                grenke_results.append(result)
                sn_count = sum(1 for e in result['equipment'] if e.get('serial_number'))
                eq_count = len(result['equipment'])
                print(f"  📋 GRENKE {result['invoice_number']} → dossier {result['dossier_number']} | {eq_count} équipements, {sn_count} S/N")
            else:
                result = extract_direct_sale_pdf(pdf_path)
                direct_results.append(result)
                print(f"  🛒 DIRECT {result['invoice_number']} → {result['client_ref']} | {result['total_htva']}€ | {len(result['equipment'])} lignes")
        except Exception as e:
            print(f"  ❌ ERREUR {fname}: {e}")
            errors.append({'filename': fname, 'error': str(e)})

    # Save results
    with open(OUT_GRENKE, 'w', encoding='utf-8') as f:
        json.dump(grenke_results, f, ensure_ascii=False, indent=2)
    print(f"\n✅ {len(grenke_results)} factures Grenke → {OUT_GRENKE.name}")

    with open(OUT_DIRECT, 'w', encoding='utf-8') as f:
        json.dump(direct_results, f, ensure_ascii=False, indent=2)
    print(f"✅ {len(direct_results)} factures vente directe → {OUT_DIRECT.name}")

    if errors:
        print(f"\n⚠️  {len(errors)} erreurs:")
        for e in errors:
            print(f"   - {e['filename']}: {e['error']}")

    # Summary of serial numbers found
    total_sn = sum(sum(1 for eq in r['equipment'] if eq.get('serial_number')) for r in grenke_results)
    total_eq = sum(len(r['equipment']) for r in grenke_results)
    print(f"\n📊 Total Grenke: {total_eq} équipements, {total_sn} numéros de série trouvés")

if __name__ == "__main__":
    main()
