# Changelog

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
