# Changelog

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
