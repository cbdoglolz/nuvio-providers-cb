/* __CB_REPO_NUVIO_PATCHED__ */
var __cbNativeFetch = typeof fetch === 'function' ? fetch : null;
var __cbKnownMeta = {
  movie: {
    '550': {
      id: 550,
      imdb_id: 'tt0137523',
      title: 'Fight Club',
      original_title: 'Fight Club',
      release_date: '1999-10-15',
      external_ids: { imdb_id: 'tt0137523' }
    }
  },
  tv: {
    '19885': {
      id: 19885,
      imdb_id: 'tt1475582',
      name: 'Sherlock',
      original_name: 'Sherlock',
      first_air_date: '2010-07-25',
      external_ids: { imdb_id: 'tt1475582' }
    },
    '65942': {
      id: 65942,
      imdb_id: 'tt5607616',
      name: 'Re:ZERO -Starting Life in Another World-',
      original_name: 'Re:ゼロから始める異世界生活',
      first_air_date: '2016-04-04',
      external_ids: { imdb_id: 'tt5607616' }
    }
  },
  imdb: {
    tt0137523: { movie: '550' },
    tt1475582: { tv: '19885' },
    tt5607616: { tv: '65942' },
    tt5607618: { tv: '65942' }
  }
};
var __cbRuntimeMeta = { movie: {}, tv: {}, imdb: {} };

function __cbMakeJsonResponse(data) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: function () { return null; } },
    json: function () { return Promise.resolve(data); },
    text: function () { return Promise.resolve(JSON.stringify(data)); }
  };
}

function __cbReadMetaValue(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (var i = 0; i < keys.length; i++) {
    if (obj[keys[i]] != null && obj[keys[i]] !== '') return obj[keys[i]];
  }
  return null;
}

function __cbBuildMetaFromInput(input, mediaType) {
  if (!input || typeof input !== 'object') return null;
  var type = __cbNormalizeMediaType(__cbReadMetaValue(input, ['mediaType', 'type', 'kind']) || mediaType);
  var title = __cbReadMetaValue(input, type === 'tv' ? ['name', 'title', 'originalName', 'originalTitle'] : ['title', 'name', 'originalTitle', 'originalName']);
  var year = __cbReadMetaValue(input, ['year', 'releaseYear']);
  var date = __cbReadMetaValue(input, type === 'tv' ? ['first_air_date', 'firstAirDate', 'releaseDate', 'released'] : ['release_date', 'releaseDate', 'released']);
  var imdbId = __cbReadMetaValue(input, ['imdbId', 'imdb_id', 'imdb']);
  var tmdbId = __cbReadMetaValue(input, ['tmdbId', 'tmdb_id', 'id', 'mediaId']);
  if (!date && year) date = String(year) + '-01-01';
  if (!title && !date && !imdbId) return null;
  var meta = type === 'tv'
    ? {
        id: tmdbId ? parseInt(tmdbId, 10) : undefined,
        imdb_id: imdbId || undefined,
        name: title || undefined,
        original_name: __cbReadMetaValue(input, ['originalName', 'original_name', 'originalTitle', 'original_title']) || title || undefined,
        first_air_date: date || undefined,
        external_ids: imdbId ? { imdb_id: imdbId } : {}
      }
    : {
        id: tmdbId ? parseInt(tmdbId, 10) : undefined,
        imdb_id: imdbId || undefined,
        title: title || undefined,
        original_title: __cbReadMetaValue(input, ['originalTitle', 'original_title', 'originalName', 'original_name']) || title || undefined,
        release_date: date || undefined,
        external_ids: imdbId ? { imdb_id: imdbId } : {}
      };
  return { type: type, tmdbId: tmdbId ? String(tmdbId).replace(/^tmdb:/i, '') : '', imdbId: imdbId, meta: meta };
}

function __cbRememberMeta(tmdbId, mediaType, meta, imdbId) {
  var type = __cbNormalizeMediaType(mediaType);
  if (!meta) return;
  var id = tmdbId ? String(tmdbId).replace(/^tmdb:/i, '') : (meta.id != null ? String(meta.id) : '');
  if (id) __cbRuntimeMeta[type][id] = meta;
  var imdb = imdbId || meta.imdb_id || (meta.external_ids && meta.external_ids.imdb_id);
  if (imdb) {
    if (!__cbRuntimeMeta.imdb[imdb]) __cbRuntimeMeta.imdb[imdb] = {};
    if (id) __cbRuntimeMeta.imdb[imdb][type] = id;
  }
}

function __cbKnownIdForImdb(imdbId, mediaType) {
  var known = __cbKnownMeta.imdb[imdbId] || __cbRuntimeMeta.imdb[imdbId];
  if (!known) return '';
  return known[mediaType] || known.movie || known.tv || '';
}

function __cbMetaFor(tmdbId, mediaType) {
  var type = __cbNormalizeMediaType(mediaType);
  var id = String(tmdbId == null ? '' : tmdbId).replace(/^tmdb:/i, '');
  return (__cbRuntimeMeta[type] && __cbRuntimeMeta[type][id]) ||
    (__cbKnownMeta[type] && __cbKnownMeta[type][id]) ||
    null;
}

function __cbInstallTmdbFallback() {
  if (!__cbNativeFetch || fetch.__cbRepoTmdbFallback) return;
  var wrapped = function (url, options) {
    var textUrl = String(url || '');
    var findMatch = textUrl.match(/api\.themoviedb\.org\/3\/find\/(tt\d+)/i);
    if (findMatch) {
      var imdbId = findMatch[1].toLowerCase();
      var movieId = __cbKnownIdForImdb(imdbId, 'movie');
      var tvId = __cbKnownIdForImdb(imdbId, 'tv');
      if (movieId || tvId) {
        return Promise.resolve(__cbMakeJsonResponse({
          movie_results: movieId ? [__cbMetaFor(movieId, 'movie')] : [],
          tv_results: tvId ? [__cbMetaFor(tvId, 'tv')] : []
        }));
      }
    }
    var detailMatch = textUrl.match(/api\.themoviedb\.org\/3\/(movie|tv)\/([^/?#]+)/i);
    if (detailMatch) {
      var type = detailMatch[1] === 'tv' ? 'tv' : 'movie';
      var id = decodeURIComponent(detailMatch[2]).replace(/^tmdb:/i, '');
      var meta = __cbMetaFor(id, type);
      if (meta) {
        return __cbNativeFetch(url, options).catch(function () {
          console.log('[cbrepo] TMDB fallback metadata for ' + type + ' ' + id);
          return __cbMakeJsonResponse(meta);
        });
      }
    }
    return __cbNativeFetch(url, options);
  };
  wrapped.__cbRepoTmdbFallback = true;
  fetch = wrapped;
}

function __cbNormalizeMediaType(mediaType) {
  var t = String(mediaType == null ? 'movie' : mediaType).toLowerCase().trim();
  if (t === 'series' || t === 'show' || t === 'tvseries') return 'tv';
  if (t === 'tv') return 'tv';
  return 'movie';
}

function __cbNormalizeSeasonEpisode(season, episode) {
  var s = season != null && season !== '' ? parseInt(season, 10) : null;
  var e = episode != null && episode !== '' ? parseInt(episode, 10) : null;
  if (isNaN(s)) s = null;
  if (isNaN(e)) e = null;
  return { season: s, episode: e };
}

function __cbCinemetaResolveImdb(imdbId, mediaType) {
  if (!__cbNativeFetch) return Promise.resolve('');
  var kind = mediaType === 'tv' ? 'series' : 'movie';
  var url = 'https://v3-cinemeta.strem.io/meta/' + kind + '/' + imdbId + '.json';
  return __cbNativeFetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    .then(function (res) {
      if (!res || !res.ok) return null;
      return res.json();
    })
    .then(function (data) {
      if (data && data.meta && data.meta.moviedb_id) {
        return String(data.meta.moviedb_id);
      }
      return '';
    })
    .catch(function () { return ''; });
}

function __cbResolveTmdbId(rawId, mediaType) {
  var id = String(rawId == null ? '' : rawId).trim();
  if (!id) return Promise.resolve('');
  if (/^tmdb:/i.test(id)) id = id.replace(/^tmdb:/i, '');
  if (/^tt\d+/i.test(id)) {
    id = id.toLowerCase();
    var knownId = __cbKnownIdForImdb(id, mediaType);
    if (knownId) return Promise.resolve(knownId);
    var tmdbKey = 'd131017ccc6e5462a81c9304d21476de';
    var findUrl = 'https://api.themoviedb.org/3/find/' + id +
      '?api_key=' + tmdbKey + '&external_source=imdb_id';
  return fetch(findUrl)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data) {
          if (mediaType === 'tv' && data.tv_results && data.tv_results[0]) {
            return String(data.tv_results[0].id);
          }
          if (data.movie_results && data.movie_results[0]) {
            return String(data.movie_results[0].id);
          }
          if (data.tv_results && data.tv_results[0]) {
            return String(data.tv_results[0].id);
          }
        }
        return __cbCinemetaResolveImdb(id, mediaType).then(function (cineId) {
          if (cineId) {
            console.log('[cbrepo] Cinemeta resolved IMDb ' + id + ' -> TMDB ' + cineId);
            return cineId;
          }
          var fallbackId = __cbKnownIdForImdb(id, mediaType);
          if (fallbackId) {
            console.log('[cbrepo] Using built-in IMDb map ' + id + ' -> TMDB ' + fallbackId);
            return fallbackId;
          }
          console.log('[cbrepo] TMDB find failed for IMDb ' + id);
          return '';
        });
      })
      .catch(function () {
        var fallbackId = __cbKnownIdForImdb(id, mediaType);
        if (fallbackId) {
          console.log('[cbrepo] TMDB find network failed for IMDb ' + id + ', using built-in mapping ' + fallbackId);
          return fallbackId;
        }
        return __cbCinemetaResolveImdb(id, mediaType);
      });
  }
  return Promise.resolve(id);
}

function __cbEnsureStreamsArray(result) {
  if (Array.isArray(result)) return result;
  return [];
}

function __cbRepoEntry(coreFn, providerId, tmdbId, mediaType, season, episode) {
  __cbInstallTmdbFallback();
  var objectMeta = __cbBuildMetaFromInput(tmdbId, mediaType);
  var rawId = objectMeta && (objectMeta.tmdbId || objectMeta.imdbId) ? (objectMeta.tmdbId || objectMeta.imdbId) : tmdbId;
  var type = __cbNormalizeMediaType(objectMeta ? objectMeta.type : mediaType);
  var se = __cbNormalizeSeasonEpisode(
    objectMeta && tmdbId && typeof tmdbId === 'object' ? __cbReadMetaValue(tmdbId, ['season', 'seasonNum']) || season : season,
    objectMeta && tmdbId && typeof tmdbId === 'object' ? __cbReadMetaValue(tmdbId, ['episode', 'episodeNum']) || episode : episode
  );
  if (objectMeta) {
    __cbRememberMeta(objectMeta.tmdbId, type, objectMeta.meta, objectMeta.imdbId);
  }
  console.log('[cbrepo:' + providerId + '] getStreams id=' + rawId + ' type=' + type +
    (type === 'tv' ? ' S' + se.season + 'E' + se.episode : ''));

  return __cbResolveTmdbId(rawId, type).then(function (resolvedId) {
    if (!resolvedId) {
      console.log('[cbrepo:' + providerId + '] No valid TMDB id after normalize');
      return [];
    }
    if (objectMeta) __cbRememberMeta(resolvedId, type, objectMeta.meta, objectMeta.imdbId);
    var out;
    try {
      out = coreFn(resolvedId, type, se.season, se.episode);
    } catch (err) {
      console.log('[cbrepo:' + providerId + '] sync error: ' + (err && err.message ? err.message : String(err)));
      return [];
    }
    if (!out || typeof out.then !== 'function') {
      var arr = __cbEnsureStreamsArray(out);
      console.log('[cbrepo:' + providerId + '] returned ' + arr.length + ' stream(s) (sync)');
      return arr;
    }
    return out.then(function (streams) {
      var arr = __cbEnsureStreamsArray(streams);
      console.log('[cbrepo:' + providerId + '] returned ' + arr.length + ' stream(s)');
      return arr;
    }).catch(function (err) {
      console.log('[cbrepo:' + providerId + '] async error: ' + (err && err.message ? err.message : String(err)));
      return [];
    });
  });
}

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
const RATE_LIMIT_RE = /too\s*many\s*requests|short\s*period\s*of\s*time|rate\s*limit|access\s*limit|try\s*again\s*later|please\s*wait|temporarily\s*unavailable|exceeded/i;
const PLACEHOLDER_M3U8_RE = /too\s*many|rate\s*limit|access\s*limit|try\s*again|warning|placeholder|unavailable/i;
const NEWTV_API_BASES = ["https://net52.cc", "https://net50.cc", "https://net22.cc"];

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
    const s = String(url || "");
    return RATE_LIMIT_RE.test(s) || PLACEHOLDER_M3U8_RE.test(s);
}

function isPlaceholderM3u8Playlist(text) {
    if (!text || !text.includes("#EXTM3U")) return false;
    if (PLACEHOLDER_M3U8_RE.test(text) || RATE_LIMIT_RE.test(text)) return true;

    const durations = [];
    const re = /#EXTINF:([0-9.]+)/g;
    let match;
    while ((match = re.exec(text)) !== null) {
        durations.push(parseFloat(match[1]) || 0);
        if (durations.length > 400) break;
    }
    if (!durations.length) return false;
    const total = durations.reduce((sum, n) => sum + n, 0);
    const maxSeg = Math.max.apply(null, durations);
    // NetMirror rate-limit clip is ~10 minutes, usually a handful of short segments.
    if (total >= 480 && total <= 720 && durations.length < 120) return true;
    if (durations.length <= 4 && maxSeg >= 480 && maxSeg <= 720) return true;
    return false;
}

function validatePlayableUrl(url, headers) {
    const lower = String(url || "").toLowerCase();
    if (!url || isLikelyRateLimitUrl(url)) return Promise.resolve(false);
    if (!lower.includes(".m3u8")) return Promise.resolve(true);

    return requestText(url, headers).then(text => {
        if (!text || !text.includes("#EXTM3U")) {
            console.log("[CNCVerse] Rejecting stream: m3u8 prefetch failed or invalid");
            return false;
        }
        if (isPlaceholderM3u8Playlist(text)) {
            console.log("[CNCVerse] Rejecting stream: rate-limit placeholder playlist");
            return false;
        }
        return true;
    });
}

function isRateLimitPlayerResponse(response) {
    if (!response) return true;
    if (String(response.status || "").toLowerCase() !== "ok") return true;
    const blob = JSON.stringify(response);
    if (RATE_LIMIT_RE.test(blob) && !response.video_link && !response.url && !response.file) return true;
    return false;
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

function newTvHeaders(base, platform, referer) {
    return Object.assign({}, BASE_HEADERS, {
        "Accept": "application/json,text/plain,*/*",
        "Origin": base,
        "Referer": referer || `${base}/home`,
        "Cookie": `hd=on; ott=${platform.ott}`,
        "Usertoken": ""
    });
}

function newTvPlaybackHeaders(base, referer) {
    return {
        "Referer": referer || `${base}/home`,
        "Origin": base,
        "User-Agent": BASE_HEADERS["User-Agent"]
    };
}

function apiBasesFor(base) {
    const out = [];
    addUnique(out, base);
    NEWTV_API_BASES.forEach(apiBase => addUnique(out, apiBase));
    return out;
}

function fetchNewTvPlayer(base, platformKey, targetId, title) {
    const platform = PLATFORM_MAP[platformKey];
    const bases = apiBasesFor(base);
    function tryBase(index) {
        if (index >= bases.length) return Promise.resolve([]);
        const apiBase = bases[index];
        const url = `${apiBase}/newtv/player.php?id=${encodeURIComponent(targetId)}`;
        const headers = newTvHeaders(apiBase, platform, `${base}/home`);
        return requestJson(url, headers).then(response => {
            const videoUrl = response && (response.video_link || response.url || response.file);
            if (!response || isRateLimitPlayerResponse(response) || !videoUrl || isLikelyRateLimitUrl(videoUrl)) {
                if (videoUrl && isLikelyRateLimitUrl(videoUrl)) {
                    console.log("[CNCVerse] player.php returned rate-limit URL");
                }
                return tryBase(index + 1);
            }
            const referer = response.referer || `${apiBase}/home`;
            const playbackHeaders = newTvPlaybackHeaders(apiBase, referer);
            const stream = {
                name: `CNCVerse ${platform.label} Auto`,
                title: `${title} Auto`,
                url: absolutize(apiBase, videoUrl),
                quality: "Auto",
                type: "direct",
                provider: "cncverse",
                headers: playbackHeaders
            };
            return validatePlayableUrl(stream.url, playbackHeaders).then(ok => {
                if (!ok) {
                    console.log("[CNCVerse] Rejecting player stream after m3u8 validation");
                    return tryBase(index + 1);
                }
                return [stream];
            });
        }).catch(() => tryBase(index + 1));
    }
    return tryBase(0);
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
                        return fetchNewTvPlayer(base, platformKey, targetEp.id, info.title);
                    });
                }
                return fetchNewTvPlayer(base, platformKey, targetId, info.title);
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

(function __cbWrapExport() {
  var __cbCoreGetStreams = getStreams;
  getStreams = function (tmdbId, mediaType, season, episode) {
    return __cbRepoEntry(__cbCoreGetStreams, 'cncverse', tmdbId, mediaType, season, episode);
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
  }
  if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
  }
})();
