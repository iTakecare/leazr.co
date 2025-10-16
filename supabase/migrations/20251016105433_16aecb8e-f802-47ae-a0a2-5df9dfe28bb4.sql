-- Seed avec gestion de conflit
DO $$
DECLARE
  company_record RECORD;
  v_template_html TEXT;
  v_template_css TEXT;
  v_manifest_json JSONB;
BEGIN
  v_template_html := '<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Offre iTakecare</title></head>
<body>
<div class="page page-cover">
<div class="cover-content">
<img src="/pdf-templates/itakecare-v1/assets/cover-image.png" alt="Cover" class="cover-image">
<h1>Proposition Commerciale<br>Services de Leasing IT</h1>
<div class="cover-client"><p><strong>{{client.name}}</strong></p><p>{{client.address}}</p></div>
<div class="cover-footer">
<img src="/pdf-templates/itakecare-v1/assets/logo.png" alt="Logo" class="logo">
<p>Par {{company.name}} - {{offer.date}}</p>
</div></div></div>
<div class="page page-solution">
<div class="header"><img src="/pdf-templates/itakecare-v1/assets/logo.png" alt="Logo" class="header-logo"><h2>Offre n°{{offer.id}}</h2></div>
<h3>Équipements</h3>
<table class="equipment-table"><thead><tr><th>Équipement</th><th>Qté</th><th>Prix/mois</th></tr></thead>
<tbody>{{#each items}}<tr><td>{{this.title}}</td><td>{{this.quantity}}</td><td>{{this.monthly_payment}} €</td></tr>{{/each}}</tbody></table>
<div class="summary"><p><strong>Total:</strong> {{offer.totalMonthly}} €/mois</p><p><strong>Durée:</strong> {{offer.termMonths}} mois</p></div>
</div>
</body>
</html>';

  v_template_css := 'body{font-family:Inter,sans-serif;color:#1e293b}.page{width:210mm;height:297mm;padding:40px;page-break-after:always}.page-cover{background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white;display:flex;align-items:center;justify-content:center}.cover-content{text-align:center}.cover-image{width:400px;margin-bottom:30px;border-radius:8px}.cover-content h1{font-size:36px;margin-bottom:40px}.cover-client{background:rgba(255,255,255,0.1);padding:20px;border-radius:8px;margin:40px 0}.header{display:flex;justify-content:space-between;margin-bottom:30px;border-bottom:2px solid #3b82f6;padding-bottom:15px}.header-logo{height:40px}.equipment-table{width:100%;border-collapse:collapse;margin:30px 0}.equipment-table th{background:#3b82f6;color:white;padding:12px;text-align:left}.equipment-table td{padding:10px;border-bottom:1px solid #e2e8f0}.summary{background:#f1f5f9;padding:20px;border-radius:8px;margin-top:20px}.summary p{margin-bottom:8px}';

  v_manifest_json := '{"id":"itakecare-v1","name":"iTakecare","version":"1.0.0","pages":[{"id":"cover","title":"Couverture","order":1},{"id":"solution","title":"Solution","order":2}],"variables":{"client":["name","address","email"],"offer":["id","date","termMonths","totalMonthly"],"company":["name"],"items":["array"]}}'::jsonb;

  FOR company_record IN SELECT id FROM public.companies LOOP
    -- D'abord désactiver is_default pour tous les autres templates
    UPDATE public.pdf_templates SET is_default = false
    WHERE company_id = company_record.id AND template_type = 'standard' AND template_category = 'offer';

    -- Ensuite update ou insert
    UPDATE public.pdf_templates SET
      template_html = v_template_html,
      template_styles = v_template_css,
      manifest_data = v_manifest_json,
      preview_url = '/pdf-templates/itakecare-v1/preview.png',
      version = '1.0.0',
      description = 'Template iTakecare 7 pages',
      is_active = true,
      is_default = true,
      updated_at = now()
    WHERE company_id = company_record.id AND id = 'itakecare-v1';

    IF NOT FOUND THEN
      INSERT INTO public.pdf_templates (
        id, company_id, name, "companyName", "companyAddress", "companyContact", "companySiret",
        "primaryColor", "secondaryColor", "headerText", "footerText", fields,
        template_html, template_styles, manifest_data, preview_url, version, description,
        is_active, is_default, template_type, template_category
      ) VALUES (
        'itakecare-v1', company_record.id, 'iTakecare', 'iTakecare', '123 Rue Example',
        'contact@itakecare.be', 'BE0000', '#3b82f6', '#64748b', 'Offre iTakecare', 'Valable 30j', '[]'::jsonb,
        v_template_html, v_template_css, v_manifest_json, '/pdf-templates/itakecare-v1/preview.png', '1.0.0',
        'Template iTakecare 7 pages', true, true, 'standard', 'offer'
      );
    END IF;
  END LOOP;
END $$;