-- Fix ambassador account email template variables
-- Replace {{login_link}} with {{activation_url}} and remove {{temp_password}}

UPDATE public.email_templates
SET 
  html_content = '<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">Bienvenue en tant qu''ambassadeur !</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Bonjour {{user_name}},
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Votre compte ambassadeur a été créé avec succès. Pour activer votre compte, vous devez définir votre mot de passe en cliquant sur le bouton ci-dessous.
    </p>
    <ul style="color: #374151; font-size: 14px; line-height: 1.4; margin-bottom: 16px; padding-left: 18px;">
      <li>Gérer vos clients et prospects</li>
      <li>Suivre vos commissions</li>
      <li>Créer des offres personnalisées</li>
      <li>Accéder à vos outils de vente</li>
    </ul>
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Email :</strong> {{user_email}}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{activation_url}}" style="background-color: #3b82f6; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Activer mon compte et définir mon mot de passe
      </a>
    </div>
    <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 16px 0 0 0;">
      Ce lien d''activation est valide pendant 7 jours.
    </p>
    <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 8px 0 0 0;">
      Si vous n''avez pas demandé la création de ce compte, vous pouvez ignorer cet email.
    </p>
  </div>
</div>',
  subject = 'Activez votre compte ambassadeur {{company_name}}',
  updated_at = now()
WHERE type = 'ambassador_account';