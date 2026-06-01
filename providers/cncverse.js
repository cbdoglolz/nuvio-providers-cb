// CNCVerse / NetflixMirror provider for cbrepo.
// Ported from the CNC Verse CloudStream NetMirror flow, limited to OTT mirrors.

const NETMIRROR_DOMAINS = ["https://net50.cc", "https://net52.cc", "https://net22.cc"];
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";

const PLATFORM_MAP = {
    netflix: {
        label: "Netflix",
        ott: "nf",
        search: "/mobile/search.php",
        post: "/mobile/post.php",
        episodes: "/mobile/episodes.php",
        playlist: "/mobile/playlist.php"
    },
    primevideo: {
        label: "Prime Video",
        ott: "pv",
        search: "/mobile/pv/search.php",
        post: "/mobile/pv/post.php",
        episodes: "/mobile/pv/episodes.php",
        playlist: "/mobile/pv/playlist.php"
    },
    hotstar: {
        label: "Hotstar",
        ott: "hs",
        search: "/mobile/hs/search.php",
        post: "/mobile/hs/post.php",
        episodes: "/mobile/hs/episodes.php",
        playlist: "/mobile/hs/playlist.php"
    },
    disney: {
        label: "Disney",
        ott: "hs",
        search: "/mobile/hs/search.php",
        post: "/mobile/hs/post.php",
        episodes: "/mobile/hs/episodes.php",
        playlist: "/mobile/hs/playlist.php"
    }
};

const BASE_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7,zh;q=0.6",
    "Cache-Control": "max-age=0",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0",
    "X-Requested-With": "XMLHttpRequest"
};

const VERIFY_ORIGIN = "https://net22.cc";
const VERIFY_REFERER = "https://net22.cc/verify2";
const RATE_LIMIT_RE = /too\s*many\s*requests|short\s*period\s*of\s*time|rate\s*limit|access\s*limit|try\s*again\s*later/i;

let activeBase = NETMIRROR_DOMAINS[0];
let globalCookie = "";
let cookieTimestamp = 0;
const COOKIE_EXPIRY = 14 * 60 * 60 * 1000;

function getUnixTime() {
    return Math.floor(Date.now() / 1000);
}

function normalizeTitle(title) {
    return String(title || "")
        .toLowerCase()
        .replace(/\[.*?\]|\(.*?\)/g, " ")
        .replace(/[:._-]+/g, " ")
        .replace(/[^\w\s]/g, " ")
        .replace(/\b(the|a|an|season|series|tv)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function addUnique(arr, value) {
    const v = String(value || "").replace(/\s+/g, " ").trim();
    if (v && !arr.some(x => x.toLowerCase() === v.toLowerCase())) arr.push(v);
}

function buildTitleQueries(info, mediaType, season) {
    const terms = [];
    [info.title, info.originalTitle, info.originalName].forEach(title => {
        if (!title) return;
        addUnique(terms, title);
        addUnique(terms, title.replace(/[:._-]+/g, " "));
        addUnique(terms, title.replace(/\s+/g, ""));
        if (mediaType === "tv" && season) {
            addUnique(terms, `${title} Season ${season}`);
        }
    });
    return terms.slice(0, 8);
}

function scoreSearchResult(result, info, mediaType) {
    const title = result.title || result.name || result.t || "";
    const targetTitles = [info.title, info.originalTitle, info.originalName].filter(Boolean);
    const resultNorm = normalizeTitle(title);
    let score = 0;

    targetTitles.forEach(target => {
        const targetNorm = normalizeTitle(target);
        if (!targetNorm || !resultNorm) return;
        if (resultNorm === targetNorm) score = Math.max(score, 100);
        else if (resultNorm.includes(targetNorm) || targetNorm.includes(resultNorm)) score = Math.max(score, 70);
    });

    const rawYear = result.year || result.releaseYear || result.release_date || result.date || "";
    const yearMatch = String(rawYear).match(/\d{4}/);
    const resultYear = yearMatch ? yearMatch[0] : "";
    if (info.year && resultYear && String(info.year) === resultYear) score += 25;

    const typeText = String(result.type || result.category || result.isSeries || "").toLowerCase();
    if (mediaType === "movie" && (typeText.includes("movie") || typeText === "0")) score += 5;
    if (mediaType === "tv" && (typeText.includes("series") || typeText.includes("tv") || typeText === "1")) score += 5;

    return score;
}

function parseQuality(label) {
    const s = String(label || "");
    const match = s.match(/(\d{3,4})/);
    if (!match) return s || "Auto";
    return `${parseInt(match[1], 10)}p`;
}

function absolutize(base, url) {
    if (!url) return "";
    try {
        return url.startsWith("http") ? url : new URL(url, base).toString();
    } catch (e) {
        return url;
    }
}

function asJson(response) {
    if (!response || !response.ok) return Promise.resolve(null);
    return response.text().then(text => {
        try { return JSON.parse(text); } catch (e) { return null; }
    });
}

function requestJson(url, headers) {
    return fetch(url, { headers: headers || BASE_HEADERS }).then(asJson).catch(err => {
        console.log("[CNCVerse] Request failed: " + (err && err.message ? err.message : String(err)));
        return null;
    });
}

function requestText(url, headers) {
    return fetch(url, { headers: headers || BASE_HEADERS }).then(res => {
        if (!res || !res.ok) return "";
        return res.text();
    }).catch(() => "");
}

function randomUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 3 | 8);
        return v.toString(16);
    });
}

function bypass() {
    const now = Date.now();
    if (globalCookie && now - cookieTimestamp < COOKIE_EXPIRY) {
        return Promise.resolve({ base: activeBase, cookie: globalCookie });
    }

    function tryDomain(index) {
        if (index >= NETMIRROR_DOMAINS.length) {
            return Promise.reject(new Error("Failed to extract CNCVerse cookie"));
        }
        const base = NETMIRROR_DOMAINS[index];
        return fetch(`${base}/verify.php`, {
            method: "POST",
            headers: Object.assign({}, BASE_HEADERS, {
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": VERIFY_ORIGIN,
                "Referer": VERIFY_REFERER
            }),
            body: `g-recaptcha-response=${randomUuid()}`,
            redirect: "manual"
        }).then(response => {
            const setCookie = response.headers && response.headers.get ? response.headers.get("set-cookie") : "";
            const match = setCookie && setCookie.match(/t_hash_t=([^;]+)/);
            if (!match) throw new Error("No cookie on " + base);
            activeBase = base;
            globalCookie = match[1];
            cookieTimestamp = Date.now();
            return { base, cookie: globalCookie };
        }).catch(() => tryDomain(index + 1));
    }

    return tryDomain(0);
}

function fetchTmdbInfo(tmdbId, mediaType) {
    const type = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=external_ids`;
    return fetch(url)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (!data) return null;
            const date = mediaType === "tv" ? data.first_air_date : data.release_date;
            return {
                title: mediaType === "tv" ? (data.name || data.original_name) : (data.title || data.original_title),
                originalTitle: data.original_title,
                originalName: data.original_name,
                year: date ? date.substring(0, 4) : "",
                imdbId: data.external_ids && data.external_ids.imdb_id
            };
        })
        .catch(() => null);
}

function searchPlatform(base, platform, query, cookies) {
    const url = `${base}${platform.search}?s=${encodeURIComponent(query)}&t=${getUnixTime()}`;
    return requestJson(url, Object.assign({}, BASE_HEADERS, { Cookie: `${cookies}; ott=${platform.ott}` }))
        .then(data => Array.isArray(data && data.searchResult) ? data.searchResult : []);
}

function findBestResult(base, platform, info, mediaType, season, cookies) {
    const queries = buildTitleQueries(info, mediaType, season);
    const seen = {};
    const all = [];
    let chain = Promise.resolve();
    queries.forEach(query => {
        chain = chain.then(() => searchPlatform(base, platform, query, cookies).then(results => {
            results.forEach(result => {
                const key = result.id || result.title || JSON.stringify(result);
                if (!key || seen[key]) return;
                seen[key] = true;
                all.push(result);
            });
        }));
    });
    return chain.then(() => {
        let best = null;
        let bestScore = 0;
        all.forEach(result => {
            const score = scoreSearchResult(result, info, mediaType);
            if (score > bestScore) {
                best = result;
                bestScore = score;
            }
        });
        if (bestScore < 50) return null;
        return best;
    });
}

function getAllEpisodes(base, contentId, postData, platform, cookies) {
    const episodes = (postData && postData.episodes ? postData.episodes : []).filter(Boolean);
    function fetchEpisodesPage(seasonId, page) {
        const url = `${base}${platform.episodes}?s=${seasonId}&series=${contentId}&t=${getUnixTime()}&page=${page}`;
        return requestJson(url, Object.assign({}, BASE_HEADERS, { Cookie: `${cookies}; ott=${platform.ott}` }))
            .then(data => {
                if (data && data.episodes) episodes.push.apply(episodes, data.episodes.filter(Boolean));
                if (data && data.nextPageShow !== 0) return fetchEpisodesPage(seasonId, page + 1);
                return null;
            });
    }

    let chain = Promise.resolve();
    if (postData && postData.nextPageShow === 1 && postData.nextPageSeason) {
        chain = chain.then(() => fetchEpisodesPage(postData.nextPageSeason, 2));
    }
    if (postData && Array.isArray(postData.season)) {
        postData.season.forEach(seasonRow => {
            if (seasonRow && seasonRow.id) chain = chain.then(() => fetchEpisodesPage(seasonRow.id, 1));
        });
    }
    return chain.then(() => episodes);
}

function pickEpisode(episodes, season, episode) {
    const s = parseInt(season, 10);
    const e = parseInt(episode, 10);
    return episodes.find(ep => {
        if (!ep) return false;
        const epSeason = parseInt(String(ep.s || ep.season || "").replace(/\D/g, ""), 10);
        const epNum = parseInt(String(ep.ep || ep.episode || "").replace(/\D/g, ""), 10);
        return epSeason === s && epNum === e;
    }) || null;
}

function extractSubtitles(source, item, base) {
    const raw = [];
    [source, item].forEach(obj => {
        if (!obj) return;
        ["tracks", "subtitles", "captions", "subtitle"].forEach(key => {
            const value = obj[key];
            if (Array.isArray(value)) raw.push.apply(raw, value);
            else if (value && typeof value === "object") {
                Object.keys(value).forEach(lang => raw.push({ language: lang, url: value[lang] }));
            }
        });
    });
    return raw.map(sub => {
        if (!sub) return null;
        const url = sub.file || sub.url || sub.src;
        if (!url) return null;
        const label = sub.label || sub.language || sub.lang || "Subtitle";
        return {
            url: absolutize(base, url),
            language: label,
            label,
            default: /zh|chi|chinese|中文|简|繁/i.test(label)
        };
    }).filter(Boolean);
}

function isLikelyRateLimitUrl(url) {
    return RATE_LIMIT_RE.test(String(url || ""));
}

function validatePlayableUrl(url, headers) {
    const lower = String(url || "").toLowerCase();
    if (!url || isLikelyRateLimitUrl(url)) return Promise.resolve(false);
    if (!lower.includes(".m3u8")) return Promise.resolve(true);

    return requestText(url, headers).then(text => {
        if (!text) return true;
        if (RATE_LIMIT_RE.test(text)) return false;

        const durations = [];
        const re = /#EXTINF:([0-9.]+)/g;
        let match;
        while ((match = re.exec(text)) !== null) {
            durations.push(parseFloat(match[1]) || 0);
            if (durations.length > 300) break;
        }
        const total = durations.reduce((sum, n) => sum + n, 0);
        // NetMirror/CNCVerse rate-limit placeholder is usually about ten minutes.
        if (total >= 540 && total <= 660 && durations.length < 80) return false;
        return true;
    });
}

function playlistToStreams(base, platformKey, title, playlist, cookies) {
    const platform = PLATFORM_MAP[platformKey];
    const tasks = [];
    if (!Array.isArray(playlist)) return Promise.resolve([]);
    playlist.forEach(item => {
        const sources = item && Array.isArray(item.sources) ? item.sources : [];
        sources.forEach(source => {
            const file = source.file || source.url;
            if (!file) return;
            const quality = parseQuality(source.label || source.quality || source.name);
            const subtitles = extractSubtitles(source, item, base);
            const headers = {
                "Referer": `${base}/home`,
                "Origin": base,
                "User-Agent": BASE_HEADERS["User-Agent"],
                "Cookie": `hd=on; ott=${platform.ott}; ${cookies}`
            };
            const stream = {
                name: `CNCVerse ${platform.label} ${quality}`,
                title: `${title} ${quality}`,
                url: absolutize(base, file),
                quality,
                type: "direct",
                provider: "cncverse",
                headers
            };
            if (subtitles.length) {
                stream.subtitles = subtitles;
            }
            tasks.push(validatePlayableUrl(stream.url, headers).then(ok => ok ? stream : null));
        });
    });
    return Promise.all(tasks).then(items => items.filter(Boolean));
}

function fetchFromPlatform(base, platformKey, info, mediaType, season, episode, cookies) {
    const platform = PLATFORM_MAP[platformKey];
    return findBestResult(base, platform, info, mediaType, season, cookies).then(result => {
        if (!result || !result.id) return [];
        const contentId = result.id;
        const postUrl = `${base}${platform.post}?id=${contentId}&t=${getUnixTime()}`;
        return requestJson(postUrl, Object.assign({}, BASE_HEADERS, { Cookie: `${cookies}; ott=${platform.ott}` }))
            .then(postData => {
                let targetId = contentId;
                if (mediaType === "tv") {
                    return getAllEpisodes(base, contentId, postData || {}, platform, cookies).then(episodes => {
                        const targetEp = pickEpisode(episodes, season, episode);
                        if (!targetEp) return [];
                        return fetchPlaylist(base, platformKey, targetEp.id, info.title, cookies);
                    });
                }
                return fetchPlaylist(base, platformKey, targetId, info.title, cookies);
            });
    }).catch(err => {
        console.log(`[CNCVerse] ${platformKey} failed: ${err && err.message ? err.message : String(err)}`);
        return [];
    });
}

function fetchPlaylist(base, platformKey, targetId, title, cookies) {
    const platform = PLATFORM_MAP[platformKey];
    const url = `${base}${platform.playlist}?id=${targetId}&t=${encodeURIComponent(title)}&tm=${getUnixTime()}`;
    return requestJson(url, Object.assign({}, BASE_HEADERS, { Cookie: `${cookies}; ott=${platform.ott}` }))
        .then(playlist => playlistToStreams(base, platformKey, title, playlist, cookies));
}

function getStreams(tmdbId, mediaType, season, episode) {
    mediaType = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
    console.log(`[CNCVerse] Fetching ${mediaType} ${tmdbId}${mediaType === "tv" ? ` S${season}E${episode}` : ""}`);

    return bypass().then(ctx => {
        const cookies = `t_hash_t=${ctx.cookie}; hd=on`;
        return fetchTmdbInfo(tmdbId, mediaType).then(info => {
            if (!info || !info.title) {
                console.log("[CNCVerse] Missing TMDB title");
                return [];
            }
            const platforms = ["netflix", "primevideo", "hotstar", "disney"];
            let chain = Promise.resolve([]);
            platforms.forEach(platformKey => {
                chain = chain.then(streams => {
                    if (streams && streams.length) return streams;
                    return fetchFromPlatform(ctx.base, platformKey, info, mediaType, season, episode, cookies);
                });
            });
            return chain;
        });
    }).catch(error => {
        console.log("[CNCVerse] Error: " + (error && error.message ? error.message : String(error)));
        return [];
    });
}

module.exports = { getStreams };
