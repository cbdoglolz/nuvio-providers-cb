# Changelog

## 1.3.5 - 2026-05-31

- **MovieBox `1.1.5-cb5`**: Hermes-safe provider load (no object-spread / getter headers that could skip the provider entirely in Nuvio); add `[MovieBox] Fetching...` logs like other scrapers; declare `m3u8` in manifest formats; tag streams with `provider: moviebox`.

## 1.3.4 - 2026-05-31

- **MovieBox `1.1.4-cb4`**: Align with CNCVerse MovieBoxProvider — API host `api3.aoneroom.com`, TV playback via `play-info` + `oneroom` client + session bearer (fixes 0 streams for series e.g. Sherlock); rank TV candidates with `season-info`; attach caption tracks from `get-stream-captions` (incl. 中文 when available).

## 1.3.3 - 2026-05-31

- **4KHDHub `1.0.12-cb1`**: Stricter TV SxxExx matching (fixes wrong episode e.g. S04E01 when requesting S01E01); season in search query; show filename in source name.
- **HDHub4u `1.1.6-cb2`**: Reject wrong series in search (e.g. Young Sherlock vs Sherlock); filter links by episode filename; show filename in source name.
- **Vixsrc `1.0.6-cb1`**: Pass subtitle tracks from HLS master (incl. Chinese when available in playlist).

## 1.3.2 - 2026-05-31

- **YFlix `1.1.6-cb1`**: Fix rapid playback — fetch `/media/` with yflix.to Referer (Cloudstream pattern); set playback Referer to embed/CDN host; return master m3u8 only (no variant split).

## 1.3.1 - 2026-05-31

- **Vidlink `1.0.5-cb1`**: When CDN blocks server-side m3u8 fetch (403), still return the master playlist URL so Nuvio can play on device.
- **Vixsrc `1.0.5-cb1`**: Return only one master adaptive stream (no separate variant URLs that often fail in-app).
- **YFlix `1.1.5-cb1`**: Support `rapidshareee.site` (and other rapidshare hosts), not only `rapidshare.cc`; send embed-origin Referer on rapid media requests.

## 1.3.0 - 2026-05-30

- **Vixsrc / Vidlink / YFlix**: Fix playback “resource error” on new releases (e.g. Project Hail Mary) — restore `type: "direct"`, keep master adaptive m3u8, validate variant URLs, correct Referer/Origin for CDN playlists.
- **YFlix `1.1.4-cb1`**: Movie `eid` lookup fix; yflix.to Referer/Origin on streams.

## 1.2.9 - 2026-05-30

- **4KHDHub `1.0.11-cb1`**: Expose file size in `size` field (GB/MB), not only in title.
- **Vixsrc `1.0.3-cb1`**: Parse master m3u8 for 1080p/720p/… variants; show estimated bitrate as `size` (Mbps).
- **Vidlink `1.0.3-cb1`**: Dedupe quality variants; show bitrate when m3u8 lists bandwidth.
- **YFlix `1.1.3-cb1`**: Remove `Unknown` size; show bitrate when available from m3u8.

## 1.2.8 - 2026-05-30

- **HDHub4u `1.1.5-cb2`**: Fix over-aggressive cap that left only ~3 playback sources. Now tries up to 10 download links in batches of 3, stops when 8 streams found (Typesense title search unchanged at 15).

## 1.2.7 - 2026-05-30

- Manifest-only bump so Nuvio picks up 1.2.6 code if stuck on 1.2.5. Use jsdelivr manifest URL (see README).

## 1.2.6 - 2026-05-30

- **HDHub4u `1.1.4-cb2`**: Faster fetching — prioritize Pixeldrain/direct links over HubCloud wrappers; max 3 extractors; HubCloud stops after 2 buttons; skip TV redirect blocks when episode links exist; HbLinks capped.

## 1.2.5 - 2026-05-30

- **4KHDHub `1.0.10-cb1`**: Fix regression where movies with more than 5 download rows threw `Assignment to constant variable` and returned no streams.

## 1.2.4 - 2026-05-30

- Repo version bump only (same code as 1.2.3) — use if Nuvio still shows 1.2.2 after refresh. Try jsdelivr URL or delete/re-add cbrepo.

## 1.2.3 - 2026-05-30

- **4KHDHub `1.0.9-cb1`**: Cap to 5 download rows (prefer 4K/1080p), limit HubCloud chains to 2 concurrent / 2 links per row — fixes very slow fetching.
- **HDHub4u `1.1.3-cb2`**: TV shows now resolve only the requested episode (was extracting every episode on the page). Movies/TV capped to 5 links with concurrency 2.
- **KickassAnime `1.0.2-cb2`**: Follow kaa.lt redirect host like Cloudstream, multi-page search, TMDB year in query aliases.

## 1.2.2 - 2026-05-30

- **KickassAnime `1.0.1-cb1`**: Fix search not finding titles — session warmup, Referer/Origin on API calls, CF retry on HTML challenge pages, TMDB colon/short-title aliases, MAL/Jikan title fallback, weaker match threshold, episode list pagination.

## 1.2.1 - 2026-05-30

- **KickassAnime `1.0.0-cb1`**: New anime provider ported from phisher98 Cloudstream `Kickassanime` (kaa.lt JSON API). TMDB title search, episode lookup, VidStreaming AES + CatStream/BirdStream m3u8 extraction, `Cloudflare.solve()` retry on 403/503.

## 1.2.0 - 2026-05-30

Pruned dead or harmful providers after real-device testing (Project Hail Mary and batch local audit). **11 providers remain.**

**Removed (10):**
- **AnimeKai** — finds titles but MegaUp HLS cannot play in Nuvio (per-segment Referer / comma URLs).
- **AnimePahe** — search proxy returns 429; direct site 403; no reliable path to streams.
- **MovieBlast** — lists streams on device but playback fails (signed CDN URLs; not fixable in provider alone).
- **DVDPlay** — still surfaces wrong titles (e.g. unrelated Indian releases for Western movies).
- **Vidnest** — `first.vidnest.fun` backend returns HTTP 530.
- **ShowBox** — requires UI cookie/token not available in Nuvio scraper settings.
- **Castle** — API fetch/decrypt failures.
- **Cinevibe** — API returns 401 Unauthorized.
- **DahmerMovies** — source HTTP 403 from scraper network.
- **AllMovieLand** — zero search hits on audit titles; heavy CF dependency.

**Kept (11):** HDHub4u, UHDMovies, Vidlink, StreamFlix, MovieBox, 4KHDHub, Vixsrc, MoviesMod, YFlix, MalluMV (regional), MyCima (Arabic). Vixsrc/MoviesMod still need residential IP + `Cloudflare.solve()` on device.

## 1.1.25 - 2026-05-30

- **AnimePahe `1.0.2-cb5`**: Rebuilt from `src/animepahe/` (Cursor; Codex sandbox could not run esbuild). Restored TMDB `external_ids` fallback via `getImdbId()` when details lookup omits IMDb id.
- **AllMovieLand**: Rebuilt `providers/allmovieland.js` from `src/` so generated output matches current source (Cloudflare retry helper unchanged).

## 1.1.24 - 2026-05-30

- **Cinevibe `1.0.1-cb1`**: Added movie title fallbacks using TMDB original title and punctuation-normalized variants before giving up on the tokenized API request.
- Added `Cloudflare.solve()` retry support for Cinevibe TMDB, stream API, and stream quality HEAD requests when 403/503 is returned.
- Cinevibe remains movie-only as before; no TV support was added in this patch.

## 1.1.23 - 2026-05-30

- **DahmerMovies `1.0.2-cb1`**: Added TMDB original-title and punctuation-normalized title fallbacks before giving up on a directory path.
- Added `Cloudflare.solve()` retry support to the shared DahmerMovies request helper for 403/503 responses.
- This is a conservative search/retry patch only; the existing direct-link parsing and rate-limit-safe sequential resolver were left unchanged.

## 1.1.22 - 2026-05-30

- **AllMovieLand `1.0.1-cb1`**: Added aggregated title alias search using TMDB title, original title/name, punctuation-stripped forms, no-space forms, and season-specific TV terms.
- Added `Cloudflare.solve()` retry support for AllMovieLand search pages, media pages, embed pages, file-list POSTs, and playlist POSTs when the site returns 403/503.
- `node build.js allmovieland` is still blocked by the local Windows/esbuild path permission issue, so the source changes were manually mirrored into `providers/allmovieland.js`.

## 1.1.21 - 2026-05-30

- Removed disabled/dead providers from the subscription manifest and provider files after user confirmation: NetMirror, VidnestAnime, DooFlix, CinemaCity, and VIDEASY.
- Also removed matching source folders for NetMirror, DooFlix, and CinemaCity so they are not accidentally rebuilt later.
- The repo now exposes only 21 provider entries in `manifest.json`; deleted providers can be restored from Git history if a new key/backend/cookie path becomes available.

## 1.1.20 - 2026-05-30

- **Vixsrc `1.0.2-cb2`**: Added `Cloudflare.solve()` retry in the request helper for 403/503 responses, so real devices can solve challenges instead of returning zero streams immediately.
- **MoviesMod `1.0.2-cb1`**: Added the same `Cloudflare.solve()` retry in its request helper. This is intentionally limited to request-layer recovery and does not change matching or extraction logic.
- Both providers remain enabled but still need real-device testing because local/data-center traffic may be blocked by WAF.

## 1.1.19 - 2026-05-30

- **DooFlix `1.0.2-cb2`**: Disabled by default. The provider uses a hard-coded API key that is known to rotate/return 401; it should stay off until a current key is supplied from the app/source.
- **CinemaCity `1.0.1-cb1`**: Disabled by default. The provider depends on stale site cookies and has been returning no streams, so leaving it enabled only adds dead searches.
- No provider files were deleted; both can be re-enabled later if a fresh API key/cookie-backed extraction path is available.

## 1.1.18 - 2026-05-30

- **MovieBox `1.1.3-cb3`**: Added a TV fallback for `resourceDetectors[].resourceLink` pages when episode `downloadUrl` is empty.
- The fallback fetches the external resource page and extracts only real `mp4` / `mkv` / `m3u8` URLs, then keeps the legacy `play-info` endpoint as a final fallback if no direct links are found.
- This is intentionally conservative: it will return no streams instead of exposing non-video webpage links.

## 1.1.17 - 2026-05-30

- **DVDPlay `1.0.3-cb1`**: Added safer year-aware matching. Results with an explicit wrong year are filtered or heavily penalized instead of being selected just because the title is similar.
- DVDPlay now returns no streams when it cannot find a safe title/year match, avoiding bad mismatches such as a requested 2023/2024 movie resolving to an unrelated 2026 item.

## 1.1.16 - 2026-05-30

- **MovieBox `1.1.2-cb2`**: Adds aggregated alias search for TMDB title, original title/name, punctuation-stripped forms, no-space forms, and season-specific terms. This improves matching for anime/TV titles with inconsistent naming.
- **VidnestAnime `1.0.1-cb1`**: Disabled by default because the provider still calls the old `backend.vidnest.fun` API while current Vidnest public docs expose embed URLs, not the old JSON backend.
- Documented that VidnestAnime needs a rewrite instead of small parameter tweaks; leaving it enabled only adds a dead provider to Nuvio searches.

## 1.1.15 - 2026-05-30

- **AnimeKai `1.1.3-cb5`**: Keeps the raw MegaUp master playlist as an `Auto` fallback alongside parsed quality variants, so Nuvio can try both playback shapes on device.
- **AnimePahe `1.0.2-cb4`**: Adds TMDB details lookup, multiple title aliases (`Season N`, `Nth Season`, punctuation-stripped forms), and searches all aliases before picking a match.
- AnimePahe now verifies up to 8 search hits against the target MAL ID instead of only 3, improving newer season matches such as *Re:ZERO* Season 4.
- AnimePahe Kwik extraction now tries direct Kwik first, then falls back through the existing AnimePahe proxy if direct fetch is blocked.
- Note: Codex could not run `node build.js animepahe` in this sandbox because esbuild hit a path access error, so the source changes were mirrored manually into `providers/animepahe.js`.

## 1.1.14 - 2026-05-30

- **AnimeKai `1.1.3-cb4`**: Added TMDB season-episode fallback for newer seasons when Cinemeta has not caught up, aimed at titles like *Re:ZERO* Season 4.
- AniList matching now retries season-specific terms such as `Season 4` and `4th Season` after the base title search.
- Changed MegaUp extraction to decrypt the AnimeKai iframe directly first, closer to the Cloudstream flow; the old intermediate-iframe fetch remains only as fallback.
- Stopped URL-encoding comma-style MegaUp HLS paths because it can break signed playlist URLs.

## 1.1.13 - 2026-05-30

- **AnimeKai `1.1.3-cb3`**: Re-enabled by default because it is currently the only provider that reliably finds new seasonal anime.
- Changed MegaUp HLS handling so `/list,*.m3u8` playlists are fetched and parsed by the provider instead of being returned directly to Nuvio as comma-style master playlists.
- Normalized MegaUp playback headers to `Referer: https://megaup.cc/` / matching `Origin`, and URL-encodes comma path segments when returning playable HLS URLs.
- Kept NetMirror disabled by default because its source-side rate limit is not fixable in provider code.

## 1.1.12 - 2026-05-30

- **AnimeKai `1.1.2-cb2`**: Disabled by default. It can find anime and MegaUp-backed sources, but real-device playback still fails in Nuvio because the HLS flow needs per-segment MegaUp headers and has short-lived playlist URLs.
- **NetMirror `1.0.3-cb1`**: Disabled by default. The source heavily rate-limits and may show a 10-minute access-limit placeholder instead of a playable stream.
- Updated the README Nuvio subscription URL to point at this fork's `main/manifest.json` instead of the upstream tapframe repo.

## 1.1.11 - 2026-05-30

- **UHDMovies `1.2.2-cb4`**: Added search fallback when TMDB title has a `Project …` prefix (e.g. *Project Hail Mary* also tries *Hail Mary*). Helps when the site lists the short title.
- **MovieBlast `1.0.1-cb1`**: Fixed playback — added missing CDN headers (`Accept-Encoding: identity`, etc.), skip broken links, drop master `.m3u8` when direct `.mkv` exists, show quality in stream name.
- **Vidlink `1.0.2-cb1`**: Removed misleading `Unknown` file-size label (Nuvio showed it beside resolution); unknown quality now displays as `Auto`.

## 1.1.10 - 2026-05-30

- **HDHub4u `1.1.2-cb1`**: Search API moved from dead/blocked `search.pingora.fyi` to `search.hdhub4u.glass` (matches current Cloudstream). Oppenheimer now returns streams locally (was JSON parse error / HTML 403).
- **UHDMovies `1.2.2-cb3`**: Driveseed "Instant Download" links go through `cdn.video-gen.xyz` → redirect to `video-seed.pro/?url=...`. Old code POSTed to the wrong host; now follows redirects and extracts the final direct URL (Oppenheimer: 0 → 13 streams locally).
- AnimePahe / AnimeKai deprioritized per user (Kwik CF + MegaUp playback still failing on device).

## 1.1.9 - 2026-05-30

- Repo bumped to `1.1.9`.
- **AnimeKai `1.1.1-cb1`**: Spy x Family (and other MegaUp-hosted streams) returned links that would not play in Nuvio. MegaUp CDN URLs require a `Referer`/`Origin` from the embed host (`megaup.cc` / `megaup.live`), but the provider only sent a generic User-Agent. Each stream now carries the correct embed referer. MegaUp's comma-style master playlists (`/list,*.m3u8`) are passed through directly instead of being re-fetched with the wrong headers.
- **AnimePahe `1.0.2-cb3`**: Spy x Family was found locally (MAL map + proxy search OK) but returned 0 streams because every Kwik embed fetch hit HTTP 403. Added `Cloudflare.solve()` retry on 403/503 for direct Kwik requests (same pattern as AnimeKai).

## 1.1.8 - 2026-05-30

- MovieBox provider bumped to `1.1.1-cb1`.
- Fixed movies returning 0 streams: MovieBox moved playable links out of the old `play-info` endpoint (now returns an empty `streams` array). Streams are now read from the subject `get` response under `data.resourceDetectors[].downloadUrl` (a signed, range-enabled direct MP4 — verified HTTP 206 / `video/mp4`).
- Iterates language variants from `data.dubs` (capped) and keeps the legacy `play-info` call as a fallback.
- Fixed a quality-label bug that printed `265p` (parsed from the `h265` codec); quality now only accepts a real `<n>p` resolution, else `Auto`, and codec is shown separately.
- Known limitation: MovieBox TV episodes now expose only an external `resourceLink` page (ailok.pe / fzmovies.cms) with an empty `downloadUrl`, so series need extra per-site scraping (deferred). MovieBox also carries little/no Chinese audio even for major titles, so it is not a strong Chinese source.

## 1.1.7 - 2026-05-30

- AnimePahe provider bumped to `1.0.2-cb2`.
- Verified the backends are alive (proxy + animepahe.pw search/release APIs and the HF-space MAL mapping all respond), so the breakage was in matching, not the sources.
- Movie lookup no longer requires an exact title match (it almost never matched). Now normalizes titles and matches by exact-normalized then substring, prefers Movie-type entries, and retries with the TMDB original (romaji/Japanese) title.
- TV lookup now falls back to the best title match / first result when MAL-id page verification fails to confirm a candidate, so episodes still return streams instead of nothing.
- Reference: phisher98 Cloudstream `AnimePahe` (same proxy + api?m=search/release flow).

## 1.1.6 - 2026-05-29

- 4KHDHub provider bumped to `1.0.8-cb6`.
- Removed the unreliable `Seek OK / Seek Maybe / No Seek?` labels from stream names/titles. Real-device testing showed they were inaccurate (a "Download File" source labeled "No Seek?" actually seeked fine), so they were misleading rather than helpful.
- Stopped ordering by the guessed seek score; streams are now sorted by quality (resolution) instead, and no source type is artificially demoted.
- Stream names are now `4KHDHub - <Source> <height>p` with `<Source> | <size>` in the title, so each host (HubDrive, FSL, Download File, Pixeldrain, etc.) is clearly identifiable for the user to pick.
- Note: whether a given final link is seekable is host/file specific and cannot be reliably predicted from the URL; Nuvio itself can seek (confirmed on a "Download File" source), so this is left to the user to choose.

## 1.1.5 - 2026-05-29

- 4KHDHub provider bumped to `1.0.7-cb5`.
- Real fix for "fast-forward jumps back to start": prefer the HubDrive direct path over HubCloud.
- Verified against a live title (Demon Slayer: Infinity Castle): the HubCloud domain (`hubcloud.foo`) is behind a Cloudflare Turnstile challenge that plain `fetch` cannot pass, so the previous HubDrive→HubCloud routing produced non-seekable links.
- Added `extractHubDrive`: extracts the file id from the HubDrive URL/page and POSTs to `<base>/ajax.php?ajax=direct-download` (`id=<id>`), then returns `data.gd` — a Cloudflare R2 (`*.r2.dev`) direct `.mkv` URL that supports HTTP Range and is therefore seekable. Confirmed stable across requests and needs no cookies/token.
- HubDrive links now resolve via this direct path first and only fall back to the (Cloudflare-blocked) HubCloud route if it fails.

## 1.1.4 - 2026-05-29

- 4KHDHub provider bumped to `1.0.6-cb4`.
- Fixed the "fast-forward jumps back to start" (no seek) issue by resolving HubCloud button links to their real final direct URLs before returning them, mirroring the working DVDPlay HubCloud extractor.
- Added `resolveFinalLink`: unwraps `gamerxyt.com/dl.php?link=` and `360news4u.net/dl.php?link=` wrappers, normalizes Pixeldrain `/u/<id>` to `api/file/<id>?download`, follows `*.workers.dev/?id=` and `*.fans/?id=` redirects (up to 5 hops), and keeps already-direct `googleusercontent` / `r2.cloudflarestorage.com` / `r2.dev` links as-is.
- BuzzServer and HUBCDN links are left untouched so their existing dedicated resolvers still run.
- Reworked seek scoring: resolved direct file hosts (googleusercontent / R2) rank highest, Pixeldrain next, and any still-unresolved intermediate redirect endpoints (`workers.dev/?id=`, `dl.php?link=`) are pushed to the bottom and flagged `No Seek?`.

## 1.1.3 - 2026-05-29

- UHDMovies provider bumped to `1.2.2-cb2`.
- Added a title-only search retry when `title + year` finds no UHDMovies results.
- Reworked TV episode extraction to follow the Cloudstream Phisher provider pattern: scan page elements sequentially, track current season, and parse the real episode number from each `Episode` link.
- Normalized relative movie/episode links before extraction.
- Added basic provider metadata and headers to UHDMovies direct fallback streams.

## 1.1.2 - 2026-05-29

- 4KHDHub provider bumped to `1.0.5-cb3`.
- Reworked 4KHDHub episode link collection to follow the Cloudstream Phisher provider pattern more closely.
- Added support for collecting all raw links from each episode item instead of only the first HubCloud/HubDrive button.
- Added routing for HubDrive, HubCloud, HubCDN, Hblinks, Pixeldrain, and BuzzServer-style links.
- Added HubCDN base64 `reurl` decoding and BuzzServer redirect handling before returning streams.
- Kept seek-priority sorting so more likely seekable links still appear first.

## 1.1.1 - 2026-05-29

- 4KHDHub provider bumped to `1.0.4-cb2`.
- Added source labels that show whether a 4KHDHub link is more likely to support seeking: `Seek OK`, `Seek Maybe`, or `No Seek?`.
- Prioritized PixelServer/PixelDrain-style links ahead of FSL/PDL/download-button links because they are more likely to behave like seekable file streams on mobile players.
- Added 4KHDHub stream headers and provider metadata so returned entries are easier to identify in Nuvio.

## 1.1.0 - 2026-05-29

- AnimePahe provider bumped to `1.0.1-cb1`.
- Added an AnimePahe fallback path for Japanese anime TV episodes when the original IMDb/MAL mapping chain returns no usable sources.
- The fallback searches by TMDB title, resolves the target episode, and returns AnimePahe stream entries with playback headers.
- Current focus is anime. AnimeKai and VidnestAnime were tested but not bumped yet because their lookup paths still returned no usable streams in this environment.
- Known issue from user testing: the earlier movie/TV batch did not play The Boys S1E1. This release does not claim to fix that title.

## 1.0.1 - 2026-05-29

- Repo renamed to `cbrepo` in `manifest.json`.
- Bumped the first repair batch provider versions so Nuvio can refresh cached scrapers.
- Updated Vixsrc for the newer API/embed playlist flow.
- Partially refreshed 4KHDHub HubCloud/HubDrive parsing.
- Marked first batch versions for 4KHDHub, Vixsrc, Vidlink, StreamFlix, DooFlix, UHDMovies, and HDHub4u.
