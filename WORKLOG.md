# cbrepo Worklog

This file is the handoff ledger for Codex/Cursor. Update it on every repair round.

## Operating Rules

- Nuvio subscription URL must stay:
  `https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/manifest.json`
- Do not tell the user to use `raw.githubusercontent.com/.../main/manifest.json` or `cdn.jsdelivr.net/...@main/manifest.json`.
- Every provider change must update:
  - top-level `manifest.json` version
  - changed scraper `version`
  - `CHANGELOG.md`
  - `HANDOFF.md`
  - this `WORKLOG.md`
- If gh-pages output changes, `.github/workflows/publish.yml` must purge `@gh-pages` after deploy.
- Before commit, run:
  - `node --check providers/<changed>.js`
  - `node --check scripts/patch-providers-for-nuvio.js` when patch layer changes
  - `node scripts/patch-providers-for-nuvio.js _site/providers` after copying providers to `_site`
  - confirm patched provider contains `__CB_REPO_NUVIO_PATCHED__`
  - `git diff --check`
- Do not commit `_site/`; it is only a local deploy simulation folder.
- If Codex cannot push because GitHub 443 is blocked, record the exact local commit and tell the user/Cursor to run `git push origin main`.

## 2026-06-01

### 1.3.11 - CNCVerse placeholder filtering

- User report: CNCVerse search for *Sherlock* returned `CNCVerse Prime Video Auto` plus two qualities, but playback was a 10-minute "too many requests in short period of time" video. CloudStream CNC does not show this problem.
- Changed `providers/cncverse.js`:
  - Verify request now uses CloudStream/old NetMirror-style `Origin: https://net22.cc` and `Referer: https://net22.cc/verify2`.
  - Added `RATE_LIMIT_RE` detection for "too many requests", "short period", "rate limit", "access limit", and related text.
  - Added m3u8 pre-validation. If the playlist text contains rate-limit text or looks like the typical ten-minute placeholder playlist, the stream is discarded before Nuvio sees it.
  - Added `Origin` to playback headers.
- Bumped manifest to `1.3.11`.
- Bumped CNCVerse to `1.0.2-cb1`.
- Expected behavior: CNCVerse should no longer show known placeholder streams. If no valid NetflixMirror stream exists for a title, it should return no stream instead of a fake 10-minute warning video.
- Needs device validation for *Sherlock* and *Dorohedoro* after publishing.

### 1.3.8 - Nuvio patch metadata fallback

- Commit: `e1d44a5 Harden Nuvio patch metadata fallback`
- Changed `scripts/patch-providers-for-nuvio.js`.
- Added object-style Nuvio argument handling.
- Added built-in IMDb/TMDB metadata fallback for:
  - `tt0137523` -> movie TMDB `550` (*Fight Club*)
  - `tt1475582` -> TV TMDB `19885` (*Sherlock*)
- Bumped all enabled scraper versions so Nuvio redownloads provider JS.
- Local verification:
  - patched `_site/providers/*`
  - confirmed `__CB_REPO_NUVIO_PATCHED__`
  - confirmed `tt0137523` maps to `550`
  - confirmed `tt1475582` with `series` maps to TV `19885`
- Limitation: local sandbox external fetches still failed, so real stream output required device testing.

### 1.3.9 - CNCVerse and MovieBox captions

- Commit: `3790fd9 Add CNCVerse and prioritize MovieBox captions`
- Added `providers/cncverse.js`.
- Added `cncverse` to `manifest.json`.
- CNCVerse uses NetMirror/CNCVerse mobile endpoints:
  - `search.php`
  - `post.php`
  - `episodes.php`
  - `playlist.php`
- Platform order: Netflix, Prime Video, Hotstar, Disney.
- Added subtitle extraction and Chinese/zh/default caption prioritization.
- Updated `providers/moviebox.js` caption mapping so Chinese captions are marked and sorted first.
- Local verification:
  - `node --check providers/cncverse.js`
  - `node --check providers/moviebox.js`
  - patched `_site/providers`
  - confirmed `_site/providers/cncverse.js` contains `__CB_REPO_NUVIO_PATCHED__`
- Limitation: local sandbox could not extract CNCVerse cookie from `net50/net52/net22`, so Dorohedoro output needs phone/device validation.

### 1.3.10 - gh-pages CDN purge fix

- Commit: `4abda74 Purge gh-pages CDN after publish`
- Root cause: `publish.yml` only purged jsDelivr `@main`; the recommended subscription uses `@gh-pages`, so phones could remain stuck on old manifests such as `1.3.8`.
- Fixed `.github/workflows/publish.yml` to purge `@gh-pages` after deploying.
- Purged paths include:
  - `manifest.json`
  - `subscribe.json`
  - `VERSION.txt`
  - `providers/moviebox.js`
  - `providers/cncverse.js`
  - key existing providers
- Bumped repo version to `1.3.10`.
- Bumped `cncverse` to `1.0.1-cb1`.
- Bumped `moviebox` to `1.1.8-cb10`.
- Local verification:
  - `node --check providers/cncverse.js`
  - `node --check providers/moviebox.js`
  - `node --check scripts/patch-providers-for-nuvio.js`
  - `git diff --check`
- Push status: Codex local network could not reach GitHub 443. User must push `4abda74` or later.

### 1.3.10 - manual gh-pages publish fallback

- Symptom reported by user: recommended subscription URL still showed `1.3.8` after pushing `main`.
- Local diagnosis:
  - `origin/main` was at `019f8b9`, so main had the latest code.
  - `origin/gh-pages` was still `d7b850b deploy: 7f4ca798ee828dd2c35402091627c529b7a91516`, so the published branch was stale.
- Action taken:
  - Generated `_site` from current `main`.
  - Ran `node scripts/patch-providers-for-nuvio.js _site/providers`.
  - Confirmed `_site/providers/cncverse.js` contains `__CB_REPO_NUVIO_PATCHED__`.
  - Created a separate worktree at `C:\Users\cbdog\Documents\New project\nuvio-providers-cb-gh-pages`.
  - Copied `_site` output into that `gh-pages` worktree.
  - Committed `gh-pages` locally as `7c7a9c7 deploy: cbrepo 1.3.10`.
- Required user/Cursor push:
  - `cd "C:\Users\cbdog\Documents\New project\nuvio-providers-cb-gh-pages"`
  - `git push origin gh-pages`
- After pushing, verify:
  - `https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/manifest.json` shows `"version": "1.3.10"`.
  - `https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/providers/cncverse.js` contains `__CB_REPO_NUVIO_PATCHED__`.

### 1.3.10 - remote gh-pages confirmed, CDN/Nuvio cache still stale

- User pushed `main`, then fetched `origin/gh-pages`.
- Local verification after the fetch:
  - `git show origin/gh-pages:manifest.json | ConvertFrom-Json | Select-Object -ExpandProperty version` returned `1.3.10`.
  - `git show origin/gh-pages:VERSION.txt` returned `1.3.10` and `e53845d`.
  - `origin/gh-pages` was `e906661 deploy: e53845d6f66f368ff3a60a8aadfa107e4cc3a6e7`.
- Conclusion: GitHub `gh-pages` is updated correctly. If phone still shows `1.3.8`, the stale layer is jsDelivr CDN cache or Nuvio local/plugin cache, not the Git branch.
- Codex attempted to purge jsDelivr from this sandbox:
  - `manifest.json`
  - `subscribe.json`
  - `VERSION.txt`
  - `providers/cncverse.js`
  - `providers/moviebox.js`
- All purge attempts failed with `Unable to connect to remote server`, same sandbox network issue as `git push`.
- Next operator action from a normal network:
  - Open or POST `https://purge.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/manifest.json`
  - Also purge `subscribe.json`, `VERSION.txt`, `providers/cncverse.js`, and `providers/moviebox.js`.
  - Then verify with `https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/manifest.json?v=1310`.
