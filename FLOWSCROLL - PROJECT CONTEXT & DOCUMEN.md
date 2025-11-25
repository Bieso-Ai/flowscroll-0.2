# FLOWSCROLL - PROJECT CONTEXT & DOCUMENTATION

## 1. Project Overview
**Name:** FlowScroll
**Concept:** "TikTok for the Brain". An infinite, adaptive scroll feed of cognitive mini-games designed to keep users in the flow state.
**Target Audience:** People who doom-scroll but want to be productive.
**Tech Stack:** React (Vite), TypeScript, TailwindCSS.
**Hosting:** Netlify (PWA Support).
**Backend:** Netlify Serverless Functions (TypeScript).
**Database:** Supabase (PostgreSQL).
**AI Engine:** Google Gemini 2.5 Flash (via Proxy).

## 2. Project History & Development Decisions

### Phase 1: The Core Loop (Local MVP)
*   **Goal:** Create a frictionless, infinite feed of tasks.
*   **Challenge:** How to make it feel like TikTok?
*   **Solution:** CSS Scroll Snap (`snap-y snap-mandatory`) was the key. It forces one task per screen.
*   **Decision:** We chose *Client-Side Generation* for Math/Music/Reaction tasks. Why? Zero latency. Waiting for a server between swipes kills the flow state.

### Phase 2: The "Sweat Spot" Algorithm
*   **Goal:** Keep users in the flow (not too hard, not too boring).
*   **Challenge:** Hardcoding levels (1-10) felt artificial.
*   **Solution:** Implemented "Infinite Scaling" using logarithmic math.
    *   *Math:* Digits = `1 + floor(log(level))`.
    *   *Reaction:* Time = `1000ms * 0.9^level`.
    *   *Music:* Sequence Length = `3 + level/2`.
*   **Calibration:** We added a "Boost Multiplier" (2.5x) for the first 5 tasks. This fixes the "Boredom Problem" where skilled users had to grind through easy levels.

### Phase 3: The Content Expansion (AI & Audio)
*   **Language Tasks:** We needed infinite variety.
    *   *Challenge:* AI API latency and cost.
    *   *Solution:* A Hybrid Approach. Try the API first via Backend Proxy. If it fails (or offline), fallback to a massive local list of 1000+ generated combinations (`COMMON_NOUNS`).
*   **Music Tasks:** Woodblock sounds were boring.
    *   *Solution:* Built a `Web Audio API` synthesizer from scratch (Kick, Snare, HiHat, Tom). No MP3 assets needed (keeps app light). Added a procedural Step Sequencer logic to generate unique beats every time.

### Phase 4: Security & Analytics (The "Real App" Upgrade)
*   **Security:** Initially, the API Key was in the frontend.
    *   *Risk:* User theft.
    *   *Fix:* Moved logic to `netlify/functions/generate-task.mts`. The frontend now calls this proxy.
*   **Data:** We needed to know if people actually play.
    *   *Solution:* Implemented `sessionId` tracking and deep analytics (Success Rates, Skip Rates).
    *   *Tech:* Supabase via REST API (fetch) instead of the heavy JS client library to save bundle size.

## 3. Task Mechanics (The Games)

### A. Math (Logic)
*   **Standard:** Addition, Subtraction, Multiplication.
    *   *Input:* Custom Glass Numpad (prevents native keyboard popup).
*   **Math Stream:** "Mental Endurance". Numbers appear sequentially (`+5`, `-2`, `x3`). User enters the final sum.
    *   *Scaling:* Speed increases (3000ms -> 400ms).

### B. Language (Verbal)
*   **Synonym:** Find a word with same meaning.
*   **Rhyme:** Find a word that rhymes.
*   **Sentence:** Combine two unrelated words into a sentence.
    *   *Tech:* Uses Gemini AI to generate creative words, or a massive local fallback list (`COMMON_NOUNS`) if offline.
    *   *Help:* "Show Solution" button appears after failure.

### C. Reaction (Speed & Attention)
*   **Color:** Tap screen when it turns green. Measures ms.
*   **Odd One Out:** Grid of items. Find the one that is different.
    *   *Modes:* Emoji (Semantic), Rotation (Spatial). *Color mode removed due to difficulty issues.*

### D. Music (Auditory)
*   **Rhythm:** Listen to a beat (Kick/Snare pattern), then tap it back.
    *   *Tech:* Procedural Step Sequencer generates unique beats every time.
*   **Memory (Simon Says):** Memorize a sequence of tones/colors.

### E. Free Mind (Rest)
*   **Breathe:** Visual breathing guide (4s In, 4s Out). Appears rarely to reset stress.

## 4. The Algorithm (`services/taskEngine.ts`)

### "Sweet Spot" Leveling
The difficulty adapts after **every** task based on performance:
*   **Too Easy (< 5s):** Level +0.5 (Boost).
*   **Flow State (5s - 15s):** Level +0.2.
*   **Struggle (> 15s):** Level +0.05.
*   **Fail / Skip:** Level -0.3.
*   **Calibration Phase:** First 5 tasks per category have a **2.5x boost multiplier** to quickly find the user's real skill level.

### Engagement Logic
*   The engine tracks `wasSkipped`.
*   If a category (e.g., Math) is skipped often, its probability in the feed drops.
*   If a category is played often, its probability rises.

## 5. Architecture & Data Flow

### Frontend (Client-Side)
*   **Entry:** `index.tsx` -> `App.tsx`
*   **State:** `UserStats` object stored in `localStorage`. Contains `userId`, `levels` per category, and `history`.
*   **Components:**
    *   `Feed.tsx`: The infinite scroll engine. Manages the buffer of 5 pre-generated tasks.
    *   `TaskCard.tsx`: The wrapper for visual tasks. Handles the "Swipe" logic.
    *   `Analytics.tsx`: Profile page with charts (Recharts) and Data Export.

### Backend (Serverless)
*   **Path:** `/netlify/functions/`
*   **`generate-task.mts`:**
    *   **Role:** Secure Proxy for Google Gemini API.
    *   **Input:** `{ type: 'LANG_SYNONYM', difficulty: 5 }`
    *   **Security:** Hides `API_KEY` from the client. Validates input difficulty (1-20). Caps tokens at 300.
*   **`record-task.mts`:**
    *   **Role:** Analytics Ingest.
    *   **Input:** `TaskResult` JSON.
    *   **Action:** Logs to Netlify Console AND inserts into Supabase `task_history` table.

### Database (Supabase)
*   **Table:** `task_history`
*   **Columns:** `user_id`, `task_type`, `success` (bool), `difficulty_level`, `time_spent_ms`, `session_id`.
*   **Security:** Row Level Security (RLS) enabled. Anon Policy allows `INSERT`.

## 6. Environment Variables (Netlify)
*   `API_KEY`: Google Gemini API Key (starts with `AIza...`).
*   `SUPABASE_URL`: Database URL.
*   `SUPABASE_KEY`: Public Anon Key.

## 7. Deployment
*   **Build Command:** `npm run build`
*   **Publish Dir:** `dist`
*   **Platform:** Netlify (Automatic deploys from GitHub).


Version 2:
# FLOWSCROLL - PROJECT CONTEXT & DOCUMENTATION (V2 UPDATE)

## 1. Project Overview
**Name:** FlowScroll
**Concept:** "TikTok for the Brain". An infinite, adaptive scroll feed of cognitive mini-games designed to keep users in the flow state.
**Target Audience:** People who doom-scroll but want to be productive.
**Tech Stack:** React (Vite), TypeScript, TailwindCSS.
**Hosting:** Netlify (PWA Support).
**Backend:** Netlify Serverless Functions (TypeScript).
**Database:** Supabase (PostgreSQL).
**AI Strategy:** Hybrid. Language tasks use a local "Generative Categorization Engine" (Zero Latency).

---

## 2. The V2 "Flow Engine" (Math V6 Algorithm)
The core of V2 is a complete rewrite of the difficulty algorithm, moving from an opaque ELO system to a transparent, trend-based **"Flow Zone" model**.

### A. The "Flow Zone" Logic
The algorithm aims to keep the user in a specific performance window:
*   **Flow Zone:** **10s - 20s** per task with decent accuracy (>75%).
*   **Too Easy:** **< 10s** (User is bored/too skilled).
*   **Too Hard:** **> 20s** or **Accuracy < 50%** (User is struggling).

### B. Trend-Based Adaptation
Instead of reacting to every single task (volatility), the system tracks a **Trend Score** over a window of recent tasks (Window size: 8).
*   `TOO_EASY` event = **+1 Score**.
*   `TOO_HARD` event = **-1 Score**.
*   **Level Up:** Net Score reaches **+3**.
*   **Level Down:** Net Score reaches **-3**.
*   **Benefit:** Eliminates "Yo-Yo Leveling" caused by single outliers or lucky guesses.

### C. Phased Calibration
1.  **Early Phase (< 30 tasks):**
    *   Window Size: 5 tasks (Fast reaction).
    *   Action: Checks *every* task.
    *   Boost: Allows double jumps (+2 Levels) for extreme performance (<7s).
2.  **Late Phase (> 30 tasks):**
    *   Window Size: 8 tasks (Stable).
    *   Action: Checks every 8 tasks (Symmetric Gating).
    *   Action: Conservative (+/- 1 Level).

### D. Content Generation (Strict "Total Digit" Rule)
Math difficulty is no longer abstract. It is strictly defined by **Total Digits**.
*   **Level 1:** 2 Digits (e.g., `4 + 5`).
*   **Level 2:** 3 Digits (e.g., `12 + 5`).
*   **Level 5:** 6 Digits (e.g., `123 + 456`).
*   **Constraints:**
    *   **Subtraction:** Always `A >= B`. No negative results.
    *   **Multiplication:** Uses a Lookup Table (Lvl 4 = 2x2 digits) instead of random splitting to ensure consistent difficulty.

---

## 3. New Game Modes (V2)

### A. Math Sequence (Pattern Recognition)
*   **Goal:** Complete the number series.
*   **Mechanics:**
    *   Displays 4 numbers and a `?`.
    *   Patterns: Linear (`+2`), Progressive (`+1, +2, +3`), Geometric (`x2`), Fibonacci.
    *   Input: 4 Multiple Choice Options.
    *   *Why:* Trains logical induction without the stress of calculation.

### B. Reaction Stream (Focus & Go/No-Go)
*   **Goal:** Tap ONLY the target emoji. Ignore distractors.
*   **Mechanics:**
    *   Emojis pop up one by one at random positions.
    *   User must inhibit the urge to tap unless it matches the target.
    *   **Tech:** Uses `setTimeout` loop, inline styles for visibility, and hardware-accelerated CSS transforms (`translate3d`) for particles to prevent jitter during swipes.
    *   *Fixes:* Implemented 200ms Debounce to prevent double-tap bugs.

### C. Reaction Color Switch (Inhibition Control)
*   **Goal:** Tap when the button turns GREEN.
*   **Mechanics:**
    *   Button cycles through random colors (Red -> Blue -> Yellow).
    *   User waits (Inhibition).
    *   Button turns Green -> User taps (Reaction).
    *   *Fixes:* Added "Countdown Phase" (3..2..1) to prevent Ghost Touches on the Start button. Events are bound to the button only, not the screen (prevents accidental swipes).

### D. Language Connect (Synonym/Antonym)
*   **Goal:** Find the matching word.
*   **Mechanics:**
    *   "Wähle das Gegenteil von GUT".
    *   Options: "Schlecht", "Böse", "Mies".
    *   **Tech:** Powered by a massive local dictionary (300+ words) in `geminiService.ts`. No API calls needed. Zero latency.

---

## 4. Technical Architecture & Database V2

### A. Database Schema (`task_history_v2`)
We migrated to a clean new table to support deep analytics.
*   `difficulty_level`: The numeric level played.
*   `outcome`: 'success', 'failed', 'skipped'.
*   `time_spent_ms`: Precise duration.
*   **NEW - Algo Tracking:**
    *   `algo_action`: "UP", "DOWN", "HOLD".
    *   `algo_reason`: e.g., "FAST_TREND", "TOO_SLOW", "EARLY_CALIB".
    *   `algo_trend`: The internal score value.
*   **Privacy:** UserID is a random UUID stored in `localStorage`. No login required.

### B. Frontend (React/Vite)
*   **Feed Engine:**
    *   **Two-Step Swipe Animation:** 1. Slide Offset -> 2. Silent Index Swap. Creates a "TikTok-like" continuous feel.
    *   **Smart Buffering:** Keeps 3 tasks pre-generated.
    *   **Input Locking:** Prevents multi-swipes during animation.
*   **Layout:**
    *   **Dynamic Footer:** `--footer-height` CSS variable ensures content (Numpad) never overlaps navigation, regardless of device safe areas (iPhone Notch).
    *   **Glassmorphism:** Modern UI with blur effects.

### C. Backend (Netlify Functions)
*   `record-task.mts`: Receives the JSON payload from the frontend and inserts it into Supabase `task_history_v2`.
*   `generate-task.mts`: Deprecated for core loop (replaced by local generation) but kept for legacy support.

---

## 5. Current Status & Known Behaviors
*   **Migration:** On first load, `DATA_VERSION = 3` resets Math Levels to 3 (Average) to let the new algorithm calibrate everyone fairly. User History and ID are preserved.
*   **Analytics:** Charts in the profile now hide X-Axis labels to look clean on mobile. Legacy tasks (Music Rhythm) are filtered out.
*   **Update Celebration:** A "What's New" overlay appears once for every user to announce V2 features.

## 6. Deployment
*   **Repo:** GitHub `flowscroll-0.2`.
*   **Secrets:** Requires `SUPABASE_URL` and `SUPABASE_KEY` in Netlify.
*   **Command:** `git push -f origin main` (Force push used to overwrite legacy history with clean V2 state).