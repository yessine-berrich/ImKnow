# ImKnow

Plateforme collaborative de partage de connaissances pour entreprises — articles, recherche sémantique, IA intégrée.

Composée d'un backend **NestJS 11** et d'un frontend **Next.js 16**, avec une suite de tests automatisés **Robot Framework**.

---

## Table des matières

1. [Architecture](#1-architecture)
2. [Outils et prérequis](#2-outils-et-prérequis)
3. [Base de données et pgvector](#3-base-de-données-et-pgvector)
4. [Ollama (IA locale)](#4-ollama-ia-locale)
5. [Backend (NestJS)](#5-backend-nestjs)
6. [Frontend (Next.js)](#6-frontend-nextjs)
7. [Tests automatisés (Robot Framework)](#7-tests-automatisés-robot-framework)
8. [Démarrage complet](#8-démarrage-complet)
9. [Scripts disponibles](#9-scripts-disponibles)

---

## 1. Architecture

```
ImKnow/
├── backend/          # API REST — NestJS 11 + TypeORM + PostgreSQL
├── frontend/         # Interface web — Next.js 16 + React 19 + Tailwind CSS
└── robot-tests/      # Tests E2E — Robot Framework 7 + Playwright
```

### Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| API REST | NestJS | 11.x |
| ORM | TypeORM | 0.3.x |
| Base de données | PostgreSQL | 14+ |
| Recherche vectorielle | pgvector | — |
| IA locale | Ollama | — |
| Interface web | Next.js | 16.x |
| UI | React | 19.x |
| Style | Tailwind CSS | 3.x |
| Tests E2E | Robot Framework + Playwright | 7.x |

### Fonctionnalités principales

- Rédaction et publication d'articles avec suggestion de tags par IA
- Recherche sémantique (embeddings pgvector + Ollama)
- Like, bookmark, partage et commentaires sur les articles
- Modération automatique des contenus
- Classement des top contributeurs et articles tendances
- Paramètres utilisateur : profil, sécurité, thème clair/sombre, langue
- Authentification par email/mot de passe et Google OAuth

---

## 2. Outils et prérequis

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

> La base de données utilise l'extension **pgvector** pour la recherche sémantique (voir section 3).

### Python (pour les tests)

Télécharger et installer **Python 3.9 ou supérieur** :
- https://www.python.org/downloads

Vérifier l'installation :
```bash
python --version   # 3.9.x ou supérieur
pip --version
```

### Ollama

Ollama est utilisé pour faire tourner les modèles d'IA en local (embedding et génération de tags).

Télécharger et installer Ollama :
- https://ollama.com/download

Vérifier l'installation :
```bash
ollama --version
```

---

## 3. Base de données et pgvector

### Créer la base de données

```sql
CREATE DATABASE pfe_db;
```

Identifiants par défaut :

| Paramètre | Valeur |
|-----------|--------|
| Host | `localhost` |
| Port | `5432` |
| Username | `postgres` |
| Password | `postgres` |
| Database | `pfe_db` |

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

Activer l'extension dans la base de données :
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

## 4. Ollama (IA locale)

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

Vérifier que les modèles sont installés :
```bash
ollama list
```

> **Note** : Sans Ollama, la recherche sémantique bascule automatiquement sur une recherche textuelle (ILIKE), et la suggestion de tags est désactivée. Le reste de l'application fonctionne normalement.

---

## 5. Backend (NestJS)

### 5.1 Variables d'environnement

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

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/users/auth/google/callback

# IA cloud (optionnel)
GEMINI_API_KEY=votre_gemini_api_key
GROQ_API_KEY=votre_groq_api_key
```

### 5.2 Dossier uploads

Créer le dossier pour les photos de profil :

```bash
# Windows
mkdir backend\uploads\avatars

# Linux / macOS
mkdir -p backend/uploads/avatars
```

### 5.3 Installation et démarrage

```bash
cd backend
npm install
npm run typeorm:run   # Appliquer les migrations
npm run start:dev     # Démarrer en mode développement
```

L'API est disponible sur : **http://localhost:3000**

---

## 6. Frontend (Next.js)

### 6.1 Variables d'environnement

Créer le fichier `frontend/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=votre_google_client_id
```

### 6.2 Installation et démarrage

```bash
cd frontend
npm install
npm run dev
```

L'application est disponible sur : **http://localhost:3001**

---

## 7. Tests automatisés (Robot Framework)

Le dossier `robot-tests/` contient une suite de **149 tests E2E** couvrant les principaux flux de l'application.

### 7.1 Installation

```bash
cd robot-tests
pip install -r requirements.txt
rfbrowser init   # Télécharge les navigateurs Playwright
```

> **Windows** — si `rfbrowser` n'est pas reconnu (installation Python en mode utilisateur) :
> ```bash
> python -m Browser.entry init
> ```

### 7.2 Configuration

Les credentials sont définis dans `robot-tests/resources/variables.resource`.

**Compte EMPLOYEE** (tests fonctionnels) :
```
${VALID_EMAIL}      testuser@imknow.com
${VALID_PASSWORD}   Test@1234
```
Le compte doit exister en base avec `status = 'actif'` et `isEmailActive = true`.

**Compte ADMIN** (tests des pages d'administration) :
```
${ADMIN_EMAIL}      admin@imknow.com
${ADMIN_PASSWORD}   Admin@1234
```
Pour créer ce compte s'il n'existe pas :
```bash
cd backend
node create-admin.js
```

> Pour surcharger les variables sans modifier le fichier :
> ```bash
> robot --variable VALID_EMAIL:me@test.com --variable VALID_PASSWORD:s3cr3t tests/
> ```

### 7.3 Lancer les tests

```bash
cd robot-tests

# Tous les tests
python -m robot --outputdir results tests/

# Tests de fumée uniquement (vérification rapide)
python -m robot --outputdir results --include smoke tests/

# Par module
python -m robot --outputdir results tests/01_authentication/
python -m robot --outputdir results tests/02_home/
python -m robot --outputdir results tests/03_search/
python -m robot --outputdir results tests/04_articles/
python -m robot --outputdir results tests/05_profile/
python -m robot --outputdir results tests/06_notifications/
python -m robot --outputdir results tests/07_profile/
python -m robot --outputdir results tests/08_bookmarks/
python -m robot --outputdir results tests/09_liked/
python -m robot --outputdir results tests/10_trending/
python -m robot --outputdir results tests/11_connections/
python -m robot --outputdir results tests/12_chat/
python -m robot --outputdir results tests/13_create_article/
python -m robot --outputdir results tests/14_admin/

# Tests admin — sécurité 403 uniquement (pas besoin du compte admin)
python -m robot --outputdir results --include security tests/14_admin/

# Mode headless (pour CI)
python -m robot --variable HEADLESS:true --outputdir results tests/
```

> **Linux / macOS** — si `robot` est dans le PATH, remplacer `python -m robot` par `robot`.

### 7.4 Couverture des tests

| Module | Fichier | Tests |
|--------|---------|-------|
| Authentification valide | `TC_AUTH_001_login_valid.robot` | 5 |
| Authentification invalide | `TC_AUTH_002_login_invalid.robot` | 7 |
| Inscription | `TC_AUTH_003_signup.robot` | 6 |
| Mot de passe oublié | `TC_AUTH_004_forgot_password.robot` | 4 |
| Page d'accueil / feed | `TC_HOME_001_feed.robot` | 7 |
| Recherche globale | `TC_SEARCH_001_global_search.robot` | 7 |
| Cartes d'articles | `TC_ARTICLE_001_article_card.robot` | 6 |
| Paramètres utilisateur | `TC_PROFILE_001_settings.robot` | 8 |
| Notifications | `TC_NOTIF_001_notifications.robot` | 6 |
| Mon profil | `TC_PROFILE_002_my_profile.robot` | 6 |
| Articles sauvegardés | `TC_BOOK_001_bookmarked.robot` | 5 |
| Articles aimés | `TC_LIKED_001_liked.robot` | 5 |
| Tendances | `TC_TREND_001_trending.robot` | 5 |
| Connexions / Relations | `TC_CONN_001_connections.robot` | 9 |
| Chat / Messagerie | `TC_CHAT_001_chat.robot` | 8 |
| Création d'article | `TC_CREATE_001_create_article_modal.robot` | 12 |
| Sécurité admin (403) | `TC_ADMIN_000_security_403.robot` | 9 |
| Admin — Tags | `TC_ADMIN_001_tags.robot` | 5 |
| Admin — Catégories | `TC_ADMIN_002_categories.robot` | 5 |
| Admin — Utilisateurs | `TC_ADMIN_003_users.robot` | 5 |
| Admin — Articles rejetés | `TC_ADMIN_004_rejected.robot` | 6 |
| Admin — Contenus signalés | `TC_ADMIN_005_reported.robot` | 6 |
| Admin — Statistiques | `TC_ADMIN_006_statistics.robot` | 7 |
| **Total** | | **149** |

### 7.5 Résultats

Les rapports HTML sont générés dans `robot-tests/results/` :
```bash
# Ouvrir le rapport après exécution
start results/report.html     # Windows
open results/report.html      # macOS
xdg-open results/report.html  # Linux
```

### 7.6 Tags disponibles

| Tag | Portée |
|-----|--------|
| `smoke` | Tests critiques uniquement (login, headings) |
| `regression` | Tests de non-régression |
| `admin` | Toutes les suites admin |
| `security` | Vérifications de redirection 403 |
| `ui` | Présence des éléments d'interface |
| `interaction` | Tests de clics et interactions |

```bash
# Exemples
python -m robot --include smoke --outputdir results tests/
python -m robot --include admin --outputdir results tests/
python -m robot --exclude regression --outputdir results tests/
```

### 7.7 Intégration CI (GitHub Actions)

```yaml
- name: Install Robot Framework
  run: pip install -r robot-tests/requirements.txt

- name: Install Playwright browsers
  run: python -m Browser.entry init

- name: Create admin account
  run: node backend/create-admin.js

- name: Run tests
  run: python -m robot --variable HEADLESS:true --outputdir robot-tests/results robot-tests/tests/

- name: Upload results
  uses: actions/upload-artifact@v4
  with:
    name: robot-results
    path: robot-tests/results/
```

---

## 8. Démarrage complet

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

L'application est accessible sur **http://localhost:3001**.

---

## 9. Scripts disponibles

### Backend

| Commande | Description |
|----------|-------------|
| `npm run start:dev` | Démarrage en mode watch (développement) |
| `npm run start:prod` | Démarrage en production (`dist/`) |
| `npm run start:debug` | Démarrage en mode debug |
| `npm run build` | Compilation TypeScript |
| `npm run format` | Formatage du code (Prettier) |
| `npm run lint` | Vérification et correction ESLint |
| `npm run typeorm:run` | Appliquer les migrations |
| `npm run typeorm:generate -- src/migrations/Nom` | Générer une migration |
| `npm run typeorm:create -- src/migrations/Nom` | Créer une migration vide |
| `npm run typeorm:show` | Voir l'état des migrations |
| `npm run test` | Tests unitaires (Jest) |
| `npm run test:watch` | Tests unitaires en mode watch |
| `npm run test:cov` | Tests unitaires avec couverture |
| `npm run test:e2e` | Tests d'intégration |

### Frontend

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrage en développement (port 3001) |
| `npm run build` | Build de production |
| `npm run start` | Démarrage en production (port 3001) |
| `npm run lint` | Vérification ESLint |
