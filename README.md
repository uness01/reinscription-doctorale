# Gestion de Réinscription Doctorale

Plateforme web de gestion des réinscriptions doctorales du Centre des Études Doctorales de l'Université Ibn Tofail — Kénitra.

## Présentation

Ce projet numérise et centralise le processus annuel de réinscription des doctorants, qui était auparavant géré manuellement via des fiches Word imprimées et signées physiquement.

La plateforme couvre l'intégralité du circuit de validation numérique, de la soumission du dossier par le doctorant jusqu'à la génération automatique de l'attestation d'inscription.

## Fonctionnalités principales

- Soumission de dossiers de réinscription en 6 étapes guidées
- Circuit de validation multi-niveaux avec signatures électroniques
- Génération automatique d'attestations d'inscription en PDF
- Tableaux de bord distincts par rôle
- Statistiques et tableaux de bord administratifs
- Gestion complète des utilisateurs
- Interface responsive (mobile, tablette, desktop)

## Acteurs du système

| Rôle | Responsabilités |
|------|----------------|
| **Doctorant** | Soumettre sa réinscription, suivre l'état de son dossier, télécharger son attestation |
| **Encadrant** | Valider ou refuser les dossiers de ses doctorants, signer électroniquement |
| **Administration** | Gérer l'ensemble des dossiers, valider administrativement, produire des statistiques |
| **Directeur de laboratoire** | Signer les dossiers de son laboratoire, consulter les statistiques du labo |
| **Doyen** | Effectuer la validation définitive finale, signer électroniquement |

## Circuit de validation

```
Doctorant → Encadrant → Administration → Directeur du Labo → Doyen → Attestation
```

## Stack technique

- **Framework** : Next.js 15 (App Router, Server Actions)
- **Base de données** : PostgreSQL via Prisma ORM
- **Authentification** : Supabase Auth
- **Génération PDF** : @react-pdf/renderer
- **Stockage fichiers** : Supabase Storage
- **Déploiement** : Vercel

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/uness01/reinscription-doctorale.git
cd reinscription-doctorale

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les variables dans .env.local

# Initialiser la base de données
npx prisma migrate deploy
npx prisma db seed

# Lancer le serveur de développement
npm run dev
```

## Variables d'environnement requises

```env
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
```

## Structure du projet

```
src/
├── app/
│   ├── dashboard/
│   │   ├── doctorant/      # Espace doctorant
│   │   ├── encadrant/      # Espace encadrant
│   │   ├── admin/          # Espace administration
│   │   ├── directeur/      # Espace directeur de labo
│   │   └── doyen/          # Espace doyen
│   └── login/              # Authentification
├── lib/
│   ├── prisma.ts           # Client Prisma
│   ├── auth.ts             # Gestion de session
│   └── pdf/                # Génération attestations PDF
prisma/
├── schema.prisma           # Schéma de la base de données
└── seed.ts                 # Données de test
```

## Réalisé dans le cadre d'un stage

Centre des Études Doctorales — Université Ibn Tofail, Kénitra
