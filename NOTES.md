# KindPlate — Self-review notes

## What we built (updated)

1. Patient check-in (camera-only) + JWT sessions
2. Illustrated companions + **coat recolor blend** + cosmetic overlays (no body morph)
3. Customize, quiet-time bonding, optional ambient audio (`expo-audio`)
4. Settings: music, stay signed in, gentle reminders with frequency + time
5. **Milestone celebration** modal when keepsakes unlock
6. **Resting-day story** card (calm companionship, never punishment)
7. Clinician dashboard: login, **Why this alert** detail/guidance, heat map, calorie trend with **estimate disclaimer**, notes, photos, AI summary, live/mock AI badge
8. AI: live OpenAI when `OPENAI_API_KEY` set; otherwise enriched observational mocks
9. Tighter signup (min 6 chars + confirm); seeded demo passwords = `demo`
10. **Clinician-scheduled reminders** (manual note + frequency → companion + local notifications — not AI scheduling)
11. Checkup celebration (attendance-only, no body metrics)

## Auth note

Hackathon-hardened (bcrypt + JWT + role checks), not full production IdP/MFA.

## What we tested

- Backend unit tests (`npm test`): streaks, pet mood, milestones, consecutive misses, **alert detail/guidance**, walk unlock, patient payload nutrition strip.

## Demo ops

- Follow `DEMO.md` — OpenAI key, LAN IP, firewall script `scripts/open-demo-ports.ps1`, ethics lines, 90s path.

## Known limitations (demo honesty)

- Camera-only blocks gallery reuse but does **not** prove the meal was eaten.
- Mock AI without an API key is demo data — fine for UI, not clinical accuracy.
- File store is local JSON — not multi-instance production storage.
- Coat recolor uses blend overlays (not per-pixel re-exported art).
- Skip for pitch: real DB, EAS store builds, clinician mobile app.

## Grep / language pass

Patient surfaces: no punitive pet language; no calorie leakage on patient API routes. Clinic may show kcal estimates by design, always with clinician-decides framing.
