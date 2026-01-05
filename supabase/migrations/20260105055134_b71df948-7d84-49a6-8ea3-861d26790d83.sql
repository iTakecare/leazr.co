-- Update offer_reminder_l1 template with professional design
UPDATE email_templates
SET html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="600" align="center" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <img src="{{company_logo}}" alt="{{company_name}}" style="height: 40px; width: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #1f2937; font-size: 22px; font-weight: 600;">Bonjour {{client_name}},</h2>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous espérons que vous allez bien.</p>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous souhaitions revenir vers vous concernant l''offre que nous vous avons transmise récemment.</p>
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Avez-vous eu l''occasion de l''étudier ? Nous serions ravis de répondre à vos éventuelles questions.</p>
              {{custom_message}}
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td style="padding: 20px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; font-size: 15px; color: #1e40af; font-weight: 600;">📎 Vous trouverez votre offre détaillée en pièce jointe de cet email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 16px;">
                          <img src="{{company_logo}}" alt="{{company_name}}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: contain;">
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 15px;">{{representative_name}}</p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{company_name}}</p>
                          <p style="margin: 8px 0 0 0; font-size: 13px;"><a href="mailto:{{contact_email}}" style="color: #2563eb; text-decoration: none;">{{contact_email}}</a></p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{contact_phone}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
updated_at = now()
WHERE name = 'offer_reminder_l1';

-- Update offer_reminder_l2 template
UPDATE email_templates
SET html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="600" align="center" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <img src="{{company_logo}}" alt="{{company_name}}" style="height: 40px; width: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #1f2937; font-size: 22px; font-weight: 600;">Bonjour {{client_name}},</h2>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous revenons vers vous concernant notre offre de leasing.</p>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous comprenons que vous puissiez avoir besoin de temps pour prendre votre décision. Si vous avez des questions ou si vous souhaitez discuter de certains points, n''hésitez pas à nous contacter.</p>
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous restons à votre entière disposition.</p>
              {{custom_message}}
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td style="padding: 20px; background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; font-size: 15px; color: #0f766e; font-weight: 600;">📎 Vous trouverez votre offre détaillée en pièce jointe de cet email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 16px;">
                          <img src="{{company_logo}}" alt="{{company_name}}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: contain;">
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 15px;">{{representative_name}}</p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{company_name}}</p>
                          <p style="margin: 8px 0 0 0; font-size: 13px;"><a href="mailto:{{contact_email}}" style="color: #2563eb; text-decoration: none;">{{contact_email}}</a></p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{contact_phone}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
updated_at = now()
WHERE name = 'offer_reminder_l2';

-- Update offer_reminder_l3 template (no red color)
UPDATE email_templates
SET html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="600" align="center" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <img src="{{company_logo}}" alt="{{company_name}}" style="height: 40px; width: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #1f2937; font-size: 22px; font-weight: 600;">Bonjour {{client_name}},</h2>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Il s''agit de notre dernier rappel concernant l''offre que nous vous avons soumise.</p>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous aimerions vraiment avoir l''opportunité de travailler avec vous et restons convaincus que notre solution répond parfaitement à vos besoins.</p>
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">N''hésitez pas à nous contacter si vous avez la moindre question.</p>
              {{custom_message}}
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td style="padding: 20px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; font-size: 15px; color: #0369a1; font-weight: 600;">📎 Vous trouverez votre offre détaillée en pièce jointe de cet email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 16px;">
                          <img src="{{company_logo}}" alt="{{company_name}}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: contain;">
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 15px;">{{representative_name}}</p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{company_name}}</p>
                          <p style="margin: 8px 0 0 0; font-size: 13px;"><a href="mailto:{{contact_email}}" style="color: #2563eb; text-decoration: none;">{{contact_email}}</a></p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{contact_phone}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
updated_at = now()
WHERE name = 'offer_reminder_l3';

-- Update document_reminder_l1 template
UPDATE email_templates
SET html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="600" align="center" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <img src="{{company_logo}}" alt="{{company_name}}" style="height: 40px; width: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #1f2937; font-size: 22px; font-weight: 600;">Bonjour {{client_name}},</h2>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous espérons que vous allez bien.</p>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous souhaitions vous rappeler que nous sommes en attente de certains documents pour finaliser votre dossier de leasing.</p>
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Pourriez-vous nous les transmettre dès que possible afin que nous puissions poursuivre le traitement de votre demande ?</p>
              {{custom_message}}
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="{{upload_url}}" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Envoyer mes documents</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 16px;">
                          <img src="{{company_logo}}" alt="{{company_name}}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: contain;">
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 15px;">{{representative_name}}</p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{company_name}}</p>
                          <p style="margin: 8px 0 0 0; font-size: 13px;"><a href="mailto:{{contact_email}}" style="color: #2563eb; text-decoration: none;">{{contact_email}}</a></p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{contact_phone}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
updated_at = now()
WHERE name = 'document_reminder_l1';

-- Update document_reminder_l2 template
UPDATE email_templates
SET html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="600" align="center" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <img src="{{company_logo}}" alt="{{company_name}}" style="height: 40px; width: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #1f2937; font-size: 22px; font-weight: 600;">Bonjour {{client_name}},</h2>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous revenons vers vous concernant les documents nécessaires à la finalisation de votre dossier.</p>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Sans ces documents, nous ne sommes malheureusement pas en mesure de poursuivre le traitement de votre demande.</p>
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous vous serions reconnaissants de bien vouloir nous les transmettre dans les meilleurs délais.</p>
              {{custom_message}}
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="{{upload_url}}" style="display: inline-block; padding: 14px 32px; background-color: #9333ea; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Envoyer mes documents</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 16px;">
                          <img src="{{company_logo}}" alt="{{company_name}}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: contain;">
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 15px;">{{representative_name}}</p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{company_name}}</p>
                          <p style="margin: 8px 0 0 0; font-size: 13px;"><a href="mailto:{{contact_email}}" style="color: #2563eb; text-decoration: none;">{{contact_email}}</a></p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{contact_phone}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
updated_at = now()
WHERE name = 'document_reminder_l2';

-- Update document_reminder_l3 template
UPDATE email_templates
SET html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="600" align="center" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <img src="{{company_logo}}" alt="{{company_name}}" style="height: 40px; width: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #1f2937; font-size: 22px; font-weight: 600;">Bonjour {{client_name}},</h2>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Il s''agit de notre dernier rappel concernant les documents manquants pour votre dossier.</p>
              <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Sans réception de ces documents dans les plus brefs délais, nous serons contraints de clôturer votre dossier.</p>
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Nous restons à votre disposition si vous rencontrez des difficultés.</p>
              {{custom_message}}
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="{{upload_url}}" style="display: inline-block; padding: 14px 32px; background-color: #6b21a8; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Envoyer mes documents</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 16px;">
                          <img src="{{company_logo}}" alt="{{company_name}}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: contain;">
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 15px;">{{representative_name}}</p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{company_name}}</p>
                          <p style="margin: 8px 0 0 0; font-size: 13px;"><a href="mailto:{{contact_email}}" style="color: #2563eb; text-decoration: none;">{{contact_email}}</a></p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">{{contact_phone}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
updated_at = now()
WHERE name = 'document_reminder_l3';