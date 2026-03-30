
  MeloStream  
Music Streaming Web Application
Full-Stack Technical Documentation
React + Node.js + Firebase + Vercel  |  100% Free Stack
Version
1.0.0	Stack
MERN + Firebase	Cost
$0 (Free Forever)
 
1. Project Overview
MeloStream is a full-stack, cloud-based music streaming web application inspired by Spotify. It allows users to register, log in, browse, search, and stream music directly from the browser. Administrators can upload, manage, and delete songs via a dedicated dashboard. The entire application runs on free-tier cloud services — ideal as a college project or portfolio showcase.

1.1 Core Objectives
•	Stream audio files securely from cloud storage
•	Full user authentication (register / login / logout)
•	Admin panel for song management
•	Real-time song search by title or artist
•	Responsive UI that works on mobile and desktop
•	Zero hosting cost using free tiers

1.2 What Makes This Different
Unlike basic projects, MeloStream includes a real Node.js + Express backend for secure API handling, Firestore-based search, and proper role-based access — making it a production-like project.

 
2. Feature List
2.1 User Features
Feature	Description	Status
Register / Login	Email + password auth via Firebase Auth	Included
Browse Songs	View all uploaded songs on the home screen	Included
Search Songs	Real-time search by song name or artist	Included
Stream Music	Play audio directly in browser using HTML5 player	Included
Like Songs	Mark favourite songs (saved in Firestore)	Future
Playlists	Create and manage playlists	Future

2.2 Admin Features
Feature	Description	Status
Admin Login	Separate admin email check via Firebase Auth	Included
Upload Song	Upload .mp3 file with title, artist & cover art	Included
View All Songs	Paginated list with metadata	Included
Delete Song	Remove song from Storage + Firestore	Included
View Users	List all registered users from Firestore	Included
Analytics	Song play count dashboard	Future

 
3. Technology Stack (100% Free)
Layer	Technology	Purpose
Frontend	React 18 + React Router v6	SPA, routing, UI components
Styling	Tailwind CSS (CDN)	Responsive design, dark theme
Backend	Node.js + Express.js	REST API, file validation, auth middleware
Auth	Firebase Authentication	Email/password login & registration
Database	Cloud Firestore	Songs metadata, users, search index
File Storage	Firebase Storage	MP3 files & cover art images
Search	Firestore queries + FlexSearch (client)	Song/artist keyword search
Hosting (Frontend)	Vercel (Free tier)	Auto-deploy from GitHub
Hosting (Backend)	Render.com (Free tier)	Node.js REST API server
Dev Tools	VS Code, Git, GitHub, Postman	Development & testing

All services listed above have generous free tiers. Firebase Spark plan offers 1 GB Storage, 10 GB/month download, 50K reads/day. Render free tier sleeps after 15 min inactivity (first request is slow).

 
4. Complete File & Folder Structure
4.1 Frontend (React App)
music-app-frontend/
  public/
    index.html                 # Root HTML file
    favicon.ico
  src/
    index.js                   # Entry point
    App.js                     # Routes setup
    firebase.js                # Firebase init config
    
    pages/                     # Full page components
      Home.jsx                 # Song list + search bar
      Login.jsx                # User login form
      Register.jsx             # User signup form
      Player.jsx               # Full-screen player page
      Search.jsx               # Search results page
      NotFound.jsx             # 404 page
    
    admin/                     # Admin-only pages
      AdminDashboard.jsx       # Stats + nav
      UploadMusic.jsx          # Upload song form
      MusicList.jsx            # All songs + delete
      UsersList.jsx            # All registered users
    
    components/               # Reusable UI components
      Navbar.jsx               # Top navigation bar
      MusicPlayer.jsx          # Audio player bar (sticky bottom)
      SongCard.jsx             # Individual song tile
      SongList.jsx             # Grid of SongCards
      SearchBar.jsx            # Input with live search
      ProtectedRoute.jsx       # Route guard (auth check)
      AdminRoute.jsx           # Route guard (admin check)
      Loader.jsx               # Spinner component
    
    context/
      AuthContext.js           # Global auth state
      PlayerContext.js         # Global player state
    
    hooks/
      useSongs.js              # Fetch song list hook
      useSearch.js             # Search hook
    
    styles/
      index.css                # Tailwind directives
      player.css               # Custom player styles
    
  .env                         # REACT_APP_API_URL, Firebase keys
  package.json
  tailwind.config.js

4.2 Backend (Node.js + Express)
music-app-backend/
  src/
    index.js                   # Express server entry point
    config/
      firebase.js              # Firebase Admin SDK init
    
    routes/
      auth.routes.js           # POST /api/auth/verify
      songs.routes.js          # GET /api/songs, POST, DELETE
      search.routes.js         # GET /api/search?q=
      users.routes.js          # GET /api/users (admin only)
    
    controllers/
      auth.controller.js       # Verify token, set role
      songs.controller.js      # CRUD for songs
      search.controller.js     # Firestore search logic
      users.controller.js      # Fetch user list
    
    middleware/
      verifyToken.js           # Firebase ID token check
      isAdmin.js               # Role check middleware
      upload.js                # Multer file upload config
    
    utils/
      firebaseStorage.js       # Upload to Firebase Storage
      errorHandler.js          # Global error handler
  
  .env                         # FIREBASE_PROJECT_ID, etc.
  package.json

 
5. System Architecture & Design
5.1 High-Level Architecture
The application follows a 3-tier architecture:
•	Presentation Layer — React SPA (hosted on Vercel)
•	Application Layer — Node.js + Express REST API (hosted on Render)
•	Data Layer — Firebase (Auth, Firestore, Storage)

USER BROWSER
React SPA (Vercel)
Login | Home | Player | Search | Admin	BACKEND SERVER
Node.js + Express (Render)
REST API | Auth Middleware | Search | Upload
FIREBASE AUTH
Email/Password + ID Tokens	FIREBASE FIRESTORE + STORAGE
Songs DB | Users DB | MP3 Files | Cover Art

5.2 API Endpoints
Method	Endpoint	Auth	Description
GET	/api/songs	None	Fetch all songs list
GET	/api/songs/:id	User Token	Get single song by ID
POST	/api/songs	Admin Token	Upload new song + file
DELETE	/api/songs/:id	Admin Token	Delete song + file from Storage
GET	/api/search?q=	None	Search songs by name or artist
POST	/api/auth/verify	ID Token	Verify Firebase token, return user role
GET	/api/users	Admin Token	List all registered users

5.3 Data Flow Diagrams
User Plays a Song
1.	User opens the app in browser
2.	React fetches GET /api/songs from backend
3.	Backend queries Firestore songs collection
4.	Song list (with Firebase Storage URLs) returned to React
5.	User clicks play — HTML5 <audio> streams directly from Firebase Storage URL
6.	No buffering required — streaming is handled by Firebase CDN

Admin Uploads a Song
7.	Admin fills upload form (title, artist, genre, .mp3 file)
8.	React sends multipart/form-data to POST /api/songs with Bearer token
9.	Backend middleware verifies Firebase ID token + checks admin role
10.	Multer processes file in memory
11.	Backend uploads MP3 to Firebase Storage, gets public download URL
12.	Backend saves metadata + URL to Firestore songs collection
13.	Response sent back; React refreshes song list

User Searches for a Song
14.	User types in search bar (debounced 300ms)
15.	React calls GET /api/search?q=keyword
16.	Backend queries Firestore with >= and <= string range trick for partial match
17.	Matching songs returned to React
18.	Search results page renders filtered SongCards

 
6. Database Design (Firestore)
6.1 Collections
songs collection
Field	Type	Description
id	string (auto)	Firestore document ID
title	string	Song title
artist	string	Artist name
genre	string	Music genre (Pop, Rock, etc.)
duration	number	Duration in seconds
fileUrl	string	Firebase Storage public URL for MP3
coverUrl	string	Firebase Storage URL for cover image
storagePath	string	Storage path for deletion
playCount	number	Total play count (default 0)
uploadedBy	string	Admin UID who uploaded
createdAt	timestamp	Firestore server timestamp

users collection
Field	Type	Description
uid	string	Firebase Auth UID (document ID)
email	string	User email address
displayName	string	User full name
role	string	"user" or "admin"
likedSongs	array	Array of liked song IDs
createdAt	timestamp	Account creation timestamp

6.2 Firebase Storage Structure
firebase-storage/
  songs/
    {uid}-{timestamp}-{filename}.mp3
    {uid}-{timestamp}-{filename}.mp3
  covers/
    {uid}-{timestamp}-cover.jpg

6.3 Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Songs: anyone can read, only admin can write
    match /songs/{songId} {
      allow read: if true;
      allow write: if request.auth != null
                   && get(/databases/$(database)/documents/users/$(request.auth.uid))
                        .data.role == 'admin';
    }

    // Users: only owner or admin
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}

 
7. Page-by-Page Description
7.1 Login Page  (/login)
The entry point for all users. Contains an email and password form with Firebase Authentication.
•	Email + password input fields with validation
•	Error messages for wrong credentials
•	Link to Register page
•	On success: redirects to Home page; admin role redirects to Admin Dashboard
•	Protected: if already logged in, redirect to Home

7.2 Register Page  (/register)
Allows new users to create an account.
•	Name, email, password, confirm password fields
•	Creates Firebase Auth account + Firestore user document (role: 'user')
•	Validation: password match, minimum 6 characters
•	On success: auto-login and redirect to Home

7.3 Home Page  (/home)
The main landing page after login. Displays all available songs.
•	Sticky search bar at top
•	Song grid — cards showing cover art, title, artist, genre
•	Click any card to load it into the global MusicPlayer
•	Fetches songs from GET /api/songs on mount
•	Shows loading spinner while fetching

7.4 Search Page  (/search)
Dedicated page for live search results.
•	URL param based: /search?q=keyword
•	Calls GET /api/search?q= with debouncing
•	Shows matching SongCards in a responsive grid
•	Empty state message if no results
•	Accessible from Navbar search bar

7.5 Player Page  (/player/:id)
Full-screen player view for a specific song (optional deep-link).
•	Large cover art display
•	Song title, artist, genre metadata
•	HTML5 audio controls: play/pause, seek bar, volume, duration
•	Previous / Next song navigation
•	Like button (persists to Firestore liked array)

7.6 MusicPlayer Component (Global Sticky Bar)
Always-visible bottom music player bar present on all pages after a song is selected.
•	Mini cover art thumbnail
•	Song title + artist name
•	Play / Pause / Next / Previous controls
•	Progress bar with seek functionality
•	Volume slider
•	Managed via PlayerContext (React Context API)

7.7 Admin Dashboard  (/admin)
Protected admin-only landing page. Only accessible if user role === 'admin'.
•	Stat cards: Total Songs, Total Users, Total Storage Used
•	Navigation links to all admin sub-pages
•	Recent activity feed (latest uploads)

7.8 Upload Music Page  (/admin/upload)
Admin form for uploading new songs.
•	Fields: Song Title, Artist, Genre, Cover Image, MP3 File
•	File type validation (.mp3 only, max 10 MB)
•	Progress bar during upload
•	Calls POST /api/songs with multipart form + admin Bearer token
•	Success/error toast notifications

7.9 Manage Songs Page  (/admin/songs)
Lists all songs with management options.
•	Table view: Cover | Title | Artist | Genre | Duration | Actions
•	Delete button: removes from Firestore + Firebase Storage
•	Pagination (10 songs per page)
•	Confirmation modal before deletion

7.10 Users List Page  (/admin/users)
Lists all registered users.
•	Table: Name | Email | Role | Joined Date
•	Fetched via GET /api/users (admin token required)
•	Search/filter users by email

 
8. Search Feature — Technical Deep Dive
8.1 How Search Works
Firestore does not support native full-text search. MeloStream uses two complementary approaches:

Approach A — Firestore Range Query (Backend)
For prefix-based search, the backend uses a string range trick:
// songs.controller.js
const q = query(
  collection(db, 'songs'),
  where('title', '>=', searchTerm),
  where('title', '<=', searchTerm + '\uf8ff'),
  limit(20)
);

This finds all documents where the title starts with the search term. The \uf8ff character is the last Unicode character, creating an upper bound for prefix matching.

Approach B — FlexSearch (Client-Side)
On page load, all song titles and artists are indexed client-side using FlexSearch (a fast JavaScript full-text search library). This enables instant fuzzy search without additional API calls.
// useSearch.js hook
import FlexSearch from 'flexsearch';
const index = new FlexSearch.Document({
  document: { id: 'id', index: ['title', 'artist'] }
});
songs.forEach(song => index.add(song));
const results = index.search(query, { limit: 10 });

8.2 Search Flow
19.	User types in SearchBar (300ms debounce)
20.	If query length >= 2 characters, useSearch hook triggers
21.	FlexSearch index searched first (instant, local)
22.	Simultaneously, GET /api/search?q= called for server validation
23.	Results merged, deduplicated and rendered

 
9. Step-by-Step Development Guide
Phase 1 — Project Setup (Day 1–2)
24.	Install Node.js (v18+), VS Code, Git
25.	Create GitHub repo: music-app
26.	Create two folders: music-app-frontend and music-app-backend
27.	Initialize React: npx create-react-app music-app-frontend
28.	Initialize backend: mkdir music-app-backend && cd music-app-backend && npm init -y
29.	Install backend packages:

npm install express cors dotenv firebase-admin multer
npm install --save-dev nodemon

30.	Install frontend packages:
npm install react-router-dom firebase axios flexsearch
npm install -D tailwindcss && npx tailwindcss init

Phase 2 — Firebase Setup (Day 2)
31.	Go to console.firebase.google.com → Create project (MeloStream)
32.	Enable Email/Password Authentication
33.	Create Firestore database (Start in test mode)
34.	Create Firebase Storage bucket
35.	Go to Project Settings → Generate Web App config → Copy to frontend .env
36.	Generate Service Account key → Download JSON → Use in backend .env
37.	Create songs and users collections in Firestore (manually add first test doc)

Phase 3 — Backend Development (Day 3–5)
38.	Create src/index.js — setup Express server with CORS and JSON middleware
39.	Create src/config/firebase.js — initialize Firebase Admin SDK
40.	Build middleware: verifyToken.js (check Authorization header)
41.	Build middleware: isAdmin.js (check Firestore user role)
42.	Build songs.routes.js and songs.controller.js (GET all, POST, DELETE)
43.	Build search.routes.js and search.controller.js (Firestore range query)
44.	Build users.routes.js (admin only)
45.	Test all endpoints using Postman

Phase 4 — Frontend Development (Day 6–10)
46.	Setup React Router in App.js with all routes
47.	Create AuthContext.js — wrap app with Firebase auth state listener
48.	Build Login.jsx and Register.jsx pages
49.	Build ProtectedRoute.jsx and AdminRoute.jsx guards
50.	Build Home.jsx — fetch songs from API and render SongList
51.	Build SongCard.jsx component
52.	Build MusicPlayer.jsx — HTML5 audio with PlayerContext
53.	Build SearchBar.jsx with debouncing + Search.jsx page
54.	Build all Admin pages: Dashboard, Upload, MusicList, UsersList

Phase 5 — Integration & Testing (Day 11–12)
55.	Connect frontend API calls to backend using axios (base URL from .env)
56.	Test full upload flow: Admin login → Upload song → Verify in Firestore
57.	Test playback: User login → Home page → Click song → Player plays
58.	Test search: Type in search bar → Results appear in < 300ms
59.	Test auth guards: Try accessing /admin without admin role
60.	Check browser console for errors; fix CORS issues if any

Phase 6 — Deployment (Day 13–14)
61.	Push both repos to GitHub
62.	Deploy Frontend to Vercel: vercel.com → Import GitHub repo → Set env vars
63.	Deploy Backend to Render: render.com → New Web Service → Connect GitHub
64.	Update frontend .env REACT_APP_API_URL to Render backend URL
65.	Update Firebase Auth authorized domains to include Vercel domain
66.	Apply Firestore Security Rules (from Section 6.3)
67.	Test live deployed app end-to-end

 
10. Environment Variables
10.1 Frontend (.env)
REACT_APP_API_URL=http://localhost:5000
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_ADMIN_EMAIL=admin@yourdomain.com

10.2 Backend (.env)
PORT=5000
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
ADMIN_EMAILS=admin@yourdomain.com

Never commit .env files to GitHub. Add .env to .gitignore immediately.

 
11. Limitations & Future Improvements
11.1 Free Tier Limitations
Service	Limitation	Workaround
Firebase Storage	5 GB free	Compress MP3s before upload
Firestore	50K reads/day	Cache responses in React state
Render (backend)	Sleeps after 15 min	Use keepalive ping (UptimeRobot)
Firestore Search	No full-text native	Use FlexSearch client-side

11.2 Future Improvements
•	Playlist creation and management
•	Song recommendations based on genre/history
•	Admin analytics dashboard with play count charts
•	PWA (Progressive Web App) for offline support
•	Social features: follow users, share songs
•	Advanced search with Algolia (free tier available)
•	Mobile app with React Native using same Firebase backend

 
12. Quick Start Commands
12.1 Run Locally
# Clone the repo
git clone https://github.com/yourusername/music-app.git

# Backend
cd music-app-backend
npm install
npm run dev          # starts on http://localhost:5000

# Frontend (new terminal)
cd music-app-frontend
npm install
npm start            # starts on http://localhost:3000

12.2 Deploy
# Frontend → Vercel
npx vercel --prod

# Backend → push to GitHub → connect on render.com

 
  Project Summary  
MeloStream is a complete, production-like music streaming application.
Built with React + Node.js + Firebase. Deployed on Vercel + Render. Cost: $0.
10 Pages
Fully designed UI	7 API Endpoints
Secure REST backend	14 Day Build
Step-by-step guide

