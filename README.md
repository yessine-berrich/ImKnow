# PfeProject

Application full-stack composée d'un backend NestJS et d'un frontend Next.js.

---

## Table des matières

1. [Outils et prérequis](#1-outils-et-prérequis)
2. [Base de données et pgvector](#2-base-de-données-et-pgvector)
3. [Ollama (IA locale)](#3-ollama-ia-locale)
4. [Backend (NestJS)](#4-backend-nestjs)
5. [Frontend (Next.js)](#5-frontend-nextjs)
6. [Démarrage complet](#6-démarrage-complet)
7. [Scripts disponibles](#7-scripts-disponibles)

---

## 1. Outils et prérequis

### Node.js

Télécharger et installer **Node.js 18.x ou supérieur** :
- https://nodejs.org/en/download

Vérifier l'installation :
```bash
node --version   # v18.x.x ou supérieur
npm --version    # 9.x.x ou supérieur
```

### PostgreSQL

Télécharger et installer **PostgreSQL 14.x ou supérieur** :
- https://www.postgresql.org/download

> La base de données utilise également l'extension **pgvector** (voir section 2).

### Ollama

Ollama est utilisé pour faire tourner les modèles d'IA en local (embedding et génération de tags).

Télécharger et installer Ollama :
- https://ollama.com/download

Vérifier l'installation :
```bash
ollama --version
```

---

## 2. Base de données et pgvector

### Créer la base de données

```sql
CREATE DATABASE pfe_db;
```

Identifiants par défaut :
- **Host** : `localhost`
- **Port** : `5432`
- **Username** : `postgres`
- **Password** : `postgres`
- **Database** : `pfe_db`

### Installer l'extension pgvector

pgvector est requis pour la recherche sémantique et les recommandations d'articles.

**Windows** — télécharger le binaire pgvector compatible avec votre version de PostgreSQL :
- https://github.com/pgvector/pgvector/releases

Suivre les instructions d'installation du README de pgvector.

**Linux / macOS** :
```bash
# Ubuntu / Debian
sudo apt install postgresql-16-pgvector

# macOS (Homebrew)
brew install pgvector
```

Ensuite, activer l'extension dans la base de données (ou via la migration fournie) :
```sql
\c pfe_db
CREATE EXTENSION IF NOT EXISTS vector;
```

### Appliquer les migrations TypeORM

```bash
cd backend
npm run typeorm:run
```

La migration `AddPgVectorColumn` crée automatiquement :
- L'extension `vector`
- La colonne `embedding_vector_pg` de dimension 768
- Un index HNSW pour la recherche par similarité cosinus

---

## 3. Ollama (IA locale)

Le projet utilise deux modèles Ollama :

| Modèle | Usage |
|--------|-------|
| `nomic-embed-text` | Génération d'embeddings (dimension 768) pour la recherche sémantique |
| `llama3.2:3b` | Suggestion automatique de tags pour les articles |

### Démarrer Ollama

```bash
ollama serve
```

Ollama tourne sur **http://localhost:11434** par défaut.

### Télécharger les modèles

```bash
# Modèle d'embedding (requis pour la recherche sémantique)
ollama pull nomic-embed-text

# Modèle de génération de tags (requis pour la suggestion de tags)
ollama pull llama3.2:3b
```

Vérifier que les modèles sont bien installés :
```bash
ollama list
```

> **Note** : Sans Ollama, la recherche sémantique et la suggestion de tags seront désactivées — le reste de l'application fonctionnera normalement.

---

## 4. Backend (NestJS)

### 4.1 Variables d'environnement

Créer le fichier `backend/.env` :

```env
# Serveur
PORT=3000
DOMAIN=http://localhost:3000
CLIENT_DOMAIN=http://localhost:3001
FRONTEND_URL=http://localhost:3001

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=pfe_db

# JWT
JWT_SECRET=votre_secret_jwt_ici

# Email (Gmail — utiliser un mot de passe d'application)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application

# Google OAuth
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/users/auth/google/callback

# IA cloud (optionnel)
GEMINI_API_KEY=votre_gemini_api_key
GROQ_API_KEY=votre_groq_api_key
```

### 4.2 Dossier uploads

Créer le dossier pour les avatars utilisateurs :

```bash
# Windows
mkdir backend\uploads\avatars

# Linux / macOS
mkdir -p backend/uploads/avatars
```

### 4.3 Installation et démarrage

```bash
cd backend
npm install
npm run start:dev
```

L'API est disponible sur : **http://localhost:3000**

---

## 5. Frontend (Next.js)

### 5.1 Variables d'environnement

Créer le fichier `frontend/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=votre_google_client_id
```

### 5.2 Installation et démarrage

```bash
cd frontend
npm install
npm run dev
```

L'application est disponible sur : **http://localhost:3001**

---

## 6. Démarrage complet

Lancer dans cet ordre :

**1. Démarrer Ollama** (terminal 1) :
```bash
ollama serve
```

**2. Démarrer le backend** (terminal 2) :
```bash
cd backend && npm run start:dev
```

**3. Démarrer le frontend** (terminal 3) :
```bash
cd frontend && npm run dev
```

---

## 7. Scripts disponibles

### Backend

| Commande | Description |
|----------|-------------|
| `npm run start:dev` | Démarrage en mode watch (développement) |
| `npm run start:prod` | Démarrage en production (`dist/`) |
| `npm run build` | Compilation TypeScript |
| `npm run typeorm:run` | Appliquer les migrations |
| `npm run typeorm:generate -- src/migrations/Nom` | Générer une migration |
| `npm run typeorm:show` | Voir l'état des migrations |
| `npm run test` | Lancer les tests unitaires |

### Frontend

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrage en développement (port 3001) |
| `npm run build` | Build de production |
| `npm run start` | Démarrage en production (port 3001) |
| `npm run lint` | Vérification ESLint |
