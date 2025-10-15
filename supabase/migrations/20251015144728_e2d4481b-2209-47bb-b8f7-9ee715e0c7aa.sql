-- Optimiser le template HTML pour la génération PDF
-- 1. Supprimer la section template-guide (lignes 684-709)
UPDATE html_templates
SET html_content = REGEXP_REPLACE(
  html_content,
  '<!-- Guide des champs de template -->.*?</div>\s*\n\s*<!-- Page 1',
  '<!-- Page 1',
  'gs'
),
updated_at = now()
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
AND is_active = true;

-- 2. Optimiser les styles body pour PDF
UPDATE html_templates
SET html_content = REPLACE(
  html_content,
  '        body {
            font-family: ''Montserrat'', ''Segoe UI'', sans-serif;
            background: #e8e8e8;
            padding: 20px;
            color: #333;
        }',
  '        body {
            font-family: ''Montserrat'', ''Segoe UI'', sans-serif;
            background: white;
            padding: 0;
            color: #333;
        }
        
        body.generating-pdf {
            background: white !important;
            padding: 0 !important;
        }
        
        body.generating-pdf .preview-header {
            display: none !important;
        }'
),
updated_at = now()
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
AND is_active = true;

-- 3. Optimiser les styles .page pour PDF
UPDATE html_templates
SET html_content = REPLACE(
  html_content,
  '        .page {
            width: 210mm;
            min-height: 297mm;
            background: white;
            margin: 0 auto 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
            position: relative;
            overflow: hidden;
        }',
  '        .page {
            width: 210mm;
            min-height: 297mm;
            background: white;
            margin: 0;
            box-shadow: none;
            position: relative;
            overflow: hidden;
            page-break-after: always;
        }
        
        .page:last-child {
            page-break-after: avoid;
        }
        
        .pdf-ready .page {
            margin: 0;
            box-shadow: none;
        }'
),
updated_at = now()
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
AND is_active = true;

-- 4. Améliorer les styles @media print
UPDATE html_templates
SET html_content = REPLACE(
  html_content,
  '        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .page {
                box-shadow: none;
                page-break-after: always;
                margin: 0;
            }
            
            .page:last-child {
                page-break-after: auto;
            }
            
            .template-field {
                background: transparent;
                font-family: inherit;
                font-size: inherit;
                padding: 0;
            }
            
            /* Hide template guide on print */
            .template-guide {
                display: none !important;
            }
        }',
  '        @media print {
            body {
                background: white !important;
                padding: 0 !important;
            }
            
            .page {
                box-shadow: none !important;
                page-break-after: always;
                margin: 0 !important;
            }
            
            .page:last-child {
                page-break-after: avoid;
            }
            
            .template-field {
                background: transparent;
                font-family: inherit;
                font-size: inherit;
                padding: 0;
            }
            
            .preview-header {
                display: none !important;
            }
            
            @page {
                size: A4;
                margin: 10mm;
            }
        }'
),
updated_at = now()
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
AND is_active = true;