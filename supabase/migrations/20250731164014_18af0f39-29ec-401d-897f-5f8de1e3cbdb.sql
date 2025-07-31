-- Ajouter les templates d'email manquants pour les ambassadeurs
INSERT INTO public.email_templates (
    company_id,
    type,
    name,
    subject,
    html_content,
    active
) VALUES 
-- Template invitation ambassadeur pour iTakecare
(
    'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
    'ambassador_invitation',
    'Invitation Ambassadeur',
    'Bienvenue dans l''équipe iTakecare - Activez votre compte ambassadeur',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue chez iTakecare</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 40px 20px; text-align: center; }
        .logo { max-width: 150px; height: auto; }
        .content { padding: 40px 20px; }
        .title { color: #1e293b; font-size: 28px; font-weight: bold; margin-bottom: 20px; }
        .text { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .highlight { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            {{#if company_logo}}
                <img src="{{company_logo}}" alt="{{company_name}}" class="logo">
            {{else}}
                <h1 style="color: white; margin: 0;">{{company_name}}</h1>
            {{/if}}
        </div>
        
        <div class="content">
            <h1 class="title">Bienvenue dans l''équipe, {{user_name}} !</h1>
            
            <p class="text">
                Nous sommes ravis de vous accueillir en tant qu''ambassadeur chez <strong>{{company_name}}</strong>. 
                Votre expertise et votre passion seront des atouts précieux pour notre équipe.
            </p>
            
            <div class="highlight">
                <p class="text" style="margin: 0;">
                    <strong>🎯 Votre mission :</strong> Développer notre réseau et accompagner nos clients 
                    dans leurs projets de leasing avec excellence et professionnalisme.
                </p>
            </div>
            
            <p class="text">
                Pour commencer, vous devez activer votre compte en cliquant sur le bouton ci-dessous :
            </p>
            
            <div style="text-align: center;">
                <a href="{{activation_url}}" class="button">Activer mon compte ambassadeur</a>
            </div>
            
            <p class="text">
                Une fois votre compte activé, vous aurez accès à :
            </p>
            
            <ul style="color: #475569; font-size: 16px; line-height: 1.6;">
                <li>🏢 Votre tableau de bord personnalisé</li>
                <li>👥 La gestion de vos clients</li>
                <li>💰 Le suivi de vos commissions</li>
                <li>📊 Vos statistiques de performance</li>
                <li>🎯 Les outils de prospection</li>
            </ul>
            
            <p class="text">
                Si vous avez des questions, n''hésitez pas à nous contacter. Nous sommes là pour vous accompagner !
            </p>
            
            <p class="text">
                <strong>Bienvenue dans l''aventure iTakecare !</strong><br>
                L''équipe iTakecare
            </p>
        </div>
        
        <div class="footer">
            <p>Ce lien d''activation expirera dans 48 heures.</p>
            <p>{{company_name}} | {{company_address}}</p>
            <p>Si vous n''arrivez pas à cliquer sur le bouton, copiez ce lien : {{activation_url}}</p>
        </div>
    </div>
</body>
</html>',
    true
),
-- Template suppression compte ambassadeur pour iTakecare
(
    'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
    'ambassador_account_deleted',
    'Suppression Compte Ambassadeur',
    'Votre compte ambassadeur iTakecare a été supprimé',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compte supprimé - iTakecare</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 40px 20px; text-align: center; }
        .logo { max-width: 150px; height: auto; }
        .content { padding: 40px 20px; }
        .title { color: #1e293b; font-size: 28px; font-weight: bold; margin-bottom: 20px; }
        .text { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
        .alert { background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            {{#if company_logo}}
                <img src="{{company_logo}}" alt="{{company_name}}" class="logo">
            {{else}}
                <h1 style="color: white; margin: 0;">{{company_name}}</h1>
            {{/if}}
        </div>
        
        <div class="content">
            <h1 class="title">Suppression de votre compte ambassadeur</h1>
            
            <p class="text">
                Bonjour {{user_name}},
            </p>
            
            <div class="alert">
                <p class="text" style="margin: 0;">
                    <strong>⚠️ Information importante :</strong> Votre compte ambassadeur chez 
                    <strong>{{company_name}}</strong> a été supprimé le {{deletion_date}}.
                </p>
            </div>
            
            <p class="text">
                Cette suppression signifie que :
            </p>
            
            <ul style="color: #475569; font-size: 16px; line-height: 1.6;">
                <li>❌ Vous n''avez plus accès à votre tableau de bord</li>
                <li>❌ Vos accès aux outils de gestion ont été révoqués</li>
                <li>📊 Vos données historiques ont été archivées</li>
                <li>💰 Les commissions en cours de traitement seront finalisées selon nos conditions</li>
            </ul>
            
            <p class="text">
                Si vous pensez qu''il s''agit d''une erreur ou si vous souhaitez des clarifications, 
                n''hésitez pas à contacter notre équipe administrative.
            </p>
            
            <p class="text">
                Nous vous remercions pour votre collaboration passée et vous souhaitons le meilleur 
                pour la suite de votre parcours professionnel.
            </p>
            
            <p class="text">
                Cordialement,<br>
                L''équipe iTakecare
            </p>
        </div>
        
        <div class="footer">
            <p>{{company_name}} | {{company_address}}</p>
            <p>Pour toute question : {{company_email}}</p>
        </div>
    </div>
</body>
</html>',
    true
)
ON CONFLICT DO NOTHING;