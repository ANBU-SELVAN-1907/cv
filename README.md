# 🚀 YOLO Smart Student Verification System

Production-grade student identity verification system built for the YOLO Event.

## 🛠 Features
- **Biometric Face Mapping**: Detect and generate unique face embeddings (client-side).
- **OCR ID Scanning**: Automatically extract student details from ID cards.
- **Offline-First PWA**: Works during network failures; auto-syncs when online.
- **Duplicate Prevention**: Vector-based similarity checks via Supabase pgvector.
- **Admin Dashboard**: Real-time stats, student lookups, and CSV exports.

## 🚀 Getting Started

### 1. Database Setup (Supabase)
- Go to [Supabase](https://supabase.com) and create a project.
- Run the SQL in `supabase/schema.sql` in the SQL Editor.
- Enable `pgvector` extension (included in the script).

### 2. Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Face Models
The `face-api.js` models are already downloaded and stored in `public/models/`. No further action is required for model setup.

### 4. Install & Run
```bash
npm install
npm run dev
```

## 🏗 Technology Stack
- **Next.js 14** (App Router)
- **Supabase** (Postgres + pgvector)
- **FaceAPI.js** (Biometrics)
- **Tesseract.js** (OCR)
- **Framer Motion** (Premium UI)
- **IndexedDB** (Offline Storage)
- **Next-PWA** (Service Worker)

## 📁 Project Structure
- `src/app/register`: Registration page with camera capture.
- `src/app/dashboard`: Admin dashboard with stats and student list.
- `src/lib/offlineStorage.ts`: IndexedDB logic for offline mode.
- `src/lib/FaceRecognition.ts`: Face detection and embedding generation.
- `src/lib/OCRProcessor.ts`: OCR logic using Tesseract.js.
- `public/models`: Pre-downloaded AI model weights.
