# Pourquoi un tunnel Tailscale pour Grenke ? (explication pour néophyte)

> Ce document explique, en français simple et avec des schémas, **pourquoi** la
> connexion entre Leazr et Grenke est passée par un « tunnel Tailscale », et
> **comment** ça marche. Aucune connaissance technique requise.

---

## 1. Les acteurs en présence

Avant tout, voici les 3 « personnages » de l'histoire :

| Personnage | C'est quoi ? | Où ça vit ? |
|---|---|---|
| **Leazr** | Ton application. La partie qui parle à Grenke est un petit programme hébergé chez **Supabase** (le « cerveau » côté serveur). | Sur les serveurs de Supabase (cloud Amazon, à Francfort). |
| **Grenke** | Le leaser. Son API permet de créer des dossiers de financement par internet. | Sur les serveurs de Grenke. |
| **Le proxy** | Un petit « traducteur/portier » qu'on a installé sur **ton VPS** (ton serveur loué chez Hostinger). | Sur ton VPS iTakecare. |

L'idée de départ, toute simple :

```
   Leazr (Supabase)  ──────►  Grenke
```

Sauf que… ça ne marche pas directement. Voyons pourquoi.

---

## 2. Premier obstacle : Grenke exige une « poignée de main » spéciale

Pour accepter une connexion, Grenke demande un **certificat client** (comme une
carte d'identité numérique) ET une façon très particulière de présenter cette
carte, appelée **« renégociation TLS »**.

Problème : la technologie qui fait tourner le programme Leazr chez Supabase
**ne sait pas faire cette poignée de main spéciale**. Ce n'est pas un bug, c'est
un choix de sécurité de leur côté.

**Analogie 🤝** : Grenke n'ouvre sa porte que si tu fais une poignée de main
secrète très précise. Leazr, lui, a la bonne carte d'identité mais ses mains
sont « bloquées » et ne peuvent pas exécuter ce geste secret.

### La solution : un intermédiaire (le proxy)

On a donc installé sur ton VPS un petit programme (nginx) capable, lui, de faire
la poignée de main secrète. Leazr lui parle simplement, et **c'est lui** qui
parle à Grenke avec la carte d'identité + le geste secret.

```
   Leazr (Supabase)  ──►  Proxy (ton VPS)  ──►  Grenke
       "parle simple"        "fait la poignée
                              de main secrète"
```

Ce proxy est protégé par un **mot de passe** (un en-tête secret) : seul Leazr le
connaît, donc personne d'autre ne peut s'en servir.

✅ Jusque-là, **tout fonctionnait**. On a même réussi à soumettre des dossiers.

---

## 3. Deuxième obstacle (le vrai sujet) : Hostinger jette les paquets

Un jour, plus rien ne passait : Leazr essayait de joindre le proxy et… **silence
total**, jusqu'au « time out » (délai dépassé).

Le plus déroutant : **depuis mon ordinateur, le proxy répondait très bien.**
Seul Leazr (Supabase) n'arrivait plus à le joindre.

### Le diagnostic (preuve à l'appui)

J'ai « écouté » le réseau directement sur ton VPS (avec un outil qui note chaque
paquet qui arrive). Verdict :

> **Les demandes de Leazr n'arrivaient même PAS jusqu'à ton VPS.**
> Elles étaient jetées *avant*, quelque part sur le réseau d'**Hostinger**.

```
   Leazr (Supabase, IP Amazon)
        │
        │  ✉️  envoie une demande
        ▼
   ┌─────────────────────────────┐
   │   Réseau / pare-feu          │
   │   d'HOSTINGER                │   ← 🚧 LE PAQUET EST JETÉ ICI
   │   (protection anti-attaque)  │      (il n'arrive jamais au VPS)
   └─────────────────────────────┘
        ✗  (rien ne passe)
        ▼
   Ton VPS  (le proxy attend… mais ne reçoit jamais rien)
```

### Pourquoi Hostinger bloquait ?

Deux raisons combinées :

1. **Leazr/Supabase change d'adresse régulièrement.** Le programme côté Supabase
   ne sort pas toujours par la même « adresse postale » internet (IP). À ce
   moment-là, il sortait par l'adresse `18.184.186.5` (un serveur Amazon à
   Francfort).
2. **Hostinger a une protection réseau automatique** (anti-DDoS) qui, par excès
   de zèle, a décidé que cette adresse était suspecte et a **mis en liste noire**
   les paquets venant de là.

**Analogie 🛡️** : ton VPS habite dans une résidence sécurisée. À l'entrée, il y
a un **vigile (Hostinger)**. Un jour, le vigile décide que le facteur qui
livre le courrier de Leazr « a une tête bizarre » et le **refoule à l'entrée**.
Résultat : ton courrier n'arrive jamais dans ta boîte aux lettres — alors que toi
(depuis ton ordi), tu rentres sans problème parce que le vigile te connaît.

### Pourquoi on ne pouvait pas « juste régler ça » ?

- ❌ On **ne contrôle pas** le vigile d'Hostinger (c'est leur réseau).
- ❌ On **ne contrôle pas** l'adresse de sortie de Supabase (elle change toute
  seule).
- ❌ **Réessayer** ne sert à rien : si le paquet est jeté à l'entrée, le renvoyer
  10 fois donne 10 échecs.

Il fallait donc **changer complètement le chemin**.

---

## 4. La solution : le tunnel Tailscale (Funnel)

Idée clé : **arrêter d'essayer d'ENTRER dans le VPS** (porte bloquée par le
vigile), et à la place **faire SORTIR le VPS pour qu'il ouvre lui-même une ligne**
que tout le monde peut appeler.

C'est exactement ce que fait **Tailscale Funnel** :

1. On installe un petit programme (`tailscale`) sur ton VPS.
2. Ce programme établit une connexion **vers l'extérieur**, depuis le VPS vers le
   réseau mondial de Tailscale. ➜ Une connexion **sortante** n'est PAS bloquée
   par le vigile (le vigile ne bloque que les **entrées**).
3. Tailscale donne alors une **adresse publique** au proxy :
   `grenke-proxy.tail334e63.ts.net`.
4. Leazr parle maintenant à **cette adresse Tailscale** (joignable par tout le
   monde, partout, de façon fiable). Tailscale fait suivre jusqu'au proxy par le
   tunnel déjà ouvert.

```
   AVANT (bloqué) :

   Leazr  ──►  🚧 Hostinger (jette le paquet)  ──✗──  Proxy (VPS)


   APRÈS (avec Tailscale) :

   Leazr ──►  🌍 Réseau Tailscale  ◄════ tunnel sortant ════  Proxy (VPS)
             (adresse publique fiable)     (ouvert par le VPS
                                            lui-même → pas bloqué)
              puis : Proxy ──► poignée de main secrète ──► Grenke
```

**Analogie ☎️** : puisque le vigile refoule les visiteurs à l'entrée, ton VPS
**décroche son téléphone et appelle un standard téléphonique public (Tailscale)**
en disant « voici mon numéro, transmettez-moi les appels ». Maintenant, quand
Leazr veut joindre ton VPS, il appelle simplement ce **standard**, qui fait
suivre l'appel par la ligne que ton VPS a lui-même ouverte. Le vigile n'a plus
rien à dire : il ne contrôle que la porte d'entrée, pas le téléphone.

### Est-ce sécurisé ? Oui.

- Le proxy garde **le même mot de passe secret** (en-tête) qu'avant : sans lui,
  toute demande est refusée (erreur « 401 non autorisé »). Quelqu'un qui tombe
  par hasard sur l'adresse Tailscale **ne peut rien faire**.
- La poignée de main secrète + le certificat Grenke restent **sur ton VPS**,
  jamais exposés.
- La connexion Tailscale est **chiffrée** de bout en bout.

---

## 5. Le chemin complet, aujourd'hui

Voici ce qui se passe, étape par étape, quand tu cliques « Soumettre à Grenke » :

```
  ┌──────────┐   1. clic "Soumettre"
  │  Toi     │ ───────────────────────────►  ┌──────────────────┐
  │ (Leazr)  │                               │  Leazr / Supabase │
  └──────────┘                               │  (le "cerveau")   │
                                             └─────────┬─────────┘
                                                       │ 2. prépare le dossier
                                                       │    (montants, équipements…)
                                                       ▼
                                          ┌────────────────────────┐
                                          │  Adresse publique       │
                                          │  Tailscale              │
                                          │ grenke-proxy.*.ts.net   │
                                          └───────────┬────────────┘
                                                      │ 3. tunnel sécurisé
                                                      ▼
                                          ┌────────────────────────┐
                                          │  Proxy (ton VPS)        │
                                          │  - vérifie le mot de    │
                                          │    passe secret         │
                                          │  - fait la poignée de   │
                                          │    main TLS spéciale    │
                                          └───────────┬────────────┘
                                                      │ 4. avec le certificat
                                                      ▼
                                          ┌────────────────────────┐
                                          │  GRENKE                 │
                                          │  crée le dossier de     │
                                          │  financement ✅          │
                                          └────────────────────────┘
```

Et le retour (numéro de demande Grenke, statut, etc.) repart par le même chemin,
dans l'autre sens.

---

## 6. À retenir en 30 secondes

- **Pourquoi un proxy ?** Parce que Grenke exige une « poignée de main » que
  Leazr ne sait pas faire ; le proxy la fait à sa place.
- **Pourquoi ça a cassé ?** Le réseau d'Hostinger jetait les paquets de Leazr
  *avant* qu'ils n'atteignent ton VPS (fausse alerte de sa protection
  anti-attaque, parce que l'adresse de Supabase change).
- **Pourquoi Tailscale ?** Parce qu'on **ne pouvait pas** réparer le réseau
  d'Hostinger ni figer l'adresse de Supabase. Tailscale contourne le problème :
  le VPS ouvre **lui-même** une ligne vers l'extérieur (connexion sortante, non
  bloquée), et Leazr passe par cette ligne fiable.
- **C'est solide ?** Oui : même mot de passe secret, certificat jamais exposé,
  tout chiffré, et ça survit aux redémarrages du VPS.

---

## 7. Entretien / bon à savoir

- Le tunnel se **relance tout seul** au redémarrage du VPS (service système
  `tailscale` + configuration enregistrée).
- Si un jour tu veux **revenir au chemin direct** (au cas où Hostinger
  débloquerait), il suffit de repointer Leazr vers `grenke-proxy.itakecare.be`
  au lieu de l'adresse `.ts.net` (une seule ligne dans le code).
- Le compte Tailscale utilisé est gratuit et ne sert qu'à ça.

---

*Document rédigé suite à la mise en place du 1ᵉʳ juin 2026. En cas de doute,
le détail technique vit dans `docs/grenke-api/INTEGRATION.md`.*
