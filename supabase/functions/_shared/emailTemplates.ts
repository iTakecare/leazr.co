// Utilitaire pour supprimer les balises HTML d'une chaîne
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

interface ClientConfirmationParams {
  companyLogo: string;
  platformCompanyName: string;
  clientName: string;
  companyName: string;
  summaryItemsHtml: string;
  dateStr: string;
  timeStr: string;
}

export function generateClientConfirmationEmail(params: ClientConfirmationParams): string {
  const { companyLogo, platformCompanyName, clientName, companyName, summaryItemsHtml, dateStr, timeStr } = params;
  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" alt="${platformCompanyName}" style="height: 50px; max-width: 200px; object-fit: contain;">`
    : `<h1 style="color: #2d618f; margin-bottom: 10px;">${platformCompanyName}</h1>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">${logoHtml}</div>
      <h2 style="color: #2d618f; border-bottom: 2px solid #2d618f; padding-bottom: 10px;">👋 Bienvenue ${clientName || companyName} !</h2>
      <p style="font-size: 16px; line-height: 1.6;">✨ Votre demande d'équipement a été créée avec succès sur la plateforme iTakecare.</p>
      <p style="font-size: 16px; line-height: 1.6;">📋 Voici un récapitulatif de votre demande :</p>
      <ul style="background: linear-gradient(135deg, #f8fafd 0%, #e8f4fd 100%); padding: 20px; border-radius: 10px; list-style: none; margin: 20px 0; border-left: 4px solid #2d618f;">
        ${summaryItemsHtml}
      </ul>
      <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4ecd4 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #4caf50;">
        <h3 style="color: #2e7d32; margin-top: 0; display: flex; align-items: center;">🎯 Prochaines étapes</h3>
        <ol style="color: #2e7d32; padding-left: 20px; line-height: 1.8;">
          <li><strong>Traitement de votre demande</strong> : Notre équipe analyse votre demande sous 24h ouvrées</li>
          <li><strong>Validation et signature</strong> : Une fois acceptée, nous finalisons ensemble votre contrat</li>
        </ol>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #666; font-size: 14px; margin-bottom: 15px;">💬 Vous avez des questions ? Notre équipe est là pour vous aider !</p>
      </div>
      <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        📧 Cet email a été envoyé automatiquement suite à votre demande d'équipement.<br>
        🕐 Demande reçue le ${dateStr} à ${timeStr}
      </p>
      <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 11px; margin: 0;">
          ${platformCompanyName} - Solution de leasing professionnel<br>
          Merci de votre confiance ! 🙏
        </p>
      </div>
    </div>
  `;
}

interface ClientAccountParams {
  companyLogo: string;
  platformCompanyName: string;
  clientName: string;
  companyName: string;
  passwordLink: string;
  summaryItemsHtml: string;
  dateStr: string;
  timeStr: string;
}

export function generateClientAccountEmail(params: ClientAccountParams): string {
  const { companyLogo, platformCompanyName, clientName, companyName, passwordLink, summaryItemsHtml, dateStr, timeStr } = params;
  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" alt="${platformCompanyName}" style="height: 50px; max-width: 200px; object-fit: contain;">`
    : `<h1 style="color: #2d618f; margin-bottom: 10px;">${platformCompanyName}</h1>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">${logoHtml}</div>
      <h2 style="color: #2d618f; border-bottom: 2px solid #2d618f; padding-bottom: 10px;">👋 Bienvenue ${clientName || companyName} !</h2>
      <p style="font-size: 16px; line-height: 1.6;">✨ Votre demande d'équipement a été créée avec succès sur la plateforme iTakecare.</p>
      
      <div style="background: linear-gradient(135deg, #e8f4fd 0%, #d1e9fc 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #2d618f;">
        <h3 style="color: #2d618f; margin-top: 0; display: flex; align-items: center;">🎉 Votre compte client a été créé !</h3>
        <p style="color: #2d618f; margin: 10px 0;">Nous avons créé votre compte personnel pour suivre vos demandes et gérer vos équipements.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${passwordLink}" style="background: linear-gradient(135deg, #2d618f 0%, #4a90e2 100%); color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            🔐 Définir mon mot de passe
          </a>
        </div>
        <p style="color: #666; font-size: 12px; margin: 0;">Ce lien est valable pendant 24 heures. Vous pourrez ensuite accéder à votre espace client personnalisé.</p>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">📋 Récapitulatif de votre demande :</p>
      <ul style="background: linear-gradient(135deg, #f8fafd 0%, #e8f4fd 100%); padding: 20px; border-radius: 10px; list-style: none; margin: 20px 0; border-left: 4px solid #2d618f;">
        ${summaryItemsHtml}
      </ul>

      <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4ecd4 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #4caf50;">
        <h3 style="color: #2e7d32; margin-top: 0;">🎯 Prochaines étapes</h3>
        <ol style="color: #2e7d32; padding-left: 20px; line-height: 1.8;">
          <li><strong>Activez votre compte</strong> : Cliquez sur le lien ci-dessus pour définir votre mot de passe</li>
          <li><strong>Accédez à votre espace</strong> : Suivez le traitement de votre demande en temps réel</li>
          <li><strong>Recevez votre offre</strong> : Notre équipe vous contactera sous 24h ouvrées</li>
        </ol>
      </div>

      <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        📧 Cet email a été envoyé automatiquement suite à votre demande d'équipement.<br>
        🕐 Demande reçue le ${dateStr} à ${timeStr}
      </p>
    </div>
  `;
}

interface AdminNotificationParams {
  companyLogo: string;
  platformCompanyName: string;
  clientName: string;
  companyName: string;
  clientEmail: string;
  contactPhone: string;
  companyAddress: string;
  companyCity: string;
  companyPostalCode: string;
  vatNumber: string;
  equipmentDescription: string;
  totalPurchaseAmount: number;
  totalMonthlyPayment: number;
  coefficient: number;
  totalFinancedAmount: number;
  marginAmount: number;
  marginPercentage: number;
  partnerSlug?: string;
  partnerName?: string;
  externalServices?: Array<{
    provider_name: string;
    product_name: string;
    price_htva: number;
    billing_period: string;
    quantity?: number;
  }>;
  deliveryInfo?: {
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  adminLink: string;
  dateStr: string;
  timeStr: string;
}

export function generateAdminNotificationEmail(params: AdminNotificationParams): string {
  const {
    companyLogo, platformCompanyName, clientName, companyName, clientEmail,
    contactPhone, companyAddress, companyCity, companyPostalCode, vatNumber,
    equipmentDescription, totalPurchaseAmount, totalMonthlyPayment,
    coefficient, totalFinancedAmount, marginAmount, marginPercentage,
    partnerSlug, partnerName, externalServices, deliveryInfo, adminLink,
    dateStr, timeStr,
  } = params;

  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" alt="${platformCompanyName}" style="height: 50px; max-width: 200px; object-fit: contain;">`
    : `<h1 style="color: #2d618f; margin-bottom: 10px;">${platformCompanyName}</h1>`;

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const partnerBlock = partnerSlug ? `
    <div style="background: linear-gradient(135deg, #fef3e2 0%, #fde8c8 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #e67e22;">
      <h3 style="color: #d35400; margin-top: 0;">🤝 Source partenaire</h3>
      <p style="margin: 0;"><strong>${partnerName || partnerSlug}</strong></p>
    </div>
  ` : '';

  let externalServicesBlock = '';
  if (externalServices && externalServices.length > 0) {
    const items = externalServices.map((svc) => {
      const period = svc.billing_period === 'monthly' ? '/mois' : svc.billing_period === 'yearly' ? '/an' : '';
      const qty = (svc.quantity || 1) > 1 ? ` × ${svc.quantity}` : '';
      return `<li style="margin: 8px 0;">• <strong>${svc.provider_name}</strong> — ${svc.product_name}${qty} : ${svc.price_htva.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HTVA${period}</li>`;
    }).join('');
    externalServicesBlock = `
    <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e8d5ff 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #8e44ad;">
      <h3 style="color: #7b2d8e; margin-top: 0;">📡 Services externes (${externalServices.length})</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">${items}</ul>
    </div>`;
  }

  let deliveryBlock = '';
  if (deliveryInfo) {
    deliveryBlock = `
    <div style="background: linear-gradient(135deg, #f8fff0 0%, #efffdc 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4caf50;">
      <h3 style="color: #2e7d32; margin-top: 0;">🚚 Adresse de livraison</h3>
      <p style="margin: 0;">${deliveryInfo.address || ''}<br>
      ${deliveryInfo.city || ''} ${deliveryInfo.postal_code || ''}<br>
      ${deliveryInfo.country || ''}</p>
    </div>`;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">${logoHtml}</div>
      
      <h2 style="color: #d73527; border-bottom: 2px solid #d73527; padding-bottom: 10px;">🚨 Nouvelle demande d'offre reçue</h2>
      
      <div style="background: linear-gradient(135deg, #fff3f3 0%, #ffe8e8 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #d73527;">
        <h3 style="color: #d73527; margin-top: 0;">📋 Informations client</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="margin: 8px 0;"><strong>👤 Nom :</strong> ${clientName || 'Non renseigné'}</li>
          <li style="margin: 8px 0;"><strong>🏢 Entreprise :</strong> ${companyName || 'Non renseignée'}</li>
          <li style="margin: 8px 0;"><strong>📧 Email :</strong> ${clientEmail}</li>
          <li style="margin: 8px 0;"><strong>📞 Téléphone :</strong> ${contactPhone || 'Non renseigné'}</li>
          <li style="margin: 8px 0;"><strong>🏠 Adresse :</strong> ${companyAddress || 'Non renseignée'}, ${companyCity || ''} ${companyPostalCode || ''}</li>
          ${vatNumber ? `<li style="margin: 8px 0;"><strong>🆔 N° TVA :</strong> ${vatNumber}</li>` : ''}
        </ul>
      </div>
      
      <div style="background: linear-gradient(135deg, #f0f8ff 0%, #e1f0ff 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #2d618f;">
        <h3 style="color: #2d618f; margin-top: 0;">💰 Détails financiers</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="margin: 8px 0;"><strong>📱 Équipement :</strong> ${equipmentDescription}</li>
          <li style="margin: 8px 0;"><strong>💶 Prix d'achat total :</strong> ${fmt(totalPurchaseAmount)} €</li>
          <li style="margin: 8px 0;"><strong>📅 Mensualité :</strong> ${fmt(totalMonthlyPayment)} €/mois</li>
          <li style="margin: 8px 0;"><strong>🔢 Coefficient :</strong> ${coefficient}</li>
          <li style="margin: 8px 0;"><strong>💵 Montant financé :</strong> ${fmt(totalFinancedAmount)} €</li>
          <li style="margin: 8px 0;"><strong>📈 Marge :</strong> ${fmt(marginAmount)} € (${marginPercentage}%)</li>
        </ul>
      </div>
      
      ${partnerBlock}
      ${externalServicesBlock}
      ${deliveryBlock}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminLink}" 
           style="background: linear-gradient(135deg, #2d618f 0%, #4a90e2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(45, 97, 143, 0.3);">
          👀 Voir l'offre dans l'interface admin
        </a>
      </div>
      
      <div style="background-color: #fff8e1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
        <p style="margin: 0; color: #f57c00; font-weight: bold;">⚡ Action requise</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;">Cette demande nécessite votre attention. Connectez-vous à l'interface d'administration pour traiter la demande.</p>
      </div>
      
      <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        📧 Cet email a été envoyé automatiquement suite à une demande d'offre via le catalogue web.<br>
        🕐 Demande reçue le ${dateStr} à ${timeStr}
      </p>
    </div>
  `;
}
