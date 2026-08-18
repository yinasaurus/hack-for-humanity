# Demo day — 90 seconds + what YOU must do

## You must do (I cannot)

### 1. Live OpenAI key (biggest “wow”)
1. Open `backend/.env`
2. Set:
   ```
   OPENAI_API_KEY=sk-...your key...
   ```
3. Restart backend (`npm run dev` in `backend/`)
4. Clinic header should say **live OpenAI** (not mock)

### 2. Phone + laptop LAN (avoid demo death)
1. Phone hotspot / same Wi‑Fi as the PC
2. On PC, find LAN IP (PowerShell):
   ```
   ipconfig
   ```
   Look for IPv4 like `192.168.x.x` or `10.x.x.x`
3. `mobile/.env`:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3001
   ```
4. Restart Expo after changing `.env`
5. Allow firewall (run once as Admin if needed):
   ```
   powershell -ExecutionPolicy Bypass -File scripts/open-demo-ports.ps1
   ```
6. Smoke test: open `http://YOUR_PC_IP:3001/api/health` on the phone browser → `{"ok":true,...}`

### 3. Say the ethics out loud (judges need to hear it)
Memorize these three lines:
1. **Patients never see calories, macros, or scores.**
2. **Missed days → companion rests — never suffers or dies.**
3. **AI observes; clinicians decide.**

---

## 90-second demo path (rehearse)

| :00–:20 | Phone: Maya (`maya@demo.local` / `demo`) → home companion → Customize coat color (show recolor) |
| :20–:40 | Check-in → live camera → capture → celebration / keepsake if unlocked |
| :40–:55 | Optional: resting story — if mood resting, read the “Resting together” card |
| :55–:75 | Laptop clinic: `clinic@demo.local` / `demo` → **Jordan** alert → read **Why this alert** |
| :75–:90 | Select Maya or Sam → **Generate AI summary** → point at disclaimer + live/mock badge |

Backup if camera fails: show existing Maya check-ins on clinic + Jordan alert + ethics lines.

---

## Intentionally skipped (do not burn time)
- Real DB migration
- EAS / App Store build
- Clinician mobile app
- Anti-cheat / calorie UI for patients / punitive pet
