# KindPlate — Team Guide

Short handoff for the whole team: what we built, how to run it, who does what on demo day, and how it maps to the brief.

---

## 1. One-liner

**KindPlate** is a clinic-connected meal companion for anorexia-focused logging: patients say hello with a **live meal photo** and care for a gentle companion; clinicians see photos, pattern summaries, and explainable alerts. **Companionship over competition. AI observes; clinicians decide.**

---

## 2. Repo map

| Folder | What | Who usually owns |
|--------|------|------------------|
| `mobile/` | Expo React Native patient app | Mobile / demo phone |
| `backend/` | Express API + JWT + AI | Backend |
| `dashboard/` | Vite clinician UI | Clinic laptop |
| `DEMO.md` | 90s demo path + firewall | Everyone — read before pitch |
| `NOTES.md` | Limitations / honesty lines | Pitch |

Demo accounts (all passwords = **`demo`**):
- Patient: `maya@demo.local`
- Clinic: `clinic@demo.local`

---

## 3. Non-negotiables (say these out loud)

1. **Patients never see calories, macros, or scores.**
2. **Missed days → companion rests — never suffers or dies.**
3. **AI observes; clinicians decide.**

If judges only remember three things, make it these.

---

## 4. What we built (by surface)

### Patient app (`mobile/`)
- Sign up / sign in / stay signed in / switch account
- Transparency screen (what clinic can see)
- **Live camera check-in only** (no gallery)
- Companion: happy vs **resting**; talk / wave / play / sleep (3D WebView animals)
- Animal switcher (fox, horse, parrot, flamingo, stork)
- Hello-days **calendar** + gentle streak
- Customize (name, cosmetics, scene — no body morph)
- Quiet time together + optional soft music
- Settings (reminders, session, AI transparency copy)
- Therapist sage/cream UI palette

### Clinician dashboard (`dashboard/`)
- Clinician login
- Patient list
- Alerts with **Why this alert** detail
- Meal photos, AI / mock pattern summary
- Notes; clinic-only nutrition estimates + disclaimer
- Live OpenAI vs mock badge

### Backend (`backend/`)
- Auth (bcrypt + JWT + roles)
- Check-ins, streaks, mood, milestones / unlocks
- Strip nutrition fields from **patient** API responses
- Photo analysis + summaries (OpenAI if key set, else mock)
- Unit tests for streaks / mood / alerts / nutrition leak

---

## 5. How it maps to the brief (“rubric”)

| Brief requirement | Where it lives | Status |
|-------------------|----------------|--------|
| Daily live camera food log | Mobile Check-in | Done |
| No gallery picker | Camera flow | Done |
| Companion happy / resting only | Companion mood + copy | Done |
| No punitive pet | Resting story, no die/sad | Done |
| Milestones = cosmetics only | Unlocks / customize / 3D props | Done |
| No patient nutrition numbers | Patient UI + API strip | Done |
| Clinician dashboard | `dashboard/` | Done |
| Explainable alerts | Alert detail + guidance | Done |
| AI summaries / observation | Backend AI + clinic Generate | Done (needs key for live) |
| Cute, calm UI | Theme + companion | Done |

**Own honestly if asked:** 3D is WebView + CDN models (Expo Go limit); camera ≠ proof meal was eaten; no key → mock AI; JSON file store = hackathon, not production EHR.

---

## 6. Run book (demo day)

### A. Backend
```bash
cd backend
# Optional but strong: set OPENAI_API_KEY in backend/.env
npm start
# or: npm run dev
```
Health check: `http://localhost:3001/api/health` (or your LAN IP).

### B. Clinic dashboard
```bash
cd dashboard
npm run dev
```
Open the Vite URL (usually `http://localhost:5173`). Login: `clinic@demo.local` / `demo`.

### C. Patient phone (Expo)
1. Same Wi‑Fi (or phone hotspot) as the laptop.
2. Find PC IPv4 (`ipconfig`) — **not** `172.27.x.x` Hyper-V.
3. `mobile/.env`:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3001
   ```
4. Start Expo (from `mobile/`):
   ```powershell
   $env:REACT_NATIVE_PACKAGER_HOSTNAME='YOUR_PC_IP'
   npx expo start
   ```
5. Phone Expo Go → `exp://YOUR_PC_IP:8081`
6. If blocked: run `scripts/open-demo-ports.ps1` as Admin (ports **3001** + **8081**).

### Roles on the day
| Person | Job |
|--------|-----|
| **Phone lead** | Maya login, companion, check-in, customize |
| **Clinic lead** | Jordan alert + Maya/Sam summary on laptop |
| **Ops** | IP, `.env`, firewall, restart backend/Expo |
| **Speaker** | Ethics lines + problem → loop → clinic |

---

## 7. 90-second demo path

| Time | Action |
|------|--------|
| 0:00–0:20 | Phone: Maya → home companion → switch animal / Talk–Wave |
| 0:20–0:40 | Check-in → live camera → capture → keepsake if any |
| 0:40–0:55 | If resting: read “Resting together” (never punishment) |
| 0:55–1:15 | Laptop: clinic → **Jordan** → read **Why this alert** |
| 1:15–1:30 | Maya or Sam → **Generate AI summary** → disclaimer + live/mock badge |

**Backup if camera dies:** clinic photos for Maya + Jordan alert + ethics lines.

---

## 8. Suggested commit messages (if you still need them)

**mobile**
```
Add interactive 3D companions, hello-day calendar, and therapist color theme
```

**hack for humanity (parent)**
```
Expose helloDays on companion API and align clinic dashboard palette
```

Do **not** commit `mobile/.env` or `.tmp-export-test/`.

---

## 9. Team FAQ

**Why isn’t 3D “real native Three.js” on the phone?**  
Expo Go is often WebGL1; we use a WebView + Three.js player so the demo works on device.

**Why can clinic see calories but the patient can’t?**  
By design: clinicians need observational estimates; patients must not see scores.

**What if OpenAI isn’t keyed?**  
App still runs with mock AI — say “enriched demo analysis” and show the badge.

**Streak died — is the pet mad?**  
No. It **rests**. A meal photo hello brings it back gently.

---

## 10. Pitch spine (30 seconds)

> Eating-disorder logging tools often punish or score patients. KindPlate flips that: one live meal photo to say hello, a companion that rests instead of suffering, and a clinic dashboard where AI flags patterns but **humans decide**. No patient calories. No dying pet. Companionship over competition.

Good luck — rehearse the ethics lines once out loud before you go on.
