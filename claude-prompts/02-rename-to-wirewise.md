# 02 — Rename the project from VoltLab to WireWise

Read `00-start-here-and-conventions.md` first. Run **after** prompt 01 is merged. Branch: `chore/rename-wirewise`.

## Goal

Rename the product to **WireWise** everywhere the user, the build, or a saved file can see the old name, without breaking old saves, saved preferences, or the GitHub Pages deployment.

Naming: display name `WireWise`; package and repo slug `wirewise`; file names `WireWise-Standalone.html`. Keep the existing descriptive subtitle ("Interactive Electrical Installation & Motor Control Simulator").

## Step 0 — Baseline and inventory

1. Baseline build and tests as in the conventions file.
2. Inventory every occurrence, case-insensitive, excluding `node_modules`, `dist`, `.git`:
   `grep -rniE "volt[- _]?lab" . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git`
   Group the hits into: (a) user-visible text, (b) build and deploy config, (c) storage keys and file-format markers, (d) comments and docs, (e) internal identifiers such as CSS variables or class prefixes.
3. Show the user the grouped counts (one short table) in your first message, then proceed.

## Step 1 — Questions to ask once (AskUserQuestion)

1. **GitHub repo**: "Have you already renamed the repository `jro-d/volt-lab`, and to what?" Options: renamed to `wirewise`; will rename later; different name. GitHub redirects the old URL, but GitHub Pages serves from the new path, so the build must match.
2. **Internal identifiers** (for group e): leave as is (recommended unless they are visible to users), or rename mechanically.

Do not guess the repo name. Until the user answers "renamed", keep the old repository URL in `package.json` and the README clone instructions, and add a `TODO(user)` comment plus a line in the final report.

## Step 2 — Build and deploy (highest risk, do carefully)

- `vite.config.ts` and `vite.standalone.config.ts`: check `base`. If it is `/volt-lab/` (or anything derived from the repo name) it must become `/<new repo name>/` **only when the repo is actually renamed**; otherwise the live site breaks. Read both configs and explain what you changed.
- `.github/workflows/deploy.yml`: update names, artifact names and any path derived from the old name. Do not change triggers or permissions.
- `package.json`: `name` -> `wirewise`; `description` unchanged except the name; `repository.url` per Step 1. Update `package-lock.json` (`name` appears twice) with `npm install --package-lock-only`, and confirm the lock diff is only the name.
- `scripts/build-standalone.mjs`: output file `WireWise-Standalone.html`; update the page `<title>` it injects if any.
- `.gitignore`: replace `VoltLab-Standalone.html` (added in prompt 01) with `WireWise-Standalone.html`.
- `.claude/launch.json`: name field, if any.
- `index.html`: `<title>`, meta description, any `og:` tags.

## Step 3 — User-visible text

Update brand text in: the top bar (`TopNavBar.tsx`), lab selector (`LabSelectorModal.tsx`), status bar, the "Save HTML" export (file name prefix, embedded `<title>` and any footer text), the JSON export file name, lab descriptions in `labTemplates.ts` and `motorControlLabs.ts`, tooltips, and the README (title, overview, "Run locally", project structure tree, standalone file name, badges). Keep the README author block and licence exactly as they are. Add one line near the top: "WireWise (formerly VoltLab)".

If there is a text wordmark, make it `Wire` + `Wise` in the existing display font, with the second half in the existing accent colour from `tokens.css`. Do not add images or new fonts.

## Step 4 — Saved data compatibility (do not skip)

- **localStorage / sessionStorage keys** (theme, last project, preferences; grep `localStorage`): read the new key first, fall back to the old `voltlab...` key, copy its value to the new key once, then remove the old key. Wrap in try/catch.
- **File-format markers**: if exported JSON or Save-HTML contains an `app`/`format`/`generator` field or a `<script id="voltlab-...">` marker, write the new name but **accept both** when importing and opening.
- Add a smoke test that imports a project JSON with the old marker and with the new one.

## Step 5 — Everything else

- Comments and docstrings that say VoltLab: update. Leave `docs/` alone (git-ignored).
- Internal identifiers (CSS variables such as `--volt-*`, Tailwind colour names, class prefixes): leave unless the user chose "rename mechanically" in Step 1, in which case do it with a scripted replace, rebuild, and diff the compiled CSS size to make sure nothing was missed.
- Do not rename the working folder `07-electrical-installation` or the Git remote.

## Acceptance

- `grep -rniE "volt[- _]?lab"` returns only: the migration fallbacks, the "formerly VoltLab" README line, and `TODO(user)` repo-URL notes.
- `npm run build` and `npm run build:standalone` pass; the standalone file is `WireWise-Standalone.html` and opens offline with the new title.
- Open the app: new name in the tab title, top bar and exports. Theme preference set under the old key is still honoured.
- Old project JSON and old Save-HTML files still open.
- If the repo has been renamed: the Pages `base` matches the new repo name.

## Final report must list

Old -> new for every file name changed, every storage key migrated, the `base` value before and after, and anything still waiting on the user (the GitHub repo rename itself is done by the user in repo Settings -> General).
