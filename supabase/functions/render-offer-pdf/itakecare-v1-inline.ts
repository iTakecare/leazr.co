export const ITAKECARE_V1_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposition Commerciale iTakecare - {{client.name}}</title>
  
  <!-- Google Fonts : Carlito -->
  <link href="https://fonts.googleapis.com/css2?family=Carlito:wght@400;700&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <style>
    @page {
      size: A4;
      margin: 12mm;
    }
    
    * {
      font-family: 'Carlito', sans-serif;
    }
    
    body {
      font-size: 11pt;
      line-height: 1.5;
    }
    
    .page {
      page-break-after: always;
      width: 210mm;
      min-height: 273mm;
      background: white;
      position: relative;
      padding: 0;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .no-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    /* Couleurs iTakecare */
    .bg-primary { background-color: #33638e; }
    .bg-secondary { background-color: #4ab6c4; }
    .bg-accent { background-color: #da2959; }
    .text-primary { color: #33638e; }
    .text-secondary { color: #4ab6c4; }
    .text-accent { color: #da2959; }
    .border-primary { border-color: #33638e; }
    .border-secondary { border-color: #4ab6c4; }
    
    /* Header réutilisable */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #4ab6c4;
    }
    
    .page-header h1 {
      font-size: 16pt;
      font-weight: 400;
      color: #33638e;
      letter-spacing: 0.5px;
    }
    
    /* Section avec bandeau */
    .section-banner {
      background-color: #33638e;
      color: white;
      padding: 12px 20px;
      margin: 0 -20px 20px -20px;
      font-size: 18pt;
      font-weight: 700;
    }
    
    /* Cercles numérotés */
    .step-circle {
      width: 50px;
      height: 50px;
      background-color: #33638e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 22px;
      font-weight: 700;
      flex-shrink: 0;
    }
    
    .step-badge {
      width: 40px;
      height: 40px;
      background-color: #4ab6c4;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      font-weight: 700;
    }
    
    /* Tables */
    table.equipment-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    table.equipment-table th {
      background-color: #33638e;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: 700;
    }
    
    table.equipment-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e5e7eb;
    }
  </style>
</head>
<body class="bg-white">

  <!-- ============================================ -->
  <!-- PAGE 1 : COUVERTURE -->
  <!-- ============================================ -->
  <section id="cover" class="page" style="padding: 30px 40px; display: flex; flex-direction: column; justify-content: space-between;">
    
    <!-- Image circulaire en haut à droite -->
    <div style="position: absolute; top: 30px; right: 40px; width: 160px; height: 160px; border-radius: 50%; overflow: hidden; background: #f3f4f6;">
      <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400" 
           style="width: 100%; height: 100%; object-fit: cover;" 
           alt="Office team" />
    </div>
    
    <!-- Contenu principal centré -->
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding-right: 180px;">
      
      <h1 style="font-size: 32pt; font-weight: 700; color: #33638e; margin-bottom: 10px; line-height: 1.2;">
        Proposition Commerciale<br>
        pour Services de Leasing IT
      </h1>
      
      <div style="width: 100%; height: 4px; background-color: #33638e; margin-bottom: 40px;"></div>
      
      <p style="font-size: 14pt; color: #6b7280; margin-bottom: 15px;">
        Offre spécialement conçue pour
      </p>
      
      <!-- Encadré client -->
      <div style="background-color: #f9fafb; border: 2px solid #4ab6c4; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
        <h2 style="font-size: 22pt; font-weight: 700; color: #33638e; margin-bottom: 8px;">
          {{client.name}}
        </h2>
        {{#if client.contactName}}
        <p style="font-size: 12pt; color: #6b7280; margin-bottom: 4px;">
          À l'attention de : {{client.contactName}}
        </p>
        {{/if}}
        {{#if client.address}}
        <p style="font-size: 11pt; color: #6b7280; margin-bottom: 2px;">{{client.address}}</p>
        {{/if}}
        {{#if client.email}}
        <p style="font-size: 11pt; color: #6b7280; margin-bottom: 2px;">Email : {{client.email}}</p>
        {{/if}}
        {{#if client.phone}}
        <p style="font-size: 11pt; color: #6b7280;">Tél : {{client.phone}}</p>
        {{/if}}
      </div>
      
      <p style="font-size: 11pt; color: #9ca3af;">
        Offre n° <strong>{{offer.id}}</strong> — Date : {{date offer.date 'short'}}
      </p>
    </div>
    
    <!-- Footer avec logo et commercial -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="width: 140px; height: 50px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-bottom: 8px;">
          <span style="color: white; font-size: 20pt; font-weight: 700;">iTakecare</span>
        </div>
        <p style="font-size: 10pt; color: #6b7280; margin: 0;">
          PAR ITAKECARE • GIANNI SERGI
        </p>
      </div>
      
      <!-- Image décorative -->
      <div style="width: 150px; height: 150px; border-radius: 50%; overflow: hidden; background: #4ab6c4;">
        <img src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=300" 
             style="width: 100%; height: 100%; object-fit: cover; opacity: 0.9;" 
             alt="Sustainability" />
      </div>
    </div>
    
  </section>

  <!-- ============================================ -->
  <!-- PAGE 2 : VISION + INTRODUCTION -->
  <!-- ============================================ -->
  <section id="introVision" class="page" style="padding: 30px 40px;">
    
    <!-- Header -->
    <div class="page-header">
      <h1>PROPOSITION COMMERCIALE</h1>
      <div style="width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
        <span style="color: white; font-size: 14pt; font-weight: 700;">iTakecare</span>
      </div>
    </div>
    
    <!-- Introduction -->
    <div style="margin-bottom: 30px;">
      <p style="margin-bottom: 12px; text-align: justify; color: #374151;">
        Cher partenaire, bienvenue dans cette proposition commerciale spécialement conçue pour répondre à vos besoins en équipements informatiques professionnels. Chez <strong>iTakecare</strong>, nous croyons en une approche durable et responsable du leasing IT.
      </p>
      
      <p style="margin-bottom: 12px; text-align: justify; color: #374151;">
        Notre mission est simple : vous permettre d'accéder aux meilleurs équipements technologiques tout en préservant votre trésorerie et en réduisant votre empreinte carbone. Nous mettons un point d'honneur à proposer des solutions de <strong>leasing flexibles</strong>, transparentes et adaptées à chaque entreprise.
      </p>
      
      <p style="margin-bottom: 12px; text-align: justify; color: #374151;">
        Que vous soyez une PME en pleine croissance ou une grande structure établie, nous sommes là pour vous accompagner dans votre transformation digitale. Notre équipe d'experts sélectionne pour vous du matériel de qualité, neuf ou reconditionné, et vous propose un service <strong>clé en main</strong> incluant la livraison, l'installation et la maintenance.
      </p>
      
      <p style="margin-bottom: 12px; text-align: justify; color: #374151;">
        Nous savons à quel point la technologie est essentielle au bon fonctionnement de votre activité. C'est pourquoi nous nous engageons à vous fournir un service rapide, fiable et personnalisé. Nos partenaires nous font confiance pour gérer leur parc informatique en toute sérénité.
      </p>
      
      <p style="margin-bottom: 20px; text-align: justify; color: #374151;">
        Cette proposition détaille l'ensemble de notre offre, nos valeurs, notre fonctionnement et les modalités contractuelles. Nous restons à votre disposition pour toute question ou ajustement.
      </p>
    </div>
    
    <!-- Section Notre Vision avec fond -->
    <div style="position: relative; background: linear-gradient(135deg, #4ab6c4 0%, #33638e 100%); border-radius: 16px; padding: 50px 40px; text-align: center; color: white; margin-top: 30px; overflow: hidden;">
      
      <!-- Overlay image -->
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.15; background-image: url('https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800'); background-size: cover; background-position: center;"></div>
      
      <div style="position: relative; z-index: 1;">
        <h2 style="font-size: 28pt; font-weight: 700; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          Notre vision
        </h2>
        <p style="font-size: 14pt; font-style: italic; line-height: 1.7; max-width: 700px; margin: 0 auto;">
          « Nous prenons soin de la planète, de votre business, de vos collaborateurs et de votre parc informatique. Notre ambition est de rendre la technologie accessible à tous, de manière durable et responsable. »
        </p>
      </div>
    </div>
    
    <!-- Footer logo -->
    <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
      <span style="color: white; font-size: 13pt; font-weight: 700;">iTakecare</span>
    </div>
    
  </section>

  <!-- ============================================ -->
  <!-- PAGE 3 : NOTRE SOLUTION -->
  <!-- ============================================ -->
  <section id="solution" class="page" style="padding: 30px 40px;">
    
    <!-- Header -->
    <div class="page-header">
      <h1>PROPOSITION COMMERCIALE</h1>
      <div style="width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
        <span style="color: white; font-size: 14pt; font-weight: 700;">iTakecare</span>
      </div>
    </div>
    
    <!-- Bandeau -->
    <div class="section-banner">Notre solution</div>
    
    <p style="font-size: 12pt; color: #374151; margin-bottom: 20px;">
      Après analyse, voici l'offre que nous pouvons vous proposer :
    </p>
    
    <!-- Tableau des équipements -->
    <table class="equipment-table no-break">
      <thead>
        <tr>
          <th style="width: 50%;">Équipement</th>
          <th style="width: 10%; text-align: center;">Qté</th>
          <th style="width: 20%; text-align: right;">Prix unitaire/mois</th>
          <th style="width: 20%; text-align: right;">Total/mois</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td>
            <div style="font-weight: 700; color: #111827;">{{label}}</div>
            {{#if brand}}
            <div style="font-size: 9pt; color: #6b7280;">{{brand}} {{model}}</div>
            {{/if}}
          </td>
          <td style="text-align: center; font-weight: 700;">{{qty}}</td>
          <td style="text-align: right;">{{currency unitMonthly 'EUR'}}</td>
          <td style="text-align: right; font-weight: 700; color: #33638e;">{{currency totalMonthly 'EUR'}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    
    <!-- Section mensualité totale -->
    <div style="background-color: #f9fafb; border: 2px solid #33638e; border-radius: 12px; padding: 25px; margin-top: 30px;" class="no-break">
      
      <h3 style="font-size: 16pt; font-weight: 700; color: #33638e; margin-bottom: 20px;">
        Mensualité totale :
      </h3>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div>
          <p style="font-size: 10pt; color: #6b7280; margin-bottom: 6px;">EST. ASSURANCE ANNUELLE*</p>
          <p style="font-size: 18pt; font-weight: 700; color: #33638e;">
            {{currency offer.insurance.annualEstimated 'EUR'}}
          </p>
        </div>
        <div>
          <p style="font-size: 10pt; color: #6b7280; margin-bottom: 6px;">FRAIS DE DOSSIER UNIQUE*</p>
          <p style="font-size: 18pt; font-weight: 700; color: #33638e;">
            75€ HTVA
          </p>
        </div>
      </div>
      
      <div style="height: 2px; background-color: #e5e7eb; margin: 20px 0;"></div>
      
      <p style="font-size: 12pt; color: #374151; margin-bottom: 8px;">
        <strong>Contrat de {{offer.termMonths}} mois</strong>
      </p>
      
      <p style="font-size: 11pt; color: #6b7280;">
        Livraison incluse — Maintenance incluse — Garantie en échange direct incluse
      </p>
      
    </div>
    
    <!-- Footer -->
    <div style="position: absolute; bottom: 20px; left: 40px; right: 40px; display: flex; justify-content: space-between; align-items: center;">
      <div style="width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
        <span style="color: white; font-size: 13pt; font-weight: 700;">iTakecare</span>
      </div>
      <p style="font-size: 9pt; color: #9ca3af; margin: 0;">* voir modalités de leasing en page 6</p>
    </div>
    
  </section>

  <!-- ============================================ -->
  <!-- PAGE 4 : NOS VALEURS -->
  <!-- ============================================ -->
  <section id="values" class="page" style="padding: 30px 40px;">
    
    <!-- Header -->
    <div class="page-header">
      <h1>PROPOSITION COMMERCIALE</h1>
      <div style="width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
        <span style="color: white; font-size: 14pt; font-weight: 700;">iTakecare</span>
      </div>
    </div>
    
    <!-- Bandeau -->
    <div class="section-banner">Nos valeurs</div>
    
    <!-- Valeur 1 : Evolution -->
    <div style="display: flex; align-items: flex-start; margin-bottom: 30px;" class="no-break">
      <div style="width: 80px; height: 80px; background-color: #4ab6c4; border-radius: 50%; flex-shrink: 0; margin-right: 20px; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
          <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
        </svg>
      </div>
      <div>
        <h3 style="font-size: 18pt; font-weight: 700; color: #33638e; margin-bottom: 10px;">Evolution.</h3>
        <p style="font-size: 11pt; color: #374151; line-height: 1.6; text-align: justify;">
          Nous sommes convaincus que la <strong>technologie</strong> doit évoluer avec votre entreprise. C'est pourquoi nous proposons des contrats flexibles qui s'adaptent à vos besoins. Que ce soit pour <strong>renouveler</strong>, <strong>upgrader</strong> ou <strong>étendre</strong> votre parc, nous sommes à vos côtés à chaque étape de votre croissance.
        </p>
      </div>
    </div>
    
    <!-- Valeur 2 : Confiance -->
    <div style="display: flex; align-items: flex-start; margin-bottom: 30px;" class="no-break">
      <div style="width: 80px; height: 80px; background-color: #4ab6c4; border-radius: 50%; flex-shrink: 0; margin-right: 20px; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
      </div>
      <div>
        <h3 style="font-size: 18pt; font-weight: 700; color: #33638e; margin-bottom: 10px;">Confiance.</h3>
        <p style="font-size: 11pt; color: #374151; line-height: 1.6; text-align: justify;">
          La <strong>transparence</strong> est au cœur de notre métier. Pas de frais cachés, pas de clauses surprises. Nous vous expliquons tout, simplement et clairement. Nos clients nous font confiance parce que nous tenons nos <strong>engagements</strong> et que nous sommes toujours disponibles pour répondre à leurs questions.
        </p>
      </div>
    </div>
    
    <!-- Valeur 3 : Entraide -->
    <div style="display: flex; align-items: flex-start; margin-bottom: 30px;" class="no-break">
      <div style="width: 80px; height: 80px; background-color: #4ab6c4; border-radius: 50%; flex-shrink: 0; margin-right: 20px; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      </div>
      <div>
        <h3 style="font-size: 18pt; font-weight: 700; color: #33638e; margin-bottom: 10px;">Entraide.</h3>
        <p style="font-size: 11pt; color: #374151; line-height: 1.6; text-align: justify;">
          Votre succès est notre succès. Nous nous considérons comme un véritable <strong>partenaire</strong> de votre entreprise. Notre équipe est là pour vous <strong>accompagner</strong>, vous <strong>conseiller</strong> et vous aider à tirer le meilleur parti de vos équipements. Ensemble, nous construisons une relation durable et gagnant-gagnant.
        </p>
      </div>
    </div>
    
    <!-- Section métriques -->
    <div style="background-color: #33638e; color: white; padding: 30px; border-radius: 12px; margin-top: 20px;" class="no-break">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; margin-bottom: 20px;">
        <div>
          <p style="font-size: 32pt; font-weight: 700; margin-bottom: 8px;">{{number metrics.clientsCount}}</p>
          <p style="font-size: 10pt; opacity: 0.9;">de clients satisfaits</p>
        </div>
        <div>
          <p style="font-size: 32pt; font-weight: 700; margin-bottom: 8px;">{{number metrics.devicesCount}}</p>
          <p style="font-size: 10pt; opacity: 0.9;">appareils dont nous prenons soin</p>
        </div>
        <div>
          <p style="font-size: 32pt; font-weight: 700; margin-bottom: 8px;">{{metrics.co2SavedTons}} T</p>
          <p style="font-size: 10pt; opacity: 0.9;">quantité de CO2e économisée depuis le début de l'aventure</p>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="position: absolute; bottom: 20px; left: 40px; right: 40px; text-align: center;">
      <p style="font-size: 9pt; color: #9ca3af; margin-bottom: 8px;">ILS NOUS FONT CONFIANCE</p>
      <div style="width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px; margin: 0 auto;">
        <span style="color: white; font-size: 13pt; font-weight: 700;">iTakecare</span>
      </div>
      <p style="font-size: 9pt; color: #9ca3af; margin-top: 8px;">Et beaucoup d'autres...</p>
    </div>
    
  </section>

  <!-- ============================================ -->
  <!-- PAGE 5 : COMMENT ÇA FONCTIONNE -->
  <!-- ============================================ -->
  <section id="howItWorks" class="page" style="padding: 30px 40px;">
    
    <!-- Header -->
    <div class="page-header">
      <h1>PROPOSITION COMMERCIALE</h1>
      <div style="width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
        <span style="color: white; font-size: 14pt; font-weight: 700;">iTakecare</span>
      </div>
    </div>
    
    <!-- Bandeau -->
    <div class="section-banner">Comment ça fonctionne ?</div>
    
    <h3 style="font-size: 14pt; font-weight: 700; color: #33638e; margin-bottom: 20px;">LES PROCHAINES ÉTAPES</h3>
    
    <!-- Grille des 4 étapes -->
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px;">
      
      <!-- Étape 1 -->
      <div style="background-color: #33638e; border-radius: 16px; padding: 25px; color: white; text-align: center; position: relative;" class="no-break">
        <div class="step-badge" style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%);">1</div>
        <p style="font-size: 12pt; line-height: 1.6; margin-top: 15px;">
          <strong>Validation de l'offre</strong><br>
          Vous confirmez cette proposition et nous envoyez les documents nécessaires (BCE, bilan, etc.)
        </p>
      </div>
      
      <!-- Étape 2 -->
      <div style="background-color: #33638e; border-radius: 16px; padding: 25px; color: white; text-align: center; position: relative;" class="no-break">
        <div class="step-badge" style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%);">2</div>
        <p style="font-size: 12pt; line-height: 1.6; margin-top: 15px;">
          <strong>Analyse du dossier</strong><br>
          Le bailleur étudie votre demande. Réponse sous 48 à 72 heures en général.
        </p>
      </div>
      
      <!-- Étape 3 -->
      <div style="background-color: #33638e; border-radius: 16px; padding: 25px; color: white; text-align: center; position: relative;" class="no-break">
        <div class="step-badge" style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%);">3</div>
        <p style="font-size: 12pt; line-height: 1.6; margin-top: 15px;">
          <strong>Signature du contrat</strong><br>
          Dès l'accord obtenu, nous préparons le contrat que vous signez électroniquement.
        </p>
      </div>
      
      <!-- Étape 4 -->
      <div style="background-color: #33638e; border-radius: 16px; padding: 25px; color: white; text-align: center; position: relative;" class="no-break">
        <div class="step-badge" style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%);">4</div>
        <p style="font-size: 12pt; line-height: 1.6; margin-top: 15px;">
          <strong>Livraison et installation</strong><br>
          Votre matériel est livré, installé et configuré. Vous êtes opérationnel immédiatement.
        </p>
      </div>
      
    </div>
    
    <!-- Témoignages -->
    <div style="margin-top: 40px;">
      <h3 style="font-size: 14pt; font-weight: 700; color: #33638e; margin-bottom: 20px; background-color: #f3f4f6; padding: 10px; border-left: 4px solid #33638e;">
        Ce que nos clients disent :
      </h3>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
        
        <!-- Témoignage 1 -->
        <div style="background-color: #33638e; border-radius: 50%; width: 220px; height: 220px; padding: 30px; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; position: relative;" class="no-break">
          <svg width="30" height="30" fill="#4ab6c4" viewBox="0 0 24 24" style="position: absolute; top: 20px; left: 20px;">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <p style="font-size: 10pt; font-style: italic; line-height: 1.5; margin-bottom: 15px;">
            "Service impeccable, réactivité exemplaire et matériel de qualité. Je recommande vivement !"
          </p>
          <p style="font-size: 9pt; font-weight: 700;">— Sophie L., CEO</p>
        </div>
        
        <!-- Témoignage 2 -->
        <div style="background-color: #33638e; border-radius: 50%; width: 220px; height: 220px; padding: 30px; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; position: relative;" class="no-break">
          <svg width="30" height="30" fill="#4ab6c4" viewBox="0 0 24 24" style="position: absolute; top: 20px; left: 20px;">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <p style="font-size: 10pt; font-style: italic; line-height: 1.5; margin-bottom: 15px;">
            "Grâce à iTakecare, nous avons pu moderniser tout notre parc sans impacter notre trésorerie."
          </p>
          <p style="font-size: 9pt; font-weight: 700;">— Marc D., DAF</p>
        </div>
        
      </div>
    </div>
    
    <!-- Footer -->
    <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);">
      <div style="width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
        <span style="color: white; font-size: 13pt; font-weight: 700;">iTakecare</span>
      </div>
    </div>
    
  </section>

  <!-- ============================================ -->
  <!-- PAGE 6 : MODALITÉS DU LEASING -->
  <!-- ============================================ -->
  <section id="terms" class="page" style="padding: 30px 40px;">
    
    <!-- Header -->
    <div class="page-header">
      <h1>PROPOSITION COMMERCIALE</h1>
      <div style="width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
        <span style="color: white; font-size: 14pt; font-weight: 700;">iTakecare</span>
      </div>
    </div>
    
    <!-- Bandeau -->
    <div class="section-banner">Modalités du leasing</div>
    
    <p style="font-size: 12pt; color: #374151; margin-bottom: 20px;">
      Simples mais importantes et utiles, il est facile d'en prendre connaissance ici :
    </p>
    
    <div style="font-size: 11pt; color: #374151; line-height: 1.7;">
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Type de contrat :</strong> Leasing opérationnel (LOA) avec option de rachat en fin de contrat. Le matériel reste la propriété du bailleur pendant toute la durée du contrat.
        </p>
      </div>
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Durée :</strong> {{offer.termMonths}} mois à compter de la date de livraison. Possibilité de renouvellement ou de rachat en fin de contrat.
        </p>
      </div>
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Paiement :</strong> Les mensualités sont <u>prélevées automatiquement</u> le <strong>5 de chaque mois</strong> via <strong>DOMICILIATION SEPA</strong> (obligatoire). Le premier prélèvement intervient le mois suivant la livraison. Les paiements sont <strong>anticipatifs</strong>.
        </p>
      </div>
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Frais de dossier :</strong> Un montant unique de <strong>75€ HTVA</strong> est facturé à la signature du contrat pour couvrir les frais administratifs.
        </p>
      </div>
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Assurance :</strong> Une assurance tous risques est <strong>fortement recommandée</strong> pour couvrir le vol, la casse et les dommages accidentels. Estimation annuelle : <strong>{{currency offer.insurance.annualEstimated 'EUR'}}</strong>. L'assurance minimale obligatoire est de <strong>{{currency offer.insurance.minAnnual 'EUR'}}/an</strong>.
        </p>
      </div>
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Livraison et installation :</strong> Incluses dans le prix. Notre équipe technique se charge de la livraison, du déballage, de l'installation et de la configuration initiale sur site.
        </p>
      </div>
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Maintenance et support :</strong> Support technique inclus pendant toute la durée du contrat. Garantie en <strong>échange direct</strong> en cas de panne matérielle.
        </p>
      </div>
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Fin de contrat :</strong> Trois options s'offrent à vous :
        </p>
        <ul style="list-style: disc; margin-left: 25px;">
          <li><strong>Restitution</strong> : vous rendez le matériel sans frais supplémentaires</li>
          <li><strong>Rachat</strong> : vous achetez le matériel à sa valeur résiduelle</li>
          <li><strong>Renouvellement</strong> : vous prolongez le leasing avec du matériel neuf</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Documents requis :</strong> Pour finaliser votre dossier, nous avons besoin de :
        </p>
        <ul style="list-style: disc; margin-left: 25px;">
          <li>Extrait BCE de moins de 3 mois</li>
          <li>Dernier bilan comptable (si société &gt; 1 an d'existence)</li>
          <li>Carte d'identité du gérant ou de la personne habilitée à signer</li>
          <li>Mandat de domiciliation SEPA signé</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 18px;" class="no-break">
        <p style="margin-bottom: 8px;">
          <strong>Approbation :</strong> L'acceptation définitive de votre demande est soumise à l'analyse de crédit du bailleur. Délai de réponse : <strong>48 à 72 heures</strong> en moyenne.
        </p>
      </div>
      
    </div>
    
    <!-- Footer -->
    <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);">
      <div style="width: 100px; height: 36px; background-color: #33638e; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
        <span style="color: white; font-size: 13pt; font-weight: 700;">iTakecare</span>
      </div>
    </div>
    
  </section>

  <!-- ============================================ -->
  <!-- PAGE 7 : PAGE DE FIN -->
  <!-- ============================================ -->
  <section id="end" class="page" style="padding: 0; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(180deg, #4ab6c4 0%, #33638e 100%);">
    
    <!-- Image du haut -->
    <div style="width: 100%; height: 180px; background-image: url('https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800'); background-size: cover; background-position: center; position: relative;">
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(74,182,196,0.8) 0%, rgba(51,99,142,0.6) 100%);"></div>
    </div>
    
    <!-- Contenu central -->
    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; color: white;">
      
      <!-- Logo -->
      <div style="width: 180px; height: 65px; background-color: white; display: flex; align-items: center; justify-content: center; border-radius: 12px; margin-bottom: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <span style="color: #33638e; font-size: 26pt; font-weight: 700;">iTakecare</span>
      </div>
      
      <!-- Message -->
      <h2 style="font-size: 28pt; font-weight: 700; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        Nous prenons soin
      </h2>
      
      <div style="font-size: 16pt; line-height: 1.8; margin-bottom: 30px;">
        <p style="margin: 0;">de la planète,</p>
        <p style="margin: 0;">de votre business,</p>
        <p style="margin: 0;">de vos collaborateurs,</p>
        <p style="margin: 0;">de votre parc informatique.</p>
      </div>
      
      <!-- Barre séparatrice -->
      <div style="width: 120px; height: 4px; background-color: white; margin: 30px 0;"></div>
      
    </div>
    
    <!-- Coordonnées -->
    <div style="background-color: rgba(255,255,255,0.95); padding: 30px 40px; color: #33638e;">
      
      <h3 style="font-size: 14pt; font-weight: 700; margin-bottom: 15px; text-align: center;">
        Siège social
      </h3>
      
      <div style="text-align: center; font-size: 11pt; line-height: 1.8;">
        <p style="margin: 0;">Avenue du Général Michel 1E</p>
        <p style="margin: 0;">6000 Charleroi</p>
        <p style="margin: 0;">Belgique</p>
        <p style="margin: 0; margin-top: 10px;">Tel : <strong>+ 32 471 511 121</strong></p>
        <p style="margin: 0;">Mail : <strong>hello@itakecare.be</strong></p>
        <p style="margin: 0; margin-top: 10px;">TVA: <strong>BE 0795.642.894</strong></p>
      </div>
      
    </div>
    
  </section>

</body>
</html>
`;