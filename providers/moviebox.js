// MovieBox Scraper for Nuvio
// Compatible with Nuvio's JS environment (Hermes)
// Uses crypto-js and fetch

const CryptoJS = require('crypto-js');

// CNCVerse MovieBoxProvider uses api3.aoneroom.com + oneroom client for play-info/TV.
const API_BASE = "https://api3.aoneroom.com";

const HEADERS = {
    'User-Agent': 'com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)',
    'Connection': 'keep-alive',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-client-info': '{"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":"da2b99c821e6ea023e4be55b54d5f7d8","install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}',
    'x-client-status': '0'
};

function randomDeviceId() {
    let out = '';
    for (let i = 0; i < 16; i++) {
        out += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    }
    return out;
}

const STREAM_DEVICE_ID = randomDeviceId();

const STREAM_HEADERS = {
    'User-Agent': 'com.community.oneroom/50020088 (Linux; U; Android 13; en_US; sdk_gphone64_x86_64; Build/TQ3A.230901.001; Cronet/145.0.7582.0)',
    'Connection': 'keep-alive',
    get 'x-client-info'() {
        return JSON.stringify({
            package_name: 'com.community.oneroom',
            version_name: '3.0.13.0325.03',
            version_code: 50020088,
            os: 'android',
            os_version: '13',
            device_id: STREAM_DEVICE_ID,
            install_store: 'ps',
            gaid: '1b2212c1-dadf-43c3-a0c8-bd6ce48ae22d',
            brand: 'google',
            model: 'sdk_gphone64_x86_64',
            system_language: 'en',
            net: 'NETWORK_WIFI',
            region: 'US',
            timezone: 'Asia/Calcutta',
            sp_code: '',
            'X-Play-Mode': '1',
            'X-Idle-Data': '1',
            'X-Family-Mode': '0',
            'X-Content-Mode': '0'
        });
    },
    'x-client-status': '0'
};

// Key Derivation using CryptoJS (Double Decode)
const KEY_B64_DEFAULT = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
const KEY_B64_ALT = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ==";

// 1. Decode Base64 to Words. 2. Convert to UTF8 String. 3. Decode Base64 again to Words (Key)
const SECRET_KEY_DEFAULT = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64_DEFAULT).toString(CryptoJS.enc.Utf8)
);
const SECRET_KEY_ALT = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64_ALT).toString(CryptoJS.enc.Utf8)
);

// TMDB Config
const TMDB_API_KEY = 'd131017ccc6e5462a81c9304d21476de';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Helpers
function md5(input) {
    // input can be string or words
    return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex);
}

function hmacMd5(key, data) {
    return CryptoJS.HmacMD5(data, key).toString(CryptoJS.enc.Base64);
}

function generateXClientToken(timestamp) {
    const ts = (timestamp || Date.now()).toString();
    const reversed = ts.split('').reverse().join('');
    const hash = md5(reversed);
    return `${ts},${hash}`;
}

function buildCanonicalString(method, accept, contentType, url, body, timestamp) {
    let path = "";
    let query = "";

    try {
        // Handle both full URLs and paths (though we mostly use full URLs here)
        // Note: For React Native/Hermes compatibility, simple string splitting for path/query is safer if URL is not fully supported
        // But contemporary RN supports URL.
        const urlObj = new URL(url);
        path = urlObj.pathname;
        const params = Array.from(urlObj.searchParams.keys()).sort();
        if (params.length > 0) {
            query = params.map(key => {
                const values = urlObj.searchParams.getAll(key);
                return values.map(val => `${key}=${val}`).join('&');
            }).join('&');
        }
    } catch (e) {
        // Fallback for relative paths or invalid URL construction
        console.error("Invalid URL for canonical:", url);
    }

    const canonicalUrl = query ? `${path}?${query}` : path;

    let bodyHash = "";
    let bodyLength = "";

    if (body) {
        // Need to replicate the byte trimming logic: if > 102400 bytes, trim.
        // In JS, strings are UTF-16. Converting to UTF-8 words using CryptoJS.
        const bodyWords = CryptoJS.enc.Utf8.parse(body);
        const totalBytes = bodyWords.sigBytes;

        if (totalBytes > 102400) {
            // Simplified: if string length is small enough, use it.
            bodyHash = md5(bodyWords);
        } else {
            bodyHash = md5(bodyWords);
        }
        bodyLength = totalBytes.toString();
    }

    return `${method.toUpperCase()}\n` +
        `${accept || ""}\n` +
        `${contentType || ""}\n` +
        `${bodyLength}\n` +
        `${timestamp}\n` +
        `${bodyHash}\n` +
        canonicalUrl;
}

function generateXTrSignature(method, accept, contentType, url, body, useAltKey = false, customTimestamp = null) {
    const timestamp = customTimestamp || Date.now();
    const canonical = buildCanonicalString(method, accept, contentType, url, body, timestamp);
    const secret = useAltKey ? SECRET_KEY_ALT : SECRET_KEY_DEFAULT;
    const signatureB64 = hmacMd5(secret, canonical);
    return `${timestamp}|2|${signatureB64}`;
}

function request(method, url, body = null, customHeaders = {}, opts = {}) {
    const timestamp = Date.now();
    const xClientToken = generateXClientToken(timestamp);
    const useStream = !!opts.stream;
    const base = useStream ? STREAM_HEADERS : HEADERS;

    let headerContentType = customHeaders['Content-Type'];
    if (headerContentType === undefined) {
        headerContentType = useStream && opts.caption ? '' : 'application/json';
    }

    let sigContentType = headerContentType;
    let accept = customHeaders['Accept'];
    if (accept === undefined) {
        accept = useStream && opts.caption ? '' : 'application/json';
    }

    const xTrSignature = generateXTrSignature(method, accept, sigContentType, url, body, false, timestamp);

    const headers = {
        'Accept': accept,
        'x-client-token': xClientToken,
        'x-tr-signature': xTrSignature,
        'User-Agent': base['User-Agent'],
        'x-client-info': base['x-client-info'],
        'x-client-status': base['x-client-status'],
        ...customHeaders
    };
    if (headerContentType) {
        headers['Content-Type'] = headerContentType;
    }
    if (opts.bearer) {
        headers['Authorization'] = `Bearer ${opts.bearer}`;
    }

    const options = { method, headers };
    if (body) {
        options.body = body;
    }

    return fetch(url, options)
        .then(res => {
            return res.text().then(text => {
                if (opts.raw) {
                    return { ok: res.ok, headers: res.headers, data: res.ok ? (function () {
                        try { return JSON.parse(text); } catch (e) { return text; }
                    })() : null };
                }
                if (!res.ok) {
                    return null;
                }
                try {
                    return JSON.parse(text);
                } catch (e) {
                    return text;
                }
            });
        })
        .catch(err => {
            return null;
        });
}

function fetchStreamBearer(subjectId) {
    const url = `${API_BASE}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`;
    return request('GET', url, null, {}, { stream: true, raw: true }).then(res => {
        if (!res || !res.ok || !res.headers) return null;
        const xUser = res.headers.get('x-user');
        if (!xUser) return null;
        try {
            const parsed = JSON.parse(xUser);
            return parsed.token || null;
        } catch (e) {
            return null;
        }
    });
}

function fetchStreamCaptions(subjectId, streamId, bearer) {
    const url = `${API_BASE}/wefeed-mobile-bff/subject-api/get-stream-captions?subjectId=${subjectId}&streamId=${streamId}`;
    return request('GET', url, null, {}, { stream: true, bearer: bearer, caption: true }).then(res => {
        const ext = res && res.data && res.data.extCaptions;
        if (!Array.isArray(ext)) return [];
        return ext.map(cap => ({
            language: cap.language || cap.lanName || cap.lan || 'unknown',
            url: cap.url
        })).filter(s => s.url);
    });
}

// TMDB Helper
function fetchTmdbDetails(tmdbId, mediaType) {
    const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    return fetch(url)
        .then(res => res.json())
        .then(data => ({
            title: mediaType === 'movie' ? (data.title || data.original_title) : (data.name || data.original_name),
            year: (data.release_date || data.first_air_date || '').substring(0, 4),
            imdbId: data.external_ids?.imdb_id,
            originalTitle: data.original_title || data.original_name,
            originalName: data.original_name
        }))
        .catch(e => null);
}

function normalizeTitle(s) {
    if (!s) return "";
    return s.replace(/\[.*?\]/g, " ")
        .replace(/\(.*?\)/g, " ")
        .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\b/gi, " ")
        .trim()
        .toLowerCase()
        .replace(/:/g, " ")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ");
}

function addUnique(arr, value) {
    const v = String(value || '').replace(/\s+/g, ' ').trim();
    if (v && !arr.some(x => x.toLowerCase() === v.toLowerCase())) arr.push(v);
}

function ordinal(n) {
    n = parseInt(n, 10);
    if (!n) return '';
    const suffix = (n % 10 === 1 && n % 100 !== 11) ? 'st' : (n % 10 === 2 && n % 100 !== 12) ? 'nd' : (n % 10 === 3 && n % 100 !== 13) ? 'rd' : 'th';
    return `${n}${suffix}`;
}

function buildSearchTerms(details, mediaType, seasonNum) {
    const terms = [];
    [details.title, details.originalTitle, details.originalName].forEach(base => {
        if (!base) return;
        addUnique(terms, base);
        addUnique(terms, base.replace(/[-–—].*$/, ''));
        addUnique(terms, base.replace(/[:._-]+/g, ' '));
        addUnique(terms, base.replace(/\s+/g, ''));
        if (mediaType === 'tv' && seasonNum && parseInt(seasonNum, 10) > 1) {
            addUnique(terms, `${base} Season ${seasonNum}`);
            addUnique(terms, `${base} ${ordinal(seasonNum)} Season`);
        }
    });
    return terms;
}

function searchMovieBox(query) {
    const url = `${API_BASE}/wefeed-mobile-bff/subject-api/search/v2`;
    // Strict formatting
    const body = `{"page": 1, "perPage": 10, "keyword": "${query}"}`;

    return request('POST', url, body).then(res => {
        if (res && res.data && res.data.results) {
            let allSubjects = [];
            res.data.results.forEach(group => {
                if (group.subjects) {
                    allSubjects = allSubjects.concat(group.subjects);
                }
            });
            return allSubjects;
        }
        return [];
    });
}

function searchMovieBoxMany(queries) {
    const out = [];
    const seenSubjects = {};
    const seenQueries = {};
    let chain = Promise.resolve();

    queries.forEach(query => {
        const q = String(query || '').trim();
        if (!q || seenQueries[q.toLowerCase()]) return;
        seenQueries[q.toLowerCase()] = true;
        chain = chain.then(() => searchMovieBox(q).then(subjects => {
            subjects.forEach(subject => {
                const key = subject.subjectId || subject.id || `${subject.title}-${subject.year}`;
                if (!key || seenSubjects[key]) return;
                seenSubjects[key] = true;
                out.push(subject);
            });
        }).catch(() => null));
    });

    return chain.then(() => out);
}

function fetchSeasonInfo(subjectId) {
    const url = `${API_BASE}/wefeed-mobile-bff/subject-api/season-info?subjectId=${subjectId}`;
    return request('GET', url).then(res => {
        if (!res || !res.data || !Array.isArray(res.data.seasons)) return [];
        return res.data.seasons;
    }).catch(() => []);
}

function subjectSupportsEpisode(seasons, seasonNum, episodeNum) {
    const sn = parseInt(seasonNum, 10);
    const en = parseInt(episodeNum, 10);
    if (!sn || !en) return false;
    for (let i = 0; i < seasons.length; i++) {
        const row = seasons[i];
        const rowSeason = parseInt(row.se != null ? row.se : row.season, 10);
        const maxEp = parseInt(row.maxEp != null ? row.maxEp : row.max_ep, 10);
        if (rowSeason === sn && maxEp >= en) return true;
    }
    return false;
}

function scoreSubject(subject, tmdbTitle, tmdbYear, mediaType, seasonNum) {
    const normTmdbTitle = normalizeTitle(tmdbTitle);
    const targetType = mediaType === 'movie' ? 1 : 2;
    if (subject.subjectType !== targetType) return 0;

    const title = subject.title || '';
    const normTitle = normalizeTitle(title);
    const year = subject.year || (subject.releaseDate ? subject.releaseDate.substring(0, 4) : null);

    let score = 0;
    if (normTitle === normTmdbTitle) score += 50;
    else if (normTitle.includes(normTmdbTitle) || normTmdbTitle.includes(normTitle)) {
        score += 15;
        const wantSeason = parseInt(seasonNum, 10);
        if (wantSeason > 0) {
            const raw = title.toLowerCase();
            if (new RegExp('\\bs' + wantSeason + '\\b', 'i').test(raw) ||
                new RegExp('season\\s*' + wantSeason, 'i').test(raw)) {
                score += 25;
            }
        }
    }
    if (tmdbYear && year && tmdbYear == year) score += 35;
    return score;
}

function rankTvSubjects(subjects, tmdbTitle, tmdbYear, seasonNum, episodeNum) {
    const scored = [];
    subjects.forEach(subject => {
        const titleScore = scoreSubject(subject, tmdbTitle, tmdbYear, 'tv', seasonNum);
        if (titleScore < 15) return;
        scored.push({ subject, titleScore });
    });
    scored.sort((a, b) => b.titleScore - a.titleScore);

    let chain = Promise.resolve([]);
    scored.forEach(item => {
        chain = chain.then(list => {
            if (list.length >= 6) return list;
            const sid = item.subject.subjectId || item.subject.id;
            if (!sid) return list;
            return fetchSeasonInfo(sid).then(seasons => {
                if (!subjectSupportsEpisode(seasons, seasonNum, episodeNum)) return list;
                const seasonCount = seasons.length;
                list.push({
                    subject: item.subject,
                    titleScore: item.titleScore + Math.min(seasonCount, 4) * 3
                });
                list.sort((a, b) => b.titleScore - a.titleScore);
                return list;
            });
        });
    });
    return chain.then(list => list.map(x => x.subject));
}

function findBestMatch(subjects, tmdbTitle, tmdbYear, mediaType, seasonNum) {
    const normTmdbTitle = normalizeTitle(tmdbTitle);
    const targetType = mediaType === 'movie' ? 1 : 2;
    const wantSeason = mediaType === 'tv' ? parseInt(seasonNum, 10) : 0;

    let bestMatch = null;
    let bestScore = 0;

    for (const subject of subjects) {
        if (subject.subjectType !== targetType) continue;

        const title = subject.title || '';
        const normTitle = normalizeTitle(title);
        const year = subject.year || (subject.releaseDate ? subject.releaseDate.substring(0, 4) : null);

        let score = 0;

        if (normTitle === normTmdbTitle) score += 50;
        else if (normTitle.includes(normTmdbTitle) || normTmdbTitle.includes(normTitle)) {
            score += 15;
            if (wantSeason > 0) {
                const raw = title.toLowerCase();
                if (new RegExp('\\bs' + wantSeason + '\\b', 'i').test(raw) ||
                    new RegExp('season\\s*' + wantSeason, 'i').test(raw)) {
                    score += 25;
                }
            }
        }

        if (tmdbYear && year && tmdbYear == year) score += 35;

        if (score > bestScore) {
            bestScore = score;
            bestMatch = subject;
        }
    }

    const minScore = mediaType === 'tv' ? 15 : 40;
    if (bestScore >= minScore) return bestMatch;
    return null;
}

function getStreamLinks(subjectId, season = 0, episode = 0, mediaTitle = '', mediaType = 'movie') {
    const subjectUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`;

    function parseQualityNumber(value) {
        const match = String(value || '').match(/(\d{3,4})/);
        return match ? parseInt(match[1], 10) : 0;
    }

    function formatQualityLabel(value) {
        if (!value) return 'Auto';
        const s = String(value).trim();
        if (/\d{3,4}p$/i.test(s)) return s;
        const n = parseQualityNumber(s);
        return n ? `${n}p` : s;
    }

    function getFormatType(url) {
        const u = String(url || '').toLowerCase();
        if (u.includes('.mpd')) return 'DASH';
        if (u.includes('.m3u8')) return 'HLS';
        if (u.includes('.mp4')) return 'MP4';
        if (u.includes('.mkv')) return 'MKV';
        return 'VIDEO';
    }

    function urlTypeRank(url) {
        const u = String(url || '').toLowerCase();
        if (u.includes('.mpd')) return 3;   // DASH
        if (u.includes('.m3u8')) return 2;  // HLS
        if (u.includes('.mp4') || u.includes('.mkv')) return 1;
        return 0;
    }

    function formatTitle(title, season, episode, mediaType) {
        if (mediaType === 'tv' && season > 0 && episode > 0) {
            return `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
        }
        return title || 'Stream';
    }

    const isTv = mediaType === 'tv';
    const epQuery = isTv ? `&se=${season}&ep=${episode}` : '';

    // MovieBox moved playable links out of the old play-info endpoint (it now
    // returns an empty streams array). The direct files live in the subject
    // `get` response under data.resourceDetectors[].downloadUrl (a signed MP4).
    // Language variants are separate subjects listed in data.dubs.
    function getSubjectData(id) {
        return request('GET', `${API_BASE}/wefeed-mobile-bff/subject-api/get?subjectId=${id}${epQuery}`)
            .then(res => (res && res.data) ? res.data : null)
            .catch(() => null);
    }

    function deriveQuality(rd) {
        const list = rd.resolutionList;
        if (Array.isArray(list) && list.length) {
            const maxQ = list.reduce((m, v) => Math.max(m, parseQualityNumber(v)), 0);
            if (maxQ) return `${maxQ}p`;
        }
        // Strip codec tokens (h264/h265/x265/hevc) first so they are not
        // mistaken for a resolution, then only accept a number followed by "p".
        const probe = `${rd.resourceLink || ''} ${rd.downloadUrl || ''}`
            .replace(/[hx]\.?26[45]/gi, ' ')
            .replace(/hevc|avc/gi, ' ');
        const m = probe.match(/(\d{3,4})\s*p/i);
        return m ? `${parseInt(m[1], 10)}p` : 'Auto';
    }

    function streamsFromData(data, lang) {
        const out = [];
        if (!data) return out;
        const rds = data.resourceDetectors || [];
        const seen = {};
        rds.forEach(rd => {
            const url = rd.downloadUrl;
            if (!url || seen[url]) return;
            seen[url] = true;
            const quality = deriveQuality(rd);
            const formatType = getFormatType(url);
            const codec = rd.codecName ? ` ${String(rd.codecName).toUpperCase()}` : '';
            out.push({
                name: `MovieBox (${lang}) ${quality} [${formatType}]${codec}`,
                title: formatTitle(mediaTitle, season, episode, mediaType),
                url,
                quality,
                headers: {
                    "Referer": API_BASE,
                    "User-Agent": HEADERS['User-Agent']
                }
            });
        });
        return out;
    }

    function decodeMaybeUrl(value) {
        let v = String(value || '').replace(/\\u0026/g, '&').replace(/\\\//g, '/');
        try { v = decodeURIComponent(v); } catch (e) { }
        return v;
    }

    function extractVideoUrlsFromHtml(html, pageUrl) {
        const out = [];
        const seen = {};
        const decoded = decodeMaybeUrl(html || '');
        const patterns = [
            /https?:\/\/[^"'<>\\\s]+?\.(?:mp4|mkv|m3u8)(?:\?[^"'<>\\\s]*)?/ig,
            /(?:href|src|data-src|data-url)=["']([^"']+\.(?:mp4|mkv|m3u8)(?:\?[^"']*)?)["']/ig,
            /(?:file|url|source)\s*[:=]\s*["']([^"']+\.(?:mp4|mkv|m3u8)(?:\?[^"']*)?)["']/ig
        ];
        patterns.forEach(re => {
            let m;
            while ((m = re.exec(decoded)) !== null) {
                let u = decodeMaybeUrl(m[1] || m[0]);
                try { u = new URL(u, pageUrl).toString(); } catch (e) { }
                if (!/^https?:\/\//i.test(u) || seen[u]) continue;
                seen[u] = true;
                out.push(u);
            }
        });
        return out;
    }

    function streamsFromPlayInfo(playSubjectId, lang, bearer) {
        const playUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/play-info?subjectId=${playSubjectId}&se=${season}&ep=${episode}`;
        return request('GET', playUrl, null, {}, { stream: true, bearer: bearer }).then(playRes => {
            const streams = [];
            const n = playRes && playRes.data && playRes.data.streams ? playRes.data.streams.length : 0;
            if (!playRes || !playRes.data || !Array.isArray(playRes.data.streams)) {
                return streams;
            }
            const tasks = playRes.data.streams.map(stream => {
                if (!stream.url) return Promise.resolve(null);
                const qualityField = stream.resolutions || stream.quality || 'Auto';
                let candidates = Array.isArray(qualityField) ? qualityField
                    : (typeof qualityField === 'string' && qualityField.includes(','))
                        ? qualityField.split(',').map(s => s.trim()).filter(Boolean)
                        : [qualityField];
                const maxQ = candidates.reduce((m, v) => Math.max(m, parseQualityNumber(v)), 0);
                const quality = maxQ ? `${maxQ}p` : formatQualityLabel(candidates[0]);
                const streamId = stream.id || `${playSubjectId}|${season}|${episode}`;
                const langLabel = String(lang || 'Original').replace(/dub/gi, 'Audio');
                const entry = {
                    name: `MovieBox (${langLabel}) ${quality} [${getFormatType(stream.url)}]`,
                    title: formatTitle(mediaTitle, season, episode, mediaType),
                    url: stream.url,
                    quality,
                    headers: {
                        Referer: API_BASE,
                        'User-Agent': STREAM_HEADERS['User-Agent'],
                        ...(stream.signCookie ? { Cookie: stream.signCookie } : {})
                    }
                };
                return fetchStreamCaptions(playSubjectId, streamId, bearer).then(caps => {
                    if (caps.length) entry.subtitles = caps;
                    return entry;
                });
            });
            return Promise.all(tasks).then(items => items.filter(Boolean));
        });
    }

    function loadTvStreamsViaPlayInfo(mainData, subjectId) {
        return fetchStreamBearer(subjectId).then(bearer => {
            if (!bearer) return [];
            const variants = [{ id: subjectId, lang: 'Original' }];
            const dubs = mainData && mainData.dubs;
            if (Array.isArray(dubs)) {
                dubs.forEach(dub => {
                    if (dub.subjectId && dub.subjectId != subjectId) {
                        variants.push({ id: dub.subjectId, lang: dub.lanName || 'Dub' });
                    }
                });
            }
            return Promise.all(
                variants.slice(0, 8).map(v => streamsFromPlayInfo(v.id, v.lang, bearer))
            ).then(chunks => chunks.reduce((a, b) => a.concat(b), []));
        });
    }

    function streamsFromResourceLinks(data, lang) {
        const rds = data && data.resourceDetectors ? data.resourceDetectors : [];
        const tasks = [];
        const seenPages = {};
        rds.forEach(rd => {
            const page = rd.resourceLink;
            if (!page || rd.downloadUrl || seenPages[page]) return;
            seenPages[page] = true;
            tasks.push(fetch(page, {
                headers: {
                    "User-Agent": HEADERS['User-Agent'],
                    "Referer": API_BASE
                }
            })
                .then(res => res.ok ? res.text() : '')
                .then(html => extractVideoUrlsFromHtml(html, page).map(url => ({
                    name: `MovieBox (${lang}) ${deriveQuality(Object.assign({}, rd, { downloadUrl: url }))} [${getFormatType(url)}]`,
                    title: formatTitle(mediaTitle, season, episode, mediaType),
                    url,
                    quality: deriveQuality(Object.assign({}, rd, { downloadUrl: url })),
                    headers: {
                        "Referer": page,
                        "User-Agent": HEADERS['User-Agent']
                    }
                })))
                .catch(() => []));
        });
        return Promise.all(tasks).then(chunks => chunks.reduce((a, b) => a.concat(b), []));
    }

    return request('GET', subjectUrl).then(subjectRes => {
        if (!subjectRes || !subjectRes.data) return [];
        const mainData = subjectRes.data;

        // Build language variant list from dubs (cap to keep request count sane).
        const variants = [];
        const dubs = mainData.dubs;
        if (Array.isArray(dubs)) {
            dubs.forEach(dub => {
                if (dub.subjectId && dub.subjectId != subjectId) {
                    variants.push({ id: dub.subjectId, lang: dub.lanName || 'Dub' });
                }
            });
        }
        const cappedVariants = variants.slice(0, 8);

        // Main subject: for movies we already have data; for TV re-fetch with se/ep
        // so resourceDetectors point at the requested episode.
        const mainPromise = isTv ? getSubjectData(subjectId) : Promise.resolve(mainData);

        return mainPromise.then(mainEpData => {
            if (isTv) {
                return loadTvStreamsViaPlayInfo(mainData, subjectId).then(playStreams => {
                    if (playStreams.length > 0) {
                        playStreams.sort((a, b) => {
                            const qa = parseQualityNumber(a.quality);
                            const qb = parseQualityNumber(b.quality);
                            if (qb !== qa) return qb - qa;
                            return urlTypeRank(b.url) - urlTypeRank(a.url);
                        });
                        return playStreams;
                    }
                    return collectLegacyTvStreams(mainEpData, mainData, cappedVariants);
                });
            }
            return collectLegacyTvStreams(mainEpData, mainData, cappedVariants);
        }).then(flat => {
            if (!Array.isArray(flat)) return flat;
            flat.sort((a, b) => {
                const qa = parseQualityNumber(a.quality);
                const qb = parseQualityNumber(b.quality);
                if (qb !== qa) return qb - qa;
                return urlTypeRank(b.url) - urlTypeRank(a.url);
            });
            return flat;
        });
    });

    function collectLegacyTvStreams(mainEpData, mainData, variantList) {
            const collected = [streamsFromData(mainEpData || mainData, 'Original')];
            const dubPromises = (variantList || []).map(v =>
                getSubjectData(v.id).then(d => streamsFromData(d, v.lang))
            );
            return Promise.all(dubPromises).then(dubStreams => {
                let flat = collected.concat(dubStreams).reduce((a, b) => a.concat(b), []);

                if (flat.length === 0 && isTv) {
                    const resourceTasks = [streamsFromResourceLinks(mainEpData || mainData, 'Original')].concat(
                        (variantList || []).map(v => getSubjectData(v.id).then(d => streamsFromResourceLinks(d, v.lang)))
                    );
                    return Promise.all(resourceTasks).then(resourceStreams => {
                        flat = resourceStreams.reduce((a, b) => a.concat(b), []);
                        if (flat.length > 0) return flat;
                        const playUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/play-info?subjectId=${subjectId}&se=${season}&ep=${episode}`;
                        return request('GET', playUrl).then(playRes => {
                            const streams = [];
                            if (playRes && playRes.data && playRes.data.streams) {
                                playRes.data.streams.forEach(stream => {
                                    if (!stream.url) return;
                                    const qualityField = stream.resolutions || stream.quality || 'Auto';
                                    let candidates = Array.isArray(qualityField) ? qualityField
                                        : (typeof qualityField === 'string' && qualityField.includes(',')) ? qualityField.split(',').map(s => s.trim()).filter(Boolean)
                                        : [qualityField];
                                    const maxQ = candidates.reduce((m, v) => Math.max(m, parseQualityNumber(v)), 0);
                                    const quality = maxQ ? `${maxQ}p` : formatQualityLabel(candidates[0]);
                                    streams.push({
                                        name: `MovieBox (Original) ${quality} [${getFormatType(stream.url)}]`,
                                        title: formatTitle(mediaTitle, season, episode, mediaType),
                                        url: stream.url,
                                        quality,
                                        headers: {
                                            "Referer": API_BASE,
                                            "User-Agent": HEADERS['User-Agent'],
                                            ...(stream.signCookie ? { "Cookie": stream.signCookie } : {})
                                        }
                                    });
                                });
                            }
                            return streams;
                        });
                    });
                }

                // Fallback: if nothing resolved, try the legacy play-info endpoint.
                if (flat.length === 0) {
                    const playUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/play-info?subjectId=${subjectId}&se=${season}&ep=${episode}`;
                    return request('GET', playUrl).then(playRes => {
                        const streams = [];
                        if (playRes && playRes.data && playRes.data.streams) {
                            playRes.data.streams.forEach(stream => {
                                if (!stream.url) return;
                                const qualityField = stream.resolutions || stream.quality || 'Auto';
                                let candidates = Array.isArray(qualityField) ? qualityField
                                    : (typeof qualityField === 'string' && qualityField.includes(',')) ? qualityField.split(',').map(s => s.trim()).filter(Boolean)
                                    : [qualityField];
                                const maxQ = candidates.reduce((m, v) => Math.max(m, parseQualityNumber(v)), 0);
                                const quality = maxQ ? `${maxQ}p` : formatQualityLabel(candidates[0]);
                                streams.push({
                                    name: `MovieBox (Original) ${quality} [${getFormatType(stream.url)}]`,
                                    title: formatTitle(mediaTitle, season, episode, mediaType),
                                    url: stream.url,
                                    quality,
                                    headers: {
                                        "Referer": API_BASE,
                                        "User-Agent": HEADERS['User-Agent'],
                                        ...(stream.signCookie ? { "Cookie": stream.signCookie } : {})
                                    }
                                });
                            });
                        }
                        return streams;
                    });
                }
                return flat;
            });
    }
}

function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    return fetchTmdbDetails(tmdbId, mediaType).then(details => {
        if (!details) return [];

        return searchMovieBoxMany(buildSearchTerms(details, mediaType, seasonNum)).then(subjects => {
            if (mediaType === 'tv') {
                return rankTvSubjects(subjects, details.title, details.year, seasonNum, episodeNum)
                    .then(ranked => {
                        if (!ranked.length) {
                            return rankTvSubjects(subjects, details.originalTitle, details.year, seasonNum, episodeNum)
                                .then(r2 => r2.length ? r2 : rankTvSubjects(subjects, details.originalName, details.year, seasonNum, episodeNum));
                        }
                        return ranked;
                    })
                    .then(ranked => tryTvSubjectsForStreams(ranked, details.title, seasonNum, episodeNum));
            }

            let bestMatch = findBestMatch(subjects, details.title, details.year, mediaType, seasonNum)
                || findBestMatch(subjects, details.originalTitle, details.year, mediaType, seasonNum)
                || findBestMatch(subjects, details.originalName, details.year, mediaType, seasonNum);
            if (bestMatch) {
                return getStreamLinks(bestMatch.subjectId, 0, 0, details.title, mediaType);
            }
            return [];
        });
    });
}

function tryTvSubjectsForStreams(rankedSubjects, mediaTitle, seasonNum, episodeNum) {
    if (!rankedSubjects.length) return Promise.resolve([]);

    function attempt(index) {
        if (index >= rankedSubjects.length) return Promise.resolve([]);
        const subject = rankedSubjects[index];
        const sid = subject.subjectId || subject.id;
        return getStreamLinks(sid, seasonNum, episodeNum, mediaTitle, 'tv').then(streams => {
            if (streams && streams.length) return streams;
            return attempt(index + 1);
        });
    }

    return attempt(0);
}

module.exports = { getStreams };
