export interface DefaultArticle {
  title: string;
  content: string;
  category: string;
}

export const defaultKnowledgeBaseArticles: DefaultArticle[] = [
  // ── GÉNÉRAL ──
  {
    title: "Qu'est-ce que le leasing informatique ?",
    category: "general",
    content: `Le **leasing informatique** (ou location financière) est un mode de financement qui vous permet d'utiliser du matériel informatique sans l'acheter.

## Principe
Plutôt que d'investir une somme importante en une seule fois, vous payez un **loyer mensuel fixe** pendant une durée déterminée (généralement 24, 36 ou 48 mois).

## Avantages clés
- **Préservation de trésorerie** : pas d'investissement initial lourd
- **Charges déductibles** : les loyers sont des charges d'exploitation
- **Matériel toujours récent** : renouvellement facilité en fin de contrat
- **Budget prévisible** : mensualités fixes sans surprise

## Pour qui ?
Le leasing s'adresse à toutes les entreprises, des TPE aux grands groupes, qui souhaitent s'équiper en informatique sans immobiliser leur capital.`,
  },
  {
    title: "Comment fonctionne iTakecare ?",
    category: "general",
    content: `**iTakecare** est votre plateforme de gestion de leasing informatique. Voici comment elle fonctionne :

## 1. Catalogue d'équipements
Parcourez notre catalogue de produits (ordinateurs, écrans, accessoires…) avec les prix d'achat et les mensualités de leasing calculées automatiquement.

## 2. Demande de devis
Sélectionnez les équipements souhaités, configurez les options (RAM, stockage, garantie…) et soumettez votre demande de devis.

## 3. Validation et signature
Une fois le devis validé par votre gestionnaire, vous recevez un contrat à signer électroniquement directement depuis la plateforme.

## 4. Livraison
Après signature, les équipements sont commandés et livrés à l'adresse de votre choix.

## 5. Suivi
Depuis votre espace client, vous pouvez suivre vos contrats, consulter vos factures, signaler un problème ou demander un renouvellement.`,
  },
  {
    title: "Avantages du leasing vs achat",
    category: "general",
    content: `## Comparatif : Leasing vs Achat

| Critère | Leasing | Achat |
|---------|---------|-------|
| **Investissement initial** | Faible (1er loyer) | Élevé (prix total) |
| **Impact trésorerie** | Minimal | Important |
| **Comptabilité** | Charges d'exploitation | Immobilisation + amortissement |
| **Obsolescence** | Renouvellement facile | Revente complexe |
| **Maintenance** | Souvent incluse | À votre charge |
| **Flexibilité** | Évolutif | Rigide |

## Quand choisir le leasing ?
- Vous souhaitez préserver votre trésorerie
- Vous voulez du matériel toujours à jour
- Vous préférez des coûts prévisibles
- Vous équipez régulièrement de nouveaux collaborateurs

## Quand choisir l'achat ?
- Vous avez un budget disponible
- Le matériel a une durée de vie très longue
- Vous n'avez pas besoin de renouvellement fréquent`,
  },
  {
    title: "Quels types d'équipements peut-on financer ?",
    category: "general",
    content: `Notre catalogue couvre un large éventail d'équipements informatiques professionnels :

## Ordinateurs
- **Laptops** : MacBook Pro, MacBook Air, Dell Latitude, HP EliteBook, Lenovo ThinkPad…
- **Desktops** : iMac, Mac Mini, Mac Studio, Dell OptiPlex, HP ProDesk…

## Écrans et périphériques
- Écrans professionnels (24" à 34")
- Claviers et souris ergonomiques
- Stations d'accueil et hubs USB-C
- Webcams et casques audio

## Tablettes
- iPad Pro, iPad Air
- Samsung Galaxy Tab
- Microsoft Surface

## Accessoires
- Sacoches et sacs à dos professionnels
- Supports et bras d'écran
- Câbles et adaptateurs

## Serveurs et réseau
- Serveurs rack et tour
- Switches et routeurs
- Solutions Wi-Fi professionnelles

💡 *Vous ne trouvez pas un équipement ? Contactez-nous pour une demande personnalisée.*`,
  },
  {
    title: "Comment contacter le support ?",
    category: "general",
    content: `Plusieurs canaux sont à votre disposition pour contacter notre équipe :

## 1. Tickets de support (recommandé)
Depuis votre espace client, ouvrez un **ticket de support** :
- Cliquez sur "Support" dans le menu
- Décrivez votre problème en détail
- Joignez des captures d'écran si nécessaire
- Suivez l'avancement de votre demande en temps réel

## 2. Chat en direct
Un **chat en direct** est disponible pendant les heures ouvrables. Vous pouvez discuter avec un agent directement depuis la plateforme.

## 3. Email
Envoyez-nous un email à l'adresse indiquée dans votre espace client. Nous répondons sous 24h ouvrées.

## 4. Téléphone
Pour les urgences, contactez-nous par téléphone aux horaires d'ouverture indiqués dans votre contrat.

## Délais de réponse
- **Tickets** : sous 4h ouvrées
- **Chat** : réponse immédiate si un agent est disponible
- **Email** : sous 24h ouvrées`,
  },

  // ── CONTRATS ──
  {
    title: "Comment signer un contrat ?",
    category: "contrats",
    content: `La signature de votre contrat de leasing se fait **entièrement en ligne** :

## Étapes
1. **Réception du lien** : vous recevez un email avec un lien vers votre contrat
2. **Consultation** : lisez les conditions du contrat (durée, mensualité, équipements…)
3. **Informations** : complétez vos informations personnelles et celles de votre entreprise
4. **Signature électronique** : signez directement depuis votre navigateur
5. **Confirmation** : vous recevez une copie signée par email

## Signature électronique
La signature électronique a la même valeur juridique qu'une signature manuscrite. Elle est sécurisée et conforme à la réglementation européenne (eIDAS).

## Documents nécessaires
- Carte d'identité du signataire
- Numéro de TVA de l'entreprise
- Coordonnées bancaires (pour le prélèvement)

⚠️ *Seul un représentant légal ou une personne dûment mandatée peut signer le contrat.*`,
  },
  {
    title: "Quelle est la durée d'un contrat de leasing ?",
    category: "contrats",
    content: `## Durées disponibles

Nous proposons plusieurs durées de contrat adaptées à vos besoins :

| Durée | Idéal pour | Mensualité |
|-------|-----------|------------|
| **24 mois** | Matériel à renouveler fréquemment | Plus élevée |
| **36 mois** | Bon compromis durée/coût | Intermédiaire |
| **48 mois** | Optimisation budgétaire | Plus basse |
| **60 mois** | Équipements à longue durée de vie | La plus basse |

## Comment choisir ?
- **24-36 mois** : recommandé pour les laptops et smartphones (évolution technologique rapide)
- **36-48 mois** : recommandé pour les écrans et accessoires
- **48-60 mois** : recommandé pour les serveurs et équipements réseau

## À savoir
- La durée est fixée à la signature et ne peut pas être modifiée en cours de contrat
- Plus la durée est longue, plus la mensualité est basse
- En fin de contrat, vous pouvez renouveler, racheter ou restituer le matériel`,
  },
  {
    title: "Comment résilier ou modifier un contrat ?",
    category: "contrats",
    content: `## Modification de contrat

Les modifications suivantes peuvent être demandées en cours de contrat :
- **Ajout d'équipements** : un avenant sera créé avec mise à jour de la mensualité
- **Changement d'adresse de livraison** : contactez le support
- **Modification des coordonnées de facturation** : depuis votre espace client

## Résiliation anticipée

La résiliation anticipée est possible sous certaines conditions :

### Conditions
- Préavis minimum selon les termes du contrat
- Paiement des indemnités de résiliation anticipée (généralement les loyers restants avec une décote)
- Restitution du matériel en bon état

### Procédure
1. Contactez le support via un ticket
2. Recevez un devis de résiliation
3. Validez et signez l'avenant de résiliation
4. Restituez le matériel
5. Le contrat est clôturé

⚠️ *La résiliation anticipée entraîne des frais. Consultez votre contrat pour les détails.*`,
  },
  {
    title: "Que se passe-t-il à la fin du contrat ?",
    category: "contrats",
    content: `À l'échéance de votre contrat de leasing, **trois options** s'offrent à vous :

## 1. Renouvellement 🔄
Renouvelez votre parc avec du matériel neuf et un nouveau contrat :
- Bénéficiez des dernières technologies
- Conservez le même budget mensuel
- Transition fluide sans interruption

## 2. Rachat 💰
Achetez le matériel à sa **valeur résiduelle** (généralement 1€ à 15% du prix initial selon le contrat) :
- Idéal si le matériel est encore performant
- Vous en devenez propriétaire
- Plus de mensualités à payer

## 3. Restitution 📦
Retournez simplement le matériel :
- Pas de frais supplémentaires
- Le matériel est récupéré et recyclé
- Votre engagement prend fin

## Processus
- Vous êtes contacté **3 mois avant** l'échéance
- Vous choisissez votre option
- Nous organisons la transition`,
  },
  {
    title: "Comment consulter mes contrats en cours ?",
    category: "contrats",
    content: `## Accéder à vos contrats

Depuis votre **espace client**, accédez à la section "Contrats" dans le menu latéral.

## Informations disponibles
Pour chaque contrat, vous pouvez consulter :
- **Statut** : en cours, en attente de signature, terminé
- **Équipements** : liste détaillée du matériel
- **Mensualité** : montant et date de prélèvement
- **Durée** : date de début et date de fin
- **Documents** : contrat signé, conditions générales

## Filtres et recherche
- Filtrez par statut (actif, terminé, en attente)
- Recherchez par numéro de contrat ou nom d'équipement

## Téléchargement
Vous pouvez télécharger à tout moment :
- Le contrat signé (PDF)
- Les conditions générales
- Le récapitulatif des équipements`,
  },
  {
    title: "Qu'est-ce que l'apport initial ?",
    category: "contrats",
    content: `## Définition

L'**apport initial** (ou "premier loyer majoré" / "down payment") est un montant versé à la signature du contrat, qui vient en déduction du financement total.

## Fonctionnement
- L'apport réduit le montant financé
- Les mensualités sont recalculées à la baisse
- L'apport est généralement compris entre **0% et 30%** du prix total

## Exemple
Pour un équipement à **3 000 €** sur 36 mois :

| Apport | Montant financé | Mensualité estimée |
|--------|----------------|-------------------|
| 0% | 3 000 € | ~95 €/mois |
| 10% (300 €) | 2 700 € | ~85 €/mois |
| 20% (600 €) | 2 400 € | ~76 €/mois |

## À savoir
- L'apport initial n'est **pas obligatoire**
- Il est prélevé à la signature du contrat
- Il permet de réduire significativement les mensualités
- Le montant est mentionné clairement dans votre contrat`,
  },

  // ── ÉQUIPEMENTS ──
  {
    title: "Comment demander un nouvel équipement ?",
    category: "equipements",
    content: `## Procédure de demande

### Depuis le catalogue
1. Accédez au **catalogue** depuis votre espace client
2. Parcourez les catégories ou utilisez la recherche
3. Sélectionnez l'équipement souhaité
4. Configurez les options (RAM, stockage, couleur…)
5. Ajoutez au panier et soumettez votre demande

### Demande personnalisée
Si l'équipement souhaité n'est pas au catalogue :
1. Ouvrez un **ticket de support**
2. Décrivez précisément l'équipement recherché (marque, modèle, spécifications)
3. Notre équipe vous fera parvenir un devis personnalisé

## Délais
- **Validation du devis** : sous 24-48h
- **Commande** : dès signature du contrat
- **Livraison** : 5 à 15 jours ouvrés selon disponibilité

## Suivi
Suivez l'état de votre commande en temps réel depuis la section "Commandes" de votre espace.`,
  },
  {
    title: "Comment signaler une panne ou un problème ?",
    category: "equipements",
    content: `## Signaler un incident

### Étapes
1. Connectez-vous à votre **espace client**
2. Allez dans **Support** > **Nouveau ticket**
3. Sélectionnez la catégorie "Panne / Problème technique"
4. Identifiez l'équipement concerné
5. Décrivez le problème en détail
6. Joignez des photos ou captures d'écran si possible

### Informations utiles à fournir
- Numéro de série de l'équipement
- Description précise du problème
- Date d'apparition du problème
- Étapes pour reproduire le problème

## Garantie
Vos équipements en leasing bénéficient d'une **garantie constructeur**. Selon votre contrat, vous pouvez aussi avoir :
- Garantie étendue
- Assurance casse/vol
- Remplacement sous 24-48h

## En cas d'urgence
Pour un problème bloquant, contactez-nous par **chat en direct** ou **téléphone** pour un traitement prioritaire.`,
  },
  {
    title: "Marques et modèles disponibles",
    category: "equipements",
    content: `## Nos partenaires constructeurs

### Apple 🍎
- MacBook Pro (14" et 16")
- MacBook Air (13" et 15")
- iMac 24"
- Mac Mini / Mac Studio / Mac Pro
- iPad Pro / iPad Air

### Dell
- Latitude (ultraportables professionnels)
- OptiPlex (desktops)
- Precision (stations de travail)
- UltraSharp (écrans)

### HP
- EliteBook (laptops premium)
- ProBook (laptops)
- ProDesk (desktops)
- Elite Display (écrans)

### Lenovo
- ThinkPad (laptops professionnels)
- ThinkCentre (desktops)
- ThinkVision (écrans)

### Microsoft
- Surface Pro
- Surface Laptop
- Surface Studio

### Accessoires
- Logitech (claviers, souris, webcams)
- Jabra / Poly (casques, visioconférence)
- Samsung (écrans)

💡 *Le catalogue est régulièrement mis à jour. Contactez-nous pour tout modèle spécifique.*`,
  },
  {
    title: "Renouvellement d'équipement",
    category: "equipements",
    content: `## Quand renouveler ?

Le renouvellement est possible :
- **À l'échéance du contrat** : option standard
- **En cours de contrat** : sous conditions (avenant nécessaire)

## Processus de renouvellement

### 1. Notification
Vous êtes notifié **3 mois** avant la fin de votre contrat avec les options disponibles.

### 2. Choix du nouveau matériel
- Parcourez le catalogue mis à jour
- Bénéficiez des conseils de notre équipe
- Configurez vos nouveaux équipements

### 3. Transition
- **Migration des données** : nous pouvons organiser le transfert de vos données
- **Récupération** : l'ancien matériel est collecté à la livraison du nouveau
- **Continuité** : aucune interruption de service

## Avantages du renouvellement
- Matériel toujours performant et à jour
- Nouvelles garanties constructeur
- Possibilité de faire évoluer votre parc (plus/moins d'équipements)
- Mensualités adaptées aux nouveaux besoins`,
  },
  {
    title: "Suivi et inventaire de mes équipements",
    category: "equipements",
    content: `## Tableau de bord équipements

Depuis votre espace client, la section **"Équipements"** vous donne une vue complète de votre parc :

### Informations par équipement
- **Modèle** : marque, référence, spécifications
- **Numéro de série** : identification unique
- **Contrat associé** : numéro et durée
- **Utilisateur** : collaborateur assigné
- **Statut** : actif, en maintenance, restitué

### Fonctionnalités
- **Recherche** : trouvez rapidement un équipement
- **Filtres** : par type, statut, collaborateur, contrat
- **Export** : téléchargez la liste complète en CSV/Excel

## Gestion des attributions
- Assignez un équipement à un collaborateur
- Suivez l'historique des attributions
- Gérez les changements d'utilisateur

## Rapports
- Vue d'ensemble de votre parc informatique
- Statistiques par catégorie d'équipement
- Alertes de fin de contrat`,
  },

  // ── FACTURATION ──
  {
    title: "Comment sont calculées les mensualités ?",
    category: "facturation",
    content: `## Calcul des mensualités

La mensualité de leasing dépend de plusieurs facteurs :

### Formule simplifiée
\`\`\`
Mensualité = (Prix de l'équipement × Coefficient) / Durée du contrat
\`\`\`

### Facteurs influençant la mensualité
| Facteur | Impact |
|---------|--------|
| **Prix de l'équipement** | Plus le prix est élevé, plus la mensualité augmente |
| **Durée du contrat** | Plus la durée est longue, plus la mensualité est basse |
| **Apport initial** | Réduit le montant financé, donc la mensualité |
| **Coefficient** | Taux appliqué, dépend du profil et du volume |
| **Options** | Garantie étendue, assurance… |

### Exemple
Un laptop à **2 000 €** :
- Sur 24 mois : ~**92 €**/mois
- Sur 36 mois : ~**64 €**/mois
- Sur 48 mois : ~**50 €**/mois

*Les montants sont donnés à titre indicatif et peuvent varier selon votre contrat.*

## TVA
Les mensualités sont exprimées **hors taxes**. La TVA applicable est ajoutée sur chaque facture.`,
  },
  {
    title: "Où consulter mes factures ?",
    category: "facturation",
    content: `## Accès aux factures

### Depuis votre espace client
1. Connectez-vous à votre espace
2. Cliquez sur **"Factures"** dans le menu
3. Consultez la liste de toutes vos factures

### Informations disponibles
Pour chaque facture :
- **Numéro** : référence unique
- **Date d'émission** : date de création
- **Montant HT / TTC** : détail des montants
- **Statut** : payée, en attente, en retard
- **Contrat associé** : lien vers le contrat

### Actions possibles
- **Télécharger** : format PDF
- **Filtrer** : par période, statut, contrat
- **Rechercher** : par numéro ou montant

## Fréquence de facturation
- Les factures sont émises **mensuellement**
- Elles sont envoyées par email et disponibles dans votre espace
- Le prélèvement intervient à la date convenue dans le contrat

## Historique
Toutes vos factures sont archivées et accessibles sans limite de durée.`,
  },
  {
    title: "Que faire en cas d'impayé ?",
    category: "facturation",
    content: `## Gestion des impayés

### Causes fréquentes
- Solde insuffisant sur le compte
- Changement de coordonnées bancaires non signalé
- Problème technique avec la banque

### Procédure en cas d'impayé

#### 1. Notification
Vous recevez un **email de rappel** automatique dès qu'un impayé est détecté.

#### 2. Régularisation (sous 7 jours)
- Vérifiez votre solde bancaire
- Mettez à jour vos coordonnées si nécessaire
- Le prélèvement sera relancé automatiquement

#### 3. Relance (après 7 jours)
Si le paiement n'est pas régularisé :
- Un courrier de relance est envoyé
- Des frais de retard peuvent s'appliquer
- Contactez le support pour trouver une solution

### Comment éviter les impayés ?
- Vérifiez que votre compte est provisionné avant la date de prélèvement
- Signalez tout changement de coordonnées bancaires à l'avance
- Configurez des alertes bancaires

⚠️ *Des impayés répétés peuvent entraîner la suspension du contrat.*`,
  },
  {
    title: "Comment modifier mes coordonnées de facturation ?",
    category: "facturation",
    content: `## Modifier vos informations de facturation

### Depuis votre espace client
1. Accédez à votre **profil** ou **paramètres du compte**
2. Section **"Facturation"** ou **"Informations de l'entreprise"**
3. Modifiez les champs souhaités
4. Enregistrez les modifications

### Informations modifiables
- **Raison sociale** de l'entreprise
- **Adresse de facturation** (rue, code postal, ville, pays)
- **Numéro de TVA** intracommunautaire
- **Email de facturation** (adresse de réception des factures)
- **Personne de contact** pour la facturation

### Coordonnées bancaires
Pour modifier vos coordonnées bancaires (IBAN) :
1. Ouvrez un **ticket de support**
2. Joignez un nouveau mandat SEPA signé
3. Le changement sera effectué sous 5 jours ouvrés

⚠️ *Le changement de coordonnées bancaires nécessite une vérification manuelle pour des raisons de sécurité.*

### Délai de prise en compte
- Modifications d'adresse/contact : **immédiat**
- Changement bancaire : **5 jours ouvrés**`,
  },
];
