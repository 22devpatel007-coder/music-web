# MeloStream - Full Stack Music Streaming Web App

MeloStream is a full-stack music streaming platform with user authentication, song search, cloud-hosted audio, and an admin dashboard for upload and management.

This repository contains:
- `client/` - React frontend
- `server/` - Node.js + Express backend

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Run the App](#run-the-app)
- [Admin Setup](#admin-setup)
- [Search Index Migration](#search-index-migration)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Features

### User Features
- Email/password authentication with Firebase Auth
- Google sign-in support
- Browse all songs
- Play songs in browser with global music player
- Search by title or artist
- Like songs and view liked songs page

### Admin Features
- Protected admin routes
- Upload song + cover image
- Delete songs
- View all users
- Role checks using Firebase custom claims, env fallback, and Firestore fallback

### Security and Reliability
- Helmet security headers
- CORS allowlist via environment variable
- Global and auth-specific rate limiting
- Token verification middleware with clear error codes
- Token refresh and retry logic in frontend Axios client

## Tech Stack

### Frontend (`client/`)
- React 18
- React Router v6
- Firebase Web SDK (Auth + Firestore)
- Axios
- Tailwind CSS (configured)

### Backend (`server/`)
- Node.js + Express
- Firebase Admin SDK (Auth + Firestore)
- Cloudinary (audio/image storage)
- Multer (multipart upload)
- Helmet, CORS, express-rate-limit

## Architecture

1. User authenticates with Firebase Auth.
2. Frontend sends Firebase ID token as Bearer token to backend.
3. Backend verifies token using Firebase Admin SDK.
4. Public content is served via REST APIs.
5. Admin uploads audio/image files through backend.
6. Backend stores media in Cloudinary and song metadata in Firestore.
7. Search queries use lowercase indexed fields (`titleLower`, `artistLower`) in Firestore.

## Project Structure

```text
music-web/
	client/
		src/
			admin/
			components/
			context/
			hooks/
			pages/
			styles/
			utils/
	server/
		scripts/
			setAdminClaim.js
			migrateSearchFields.js
		src/
			config/
			controllers/
			middleware/
			routes/
			utils/
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Firebase project
- Cloudinary account

### 1) Install dependencies

From repository root:

```bash
cd client
npm install

cd ../server
npm install
```

## Environment Variables

Create these files:
- `client/.env`
- `server/.env`

### `client/.env`

```env
REACT_APP_API_URL=http://localhost:5000

REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### `server/.env`

```env
PORT=5000

# Allow one or multiple origins (comma-separated)
CORS_ORIGIN=http://localhost:3000

# Firebase Admin SDK service account values
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Admin bootstrap (single email or comma-separated list)
ADMIN_EMAILS=admin@example.com
```

Notes:
- Keep the `FIREBASE_PRIVATE_KEY` wrapped in quotes and preserve `\n`.
- `CORS_ORIGIN` supports multiple origins separated by commas.

## Run the App

Open two terminals.

### Terminal 1 - Backend

```bash
cd server
npm run dev
```

Backend runs on `http://localhost:5000` by default.

### Terminal 2 - Frontend

```bash
cd client
npm start
```

Frontend runs on `http://localhost:3000`.

## Admin Setup

1. Create/sign in as the target admin user at least once.
2. Set `ADMIN_EMAILS` in `server/.env`.
3. Run the admin-claim script:

```bash
cd server
node scripts/setAdminClaim.js
```

4. Sign out and sign in again to refresh token claims.

## Search Index Migration

If old songs were created before lowercase fields existed, run migration:

```bash
cd server/scripts
node migrateSearchFields.js
```

This adds/updates:
- `titleLower`
- `artistLower`

## API Reference

Base URL: `http://localhost:5000`

### Health
- `GET /health` - Server status

### Auth
- `POST /api/auth/verify` - Verify current user token and return user doc

### Songs
- `GET /api/songs` - List all songs (public)
- `GET /api/songs/:id` - Get single song (public)
- `POST /api/songs` - Upload song + cover (admin)
- `DELETE /api/songs/:id` - Delete song (admin)

`POST /api/songs` expects `multipart/form-data`:
- `song` (audio file)
- `cover` (image file)
- `title` (string)
- `artist` (string)
- `genre` (string)
- `duration` (number)

### Search
- `GET /api/search?q=term` - Search by title/artist using lowercase indexed fields

### Users
- `GET /api/users` - List users (admin)

## Deployment

### Frontend (Vercel)
- Set project root to `client`
- Add all `client/.env` variables to Vercel project settings
- Set `REACT_APP_API_URL` to deployed backend URL

### Backend (Render or similar)
- Set project root to `server`
- Start command: `npm start`
- Add all `server/.env` variables in host environment settings
- Set `CORS_ORIGIN` to your deployed frontend URL

## Troubleshooting

### Infinite loading screen on auth
- Confirm all `REACT_APP_FIREBASE_*` variables are present and valid.
- Ensure your Firebase web app config is from the correct project.

### 401 Unauthorized on protected endpoints
- Confirm user is signed in.
- Confirm frontend is sending `Authorization: Bearer <token>`.
- Sign out/sign in again after changing admin claims.

### Admin access denied
- Verify `ADMIN_EMAILS` includes the exact account email.
- Run `node scripts/setAdminClaim.js` and re-login.
- Confirm user role in Firestore if using fallback checks.

### CORS errors
- Ensure backend `CORS_ORIGIN` includes exact frontend origin (`http://localhost:3000` in local dev).
- For multiple origins, use comma-separated values.

### Upload failures
- Verify Cloudinary credentials.
- Ensure request sends both `song` and `cover` fields.
- Audio and image MIME types are validated by backend middleware.

## Available Scripts

### Client
- `npm start` - Run development server
- `npm run build` - Create production build
- `npm test` - Run tests

### Server
- `npm run dev` - Run with nodemon
- `npm start` - Run with node

## Current Status

Core user and admin flows are implemented and working with Firebase + Cloudinary integration.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Open a pull request