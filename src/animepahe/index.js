import cheerio from 'cheerio-without-node-native';
import { fetchJson, fetchText, searchAnime, extractQuality, getImdbId, resolveMapping, getMalTitle } from './utils.js';
import { extractKwik } from './extractors.js';
import { MAIN_URL } from './constants.js';

function normalizeTitle(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Pick the best AnimePahe search hit for a wanted title. AnimePahe titles
// rarely match TMDB titles exactly (e.g. "Demon Slayer: ... Infinity Castle"
// vs "Kimetsu no Yaiba ..."), so exact-only matching was missing almost
// everything. Try exact-normalized, then substring either way. For movies we
// prefer Movie-type entries and do NOT blindly fall back (wrong movie is worse
// than none); callers handle the no-match case.
function pickBestMatch(list, title, preferMovie) {
    if (!Array.isArray(list) || list.length === 0) return null;
    const want = normalizeTitle(title);
    if (!want) return null;
    let candidates = list;
    if (preferMovie) {
        const movies = list.filter((x) => String(x.type || '').toLowerCase() === 'movie');
        if (movies.length) candidates = movies;
    }
    let m = candidates.find((x) => normalizeTitle(x.title) === want);
    if (m) return m.session;
    m = candidates.find((x) => {
        const t = normalizeTitle(x.title);
        return t && (t.includes(want) || want.includes(t));
    });
    return m ? m.session : null;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        let animeSession = null;
        let animeTitle = "";
        let mappedEp = episode;
        let targetMalId = null;

        if (mediaType === 'tv') {
            // --- SERIES STRATEGY: ID-BASED WITH VERIFICATION ---
            const imdbId = await getImdbId(tmdbId, mediaType);
            if (!imdbId) return [];

            const mapping = await resolveMapping(imdbId, season, episode);
            if (!mapping || !mapping.mal_id) return [];

            targetMalId = mapping.mal_id;
            mappedEp = mapping.mal_episode || episode;
            animeTitle = await getMalTitle(targetMalId); // Official MAL Title

            if (!animeTitle) return [];

            const searchResults = await searchAnime(animeTitle);
            if (searchResults.data && searchResults.data.length > 0) {
                // VERIFY each candidate by checking for the MAL ID on its page.
                // Check first 3 candidates for efficiency (usually first is correct).
                for (let i = 0; i < Math.min(searchResults.data.length, 3); i++) {
                    const item = searchResults.data[i];
                    const pageHtml = await fetchText(`/anime/${item.session}`);
                    if (pageHtml.includes(`myanimelist.net/anime/${targetMalId}`)) {
                        animeSession = item.session;
                        break;
                    }
                }
                // Fallback: if MAL-id verification did not confirm any candidate
                // (page layout/links change often), trust the best title match so
                // we still return streams instead of nothing.
                if (!animeSession) {
                    animeSession = pickBestMatch(searchResults.data, animeTitle, false)
                        || searchResults.data[0].session;
                }
            }
        } else {
            // --- MOVIE STRATEGY: NORMALIZED / FUZZY TITLE MATCH ---
            const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
            const tmdbRes = await fetch(tmdbUrl);
            const tmdbData = await tmdbRes.json();
            animeTitle = tmdbData.title || tmdbData.original_title;
            const originalTitle = tmdbData.original_title;
            mappedEp = 1;

            if (!animeTitle) return [];

            const searchResults = await searchAnime(animeTitle);
            animeSession = pickBestMatch(searchResults.data, animeTitle, true)
                || pickBestMatch(searchResults.data, originalTitle, true);

            // Retry search with the original (often romaji/Japanese) title.
            if (!animeSession && originalTitle && originalTitle !== animeTitle) {
                const altResults = await searchAnime(originalTitle);
                animeSession = pickBestMatch(altResults.data, originalTitle, true)
                    || pickBestMatch(altResults.data, animeTitle, true);
            }
        }

        if (!animeSession) return [];

        // --- COMMON LOGIC: Smart Episode Resolution ---
        const firstPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=1`;
        const firstPageData = await fetchJson(firstPageUrl);
        if (!firstPageData.data || firstPageData.data.length === 0) return [];

        const paheEpStart = Math.floor(firstPageData.data[0].episode);
        const perPage = firstPageData.per_page || 30;
        const targetPaheEp = (paheEpStart - 1) + mappedEp;

        const targetPage = Math.ceil(mappedEp / perPage) || 1;
        const targetPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=${targetPage}`;
        const targetPageData = await fetchJson(targetPageUrl);

        let episodeSession = null;
        if (targetPageData && targetPageData.data) {
            const foundEp = targetPageData.data.find(e => Math.floor(e.episode) == targetPaheEp);
            if (foundEp) episodeSession = foundEp.session;
        }

        if (!episodeSession && targetPage !== 1) {
            const fallbackEp = firstPageData.data.find(e => Math.floor(e.episode) == targetPaheEp);
            if (fallbackEp) episodeSession = fallbackEp.session;
        }

        if (!episodeSession) return [];

        // --- EXTRACTION ---
        const playUrl = `/play/${animeSession}/${episodeSession}`;
        const playHtml = await fetchText(playUrl);
        const $ = cheerio.load(playHtml);

        const streams = [];
        const promises = [];
        $('#resolutionMenu button').each((i, el) => {
            const $btn = $(el);
            const kwikUrl = $btn.attr('data-src');
            const btnText = $btn.text();
            const quality = extractQuality(btnText);
            const type = btnText.toLowerCase().includes('eng') ? 'Dub' : 'Sub';

            if (kwikUrl && kwikUrl.includes('kwik')) {
                promises.push(
                    extractKwik(kwikUrl).then(res => {
                        if (res) {
                            streams.push({
                                name: `AnimePahe (${quality} ${type})`,
                                title: `${animeTitle} - Episode ${mappedEp}`,
                                url: res.url,
                                quality: quality,
                                headers: res.headers
                            });
                        }
                    })
                );
            }
        });

        await Promise.all(promises);
        const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
        return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));

    } catch (error) {
        return [];
    }
}

module.exports = { getStreams };
