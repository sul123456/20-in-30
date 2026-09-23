# 20 in 30 Project Tracker

A shared, mobile-first video production tracker: **Next.js on Vercel + Supabase database**, with live updates. Everyone with the link sees and edits the same data.

## Quick start (about 10 minutes, no code, no SQL)

The database tables and your 31 films are set up **automatically** during deployment.

1. **Put the folder on GitHub**
   github.com → **New repository** → name it `twenty-in-thirty-tracker` → **Create**.
   On the next page click **"uploading an existing file"**, open the unzipped `twenty-in-thirty-tracker` folder, select **everything inside it** and drag it in → **Commit changes**.

2. **Import it into Vercel**
   vercel.com → **Add New… → Project** → pick the repository → **Deploy**.
   The first deploy finishes, but the page will say the database isn't connected yet. That's expected.

3. **Add the Supabase database**
   In the Vercel project: **Storage** tab → **Create Database** → **Supabase** → choose the region closest to your team (e.g. Mumbai) → **Create** → make sure this project is ticked → **Connect**.
   This creates the database and adds all its settings to Vercel for you.

4. **Redeploy**
   **Deployments** tab → ⋯ next to the latest one → **Redeploy**. (Supabase sometimes does this for you.)
   During this build the tracker creates its tables and loads your 31 films. In the build log you'll see
   `[setup-db] Loaded 31 videos from seed.sql.`

5. **Open the link** (Vercel shows it on the project page, e.g. `https://twenty-in-thirty-tracker.vercel.app`) and share it with the team.

Later deploys re-check the tables but never delete or overwrite the team's data.

**If step 4's log says "Automatic database setup did not complete":** open Supabase (Vercel → Storage → Open in Supabase) → **SQL Editor** → paste and run `schema.sql`, then `seed.sql`. Refresh the tracker.

---

## What's inside

| Tab | What it does |
|---|---|
| **Dashboard** | Overall completion %, a block per video, 7 KPI cards (Total, Completed, In progress, Not started, Overdue, Go live this month, Completion), filters (Month, Product, Maker, Agency, Digital FPR, Brand Checker, Status, Go-live range), *Videos needing attention*, step-by-step breakdown with bars, Maker-wise and Product-wise completion, and the searchable/sortable list of all videos. Click any video for details and its status history. |
| **Add / Update** | Pick a video (or add a new one), tap the status of each step, adjust details, enter your name and an optional comment, **Save**. Shows "Update saved successfully." |

**Workflow steps** (same as the Excel): Agency agreement, AI Addendum, Agency onboarding, Brand / Product / BCO script approval, Storyboarding, Self Legal Approval, 1st cut, Final cut, Go Live.

**Calculated automatically — never typed in:**
- **Overall status:** *Completed* if Final cut or Go Live is Done → otherwise *Overdue* if the go-live date has passed → otherwise *Not started* if every step is Pending → otherwise *In progress*.
- **Completion %:** Script closure (the 3 script approvals) = 20% in total (6.7% each); each of the other 8 steps = 10%. A step earns its weight when marked Done.
- **Needs attention:** unfinished videos whose go-live or delivery date has passed, or that haven't been updated for 5+ days (change `STALE_DAYS` in `config.js`).

---

## Files

All files sit at the top level of the repository, except two that must be inside a folder named `app`:

```
app/layout.js      page shell        ← must be in app/
app/page.js        tabs + main page  ← must be in app/
Dashboard.js       leader dashboard, attention list, video list, details + history
VideoForm.js       add / update form
ui.js              badge, progress bar, pop-up
config.js          steps, weights, durations, dropdown fields  (edit structure here)
logic.js           overall status, completion %, formatting
supabase.js        database connection (public key only)
useTracker.js      loading, live updates, saving
globals.css        all styles
setup-db.mjs       creates tables + loads films during each Vercel build
schema.sql         tables, save function, security rules, realtime
seed.sql           your 31 films from the Excel
videos_import_template.csv   layout for future CSV imports
package.json, next.config.mjs, jsconfig.json
```

## Settings (added automatically in step 3)

| Name | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | where the app reads and saves data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the public key; safe in the browser because the database only allows reading and saving through the `save_video` function |
| `POSTGRES_URL_NON_POOLING` / `POSTGRES_URL` | used **only during the build** to create the tables; never sent to the browser |

The secret / service-role key is never used by this app.

**Using an existing Supabase project instead of step 3:** in Vercel → Settings → Environment Variables add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `POSTGRES_URL_NON_POOLING` (Supabase → Connect → *Session pooler* connection string), then redeploy.

**Run on your own computer (optional):** `npm install`, copy `.env.example` to `.env.local`, fill it in, `npm run setup-db`, `npm run dev`.

## Your Excel data

**Already done for the current sheet:** loaded automatically on first deploy. `seed.sql` contains all 31 films (S.NO 1–31). Conversions: "Yes"/"Done" → Done, blank → Pending, "Expected today" kept as its own status, "Sep" → `2026-09`, "22-Sep" → `2026-09-22`, cost "TBC" → `cost_note = TBC`, the 15/20/30/40 Duration ticks → `durations`. S.NO continues from 32 for new videos.

**Adding more rows from Excel later (CSV):**
1. Open `videos_import_template.csv` in Excel. Keep the header row exactly as is; paste your rows underneath. Formats:
   - `month`: `2026-10`  ·  dates: `2026-10-15`  ·  `durations`: `{20,30}` (or `{}`)
   - `cost`: a number without commas, or leave blank and put `TBC` in `cost_note`
   - every `stage_…` column: exactly one of the names in `stage_statuses` (e.g. `Pending`, `Done`)
2. Save as **CSV UTF-8**.
3. Supabase → **Table Editor → videos → Insert → Import data from CSV** → choose the file → check the preview → **Import**. S.NO is assigned automatically.

For large or repeated imports you can also ask me for a new `seed.sql` from an updated sheet.

## Changing status options

Status options live in the **`stage_statuses`** table, so no code change or redeploy is needed:

- **Add** (e.g. *On Hold*): Table Editor → `stage_statuses` → Insert row → `name` = On Hold, `sort_order` = 40, `category` = `progress`. It appears in the form and dashboard within seconds.
- **Rename:** edit the `name` cell. Every video using it updates automatically.
- **Remove:** only possible once no video uses that status.
- `category` decides the maths: `pending` = not started, `progress` = in progress, `done` = complete (earns the step's weight).

Changing the **steps or weights** themselves is a code change in `config.js` (plus a matching column in the `videos` table and the `stage_cols` list in `save_video`).

## Sharing the tracker with the team

- **Everyone:** share the Vercel URL, e.g. `https://twenty-in-thirty.vercel.app`. It opens on the Dashboard.
- **Makers (straight to the form):** `https://…vercel.app/?tab=update`
- **A specific video:** `https://…vercel.app/?video=12` opens #12 ready to update. Handy in WhatsApp/email reminders.
- On a phone: open the link → Share → **Add to Home Screen** so it behaves like an app.

Anyone with the link can view and update (version 1, as requested). Deleting a video is intentionally not in the app; do it in Supabase Table Editor.

---

## Test checklist (do this once after deploying)

| # | Do this | Expect |
|---|---|---|
| 1–2 | Open the URL | Dashboard shows 31 videos and the "Live" dot turns green |
| 3–5 | Add / Update → Update a video → pick #7 → set 1st cut to **Done** → enter your name → **Save update** | "Update saved successfully." |
| 6 | Supabase → Table Editor → `videos` row 7; `status_history` | `stage_first_cut = Done`, `updated_by` = your name; a new history row |
| 7 | Back to Dashboard | 1st cut "Done" count +1, "Expected today" −1; #7's completion rose by 10% |
| 8–9 | Refresh the browser | Change is still there |
| 10–11 | Open the URL on another phone / incognito window | Same data |
| 12 | On two devices, open #20 at the same time; device A changes 1st cut, device B changes Storyboarding; both save | Both changes are kept (only changed fields are sent) |
| 13 | Keep the Dashboard open on device B while device A saves | B's numbers change within a second or two, no refresh |

## Adding login later

The app is structured for it: all writes go through one function (`save_video`) and one client (`supabase.js`). To require sign-in: enable an auth provider in Supabase (e.g. email magic link or Google Workspace), add a sign-in screen, change the RLS policies from `to anon, authenticated` to `to authenticated`, revoke `execute` on `save_video` from `anon`, and use `auth.jwt()->>'email'` inside `save_video` instead of the typed name.
