"use strict";
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



var CryptoJS = require("crypto-js");

var MAIN_URL = "https://kaa.lt";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var VID_KEY = "e13d38099bf562e8b9851a652d2043d3";
var sessionCookie = null;
var apiHost = MAIN_URL + "/";

function normalizeTitle(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function httpsify(url) {
  if (!url) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http")) return url;
  return "https://" + url.replace(/^\/+/, "");
}

function getBaseUrl(url) {
  try {
    var u = new URL(url);
    return u.protocol + "//" + u.host;
  } catch (e) {
    return MAIN_URL;
  }
}

function decodeHex(hex) {
  if (!hex || hex.length % 2 !== 0) return "";
  var out = "";
  for (var i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return out;
}

function sha1(value) {
  return CryptoJS.SHA1(value).toString(CryptoJS.enc.Hex);
}

function decryptAesPayload(encryptedData, ivHex) {
  var key = CryptoJS.enc.Utf8.parse(VID_KEY);
  var iv = CryptoJS.enc.Hex.parse(ivHex);
  var decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  var text = decrypted.toString(CryptoJS.enc.Utf8);
  return text ? JSON.parse(text) : null;
}

function unescapeHtml(str) {
  return String(str || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isCloudflareBody(text) {
  var t = String(text || "").trim();
  return t.startsWith("<!DOCTYPE") || t.indexOf("Just a moment") >= 0 || t.indexOf("cf-browser-verification") >= 0;
}

function mergeSolvedHeaders(headers, solved) {
  if (!solved) return headers;
  var out = Object.assign({}, headers);
  if (solved.Cookie) out.Cookie = solved.Cookie;
  else if (solved.cookie) out.Cookie = solved.cookie;
  else if (solved.cookies) out.Cookie = solved.cookies;
  if (solved["User-Agent"]) out["User-Agent"] = solved["User-Agent"];
  else if (solved.userAgent) out["User-Agent"] = solved.userAgent;
  if (solved.headers && typeof solved.headers === "object") {
    Object.assign(out, solved.headers);
  }
  return out;
}

function apiBase() {
  var h = apiHost || MAIN_URL + "/";
  return h.endsWith("/") ? h.slice(0, -1) : h;
}

function apiHeaders(extra) {
  var origin = apiBase();
  return Object.assign({
    "Accept": "*/*",
    "User-Agent": UA,
    "Referer": origin + "/",
    "Origin": origin,
    "Content-Type": "application/json",
    "x-origin": "kickass-anime.ru"
  }, extra || {}, sessionCookie ? { Cookie: sessionCookie } : {});
}

function fetchTextWithCf(url, options) {
  options = options || {};
  var headers = apiHeaders(options.headers);

  function doFetch(h) {
    return fetch(url, Object.assign({}, options, { headers: h })).then(function (res) {
      return res.text().then(function (text) {
        var blocked = res.status === 403 || res.status === 503 || isCloudflareBody(text);
        if (blocked && typeof Cloudflare !== "undefined" && Cloudflare.solve) {
          console.log("[KickassAnime] Cloudflare on " + url);
          return Cloudflare.solve(url).then(function (solved) {
            var retryHeaders = mergeSolvedHeaders(h, solved);
            if (retryHeaders.Cookie) sessionCookie = retryHeaders.Cookie;
            return fetch(url, Object.assign({}, options, { headers: retryHeaders })).then(function (res2) {
              return res2.text().then(function (text2) {
                if (!res2.ok && isCloudflareBody(text2)) {
                  throw new Error("Cloudflare still blocking " + url);
                }
                if (!res2.ok) throw new Error("HTTP " + res2.status + " for " + url);
                return text2;
              });
            });
          });
        }
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
        if (isCloudflareBody(text)) throw new Error("Cloudflare HTML for " + url);
        return text;
      });
    });
  }

  return doFetch(headers);
}

function fetchJsonApi(url, options) {
  return fetchTextWithCf(url, options).then(function (text) {
    return JSON.parse(text);
  });
}

function warmSession() {
  return fetchTextWithCf(apiBase() + "/", { method: "GET", headers: { Accept: "text/html,*/*" } }).catch(function () {
    return "";
  });
}

function resolveApiHost() {
  return fetch(MAIN_URL, { method: "GET", redirect: "manual", headers: { "User-Agent": UA } }).then(function (res) {
    var loc = res.headers.get("location");
    if (loc) {
      if (!loc.startsWith("http")) {
        loc = MAIN_URL + (loc.startsWith("/") ? loc : "/" + loc);
      }
      if (!loc.endsWith("/")) loc += "/";
      apiHost = loc;
      console.log("[KickassAnime] API host: " + apiHost);
    }
    return warmSession();
  }).catch(function () {
    return warmSession();
  }).then(function () {
    return apiHost;
  });
}

function getTmdbDetails(tmdbId, mediaType) {
  var type = mediaType === "tv" ? "tv" : "movie";
  var url = "https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&append_to_response=external_ids";
  return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
    var date = d.release_date || d.first_air_date || "";
    var year = date ? parseInt(String(date).substring(0, 4), 10) : null;
    return {
      title: d.title || d.name || "",
      originalTitle: d.original_title || d.original_name || "",
      imdbId: d.external_ids && d.external_ids.imdb_id,
      year: year
    };
  }).catch(function () {
    return { title: "", originalTitle: "", imdbId: null, year: null };
  });
}

function getMalTitles(imdbId, season, episode) {
  if (!imdbId) return Promise.resolve([]);
  var mapUrl = "https://id-mapping-api-malid.hf.space/api/resolve?id=" + imdbId + "&s=" + season + "&e=" + episode;
  return fetch(mapUrl).then(function (r) { return r.ok ? r.json() : null; }).then(function (map) {
    if (!map || !map.mal_id) return [];
    return fetch("https://api.jikan.moe/v4/anime/" + map.mal_id).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (j) {
      if (!j || !j.data) return [];
      var d = j.data;
      var out = [];
      if (d.title) out.push(d.title);
      if (d.title_english) out.push(d.title_english);
      if (d.title_japanese) out.push(d.title_japanese);
      return out;
    });
  }).catch(function () {
    return [];
  });
}

function buildSearchQueries(info, malTitles, season) {
  var out = [];
  var seen = {};
  var year = info.year;
  function add(q) {
    q = String(q || "").replace(/\s+/g, " ").trim();
    if (!q || q.length < 2 || seen[q.toLowerCase()]) return;
    seen[q.toLowerCase()] = true;
    out.push(q);
  }

  function expandTitle(base) {
    if (!base) return;
    add(base);
    if (year) add(base + " " + year);
    add(base.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim());
    add(base.replace(/[:._-]+/g, " ").trim());
    add(base.replace(/\s+/g, ""));
    if (base.indexOf(":") >= 0) {
      var parts = base.split(/[:：]/);
      add(parts[0].trim());
      add(parts.slice(1).join(" ").trim());
      if (year) add(parts[0].trim() + " " + year);
    }
    if (base.indexOf("-") >= 0) {
      add(base.split("-")[0].trim());
    }
    if (season && parseInt(season, 10) > 1) {
      var short = base.indexOf(":") >= 0 ? base.split(/[:：]/)[0].trim() : base.split(/[-–]/)[0].trim();
      add(base.replace(/[:._-]+/g, " ").trim() + " Season " + season);
      add(short + " Season " + season);
    }
  }

  expandTitle(info.title);
  expandTitle(info.originalTitle);
  malTitles.forEach(expandTitle);

  return out;
}

function searchAnime(query, page) {
  page = page || "1";
  var body = JSON.stringify({ page: String(page), query: query });
  return fetchJsonApi(apiBase() + "/api/fsearch", {
    method: "POST",
    body: body
  }).then(function (data) {
    return data && data.result ? data.result : [];
  });
}

function searchAnimePaged(query, maxPage) {
  maxPage = maxPage || 2;
  var page = 1;
  function next() {
    return searchAnime(query, String(page)).then(function (results) {
      if (results && results.length) return results;
      if (page >= maxPage) return [];
      page += 1;
      return next();
    });
  }
  return next();
}

function searchWithQueries(queries) {
  var idx = 0;
  function next() {
    if (idx >= queries.length) return Promise.resolve([]);
    var q = queries[idx++];
    console.log("[KickassAnime] Search: " + q);
    return searchAnimePaged(q, 2).then(function (results) {
      if (results && results.length) {
        console.log("[KickassAnime] Hit " + results.length + " for \"" + q + "\"");
        return results;
      }
      return next();
    }).catch(function (e) {
      console.log("[KickassAnime] Search failed for \"" + q + "\": " + e.message);
      return next();
    });
  }
  return next();
}

function resultSlug(r) {
  if (r.slug) return r.slug.startsWith("/") ? r.slug : "/" + r.slug;
  if (r.watch_uri) {
    try {
      var u = new URL(r.watch_uri, MAIN_URL);
      return u.pathname;
    } catch (e) { }
  }
  return null;
}

function pickBestResult(results, info, season) {
  if (!results || !results.length) return null;
  var want = normalizeTitle(info.title);
  var wantOrig = normalizeTitle(info.originalTitle);
  var wantShort = want.split(" ").slice(0, 3).join(" ");
  var seasonNum = parseInt(season, 10) || 1;
  var best = null;
  var bestScore = -1;

  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var title = r.title_en || r.title || "";
    var norm = normalizeTitle(title);
    var score = 0;
    if (!norm) continue;
    if (norm === want || norm === wantOrig) score = 1;
    else if (want && (norm.indexOf(want) >= 0 || want.indexOf(norm) >= 0)) score = 0.85;
    else if (wantOrig && (norm.indexOf(wantOrig) >= 0 || wantOrig.indexOf(norm) >= 0)) score = 0.8;
    else if (wantShort && norm.indexOf(wantShort) >= 0) score = 0.65;
    else {
      var wantWords = want.split(/\s+/).filter(function (w) { return w.length > 2; });
      var hits = wantWords.filter(function (w) { return norm.indexOf(w) >= 0; }).length;
      if (wantWords.length) score = hits / wantWords.length * 0.6;
    }
    if (seasonNum > 1 && /season\s*0*(\d+)/i.test(title)) {
      var sm = title.match(/season\s*0*(\d+)/i);
      if (sm && parseInt(sm[1], 10) === seasonNum) score += 0.2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  if (best && bestScore >= 0.25) return best;
  console.log("[KickassAnime] Weak match, using first hit: " + (results[0].title_en || results[0].title));
  return results[0];
}

function listEpisodes(showPath, epNum) {
  var page = 1;
  var collected = [];

  function loadPage() {
    var url = apiBase() + "/api/show" + showPath + "/episodes?ep=" + page + "&lang=ja-JP";
    return fetchJsonApi(url).then(function (epData) {
      var eps = epData && epData.result ? epData.result : [];
      if (!eps.length) return collected;
      for (var i = 0; i < eps.length; i++) collected.push(eps[i]);
      var found = false;
      for (var j = 0; j < eps.length; j++) {
        if (Math.floor(Number(eps[j].episode_number)) === epNum) {
          found = true;
          break;
        }
      }
      if (found || eps.length < 15 || page >= 8) return collected;
      page += 1;
      return loadPage();
    });
  }

  return loadPage();
}

function getSignature(html, serverName, query) {
  var order = serverName.indexOf("Bird") >= 0
    ? ["IP", "USERAGENT", "ROUTE", "MID", "KEY"]
    : ["IP", "USERAGENT", "ROUTE", "MID", "TIMESTAMP", "KEY"];
  var cidMatch = html.match(/cid:\s*['"]([0-9a-fA-F]+)['"]/);
  if (!cidMatch) return null;
  var cidParts = decodeHex(cidMatch[1]).split("|");
  if (cidParts.length < 2) return null;
  var timeStamp = String(Math.floor(Date.now() / 1000) + 60);
  var route = cidParts[1].replace("player.php", "source.php");
  var signature = "";
  for (var i = 0; i < order.length; i++) {
    switch (order[i]) {
      case "IP": signature += cidParts[0]; break;
      case "USERAGENT": signature += UA; break;
      case "ROUTE": signature += route; break;
      case "MID": signature += query; break;
      case "TIMESTAMP": signature += timeStamp; break;
      case "KEY": signature += VID_KEY; break;
    }
  }
  return { sig: sha1(signature), timeStamp: timeStamp, route: route };
}

function extractCatOrBirdStream(html, serverSrc, serverLabel) {
  var match = html.match(/props="(.*?)"/);
  if (!match) return null;
  var jsonText = unescapeHtml(match[1]);
  var data = JSON.parse(jsonText);
  var manifest = data.manifest;
  var videoUrl = httpsify("https:" + manifest[1]);
  var base = getBaseUrl(serverSrc);
  return {
    name: "KickassAnime | " + serverLabel,
    title: serverLabel,
    url: videoUrl,
    quality: "1080p",
    headers: { Origin: base, Referer: serverSrc, "User-Agent": UA },
    provider: "kickassanime"
  };
}

function extractVidStreaming(server, streams) {
  var host = getBaseUrl(server.src);
  var query = server.src.split("?id=")[1].split("&")[0];
  return fetchTextWithCf(server.src, { headers: { "User-Agent": UA, Referer: server.src } }).then(function (html) {
    var direct = html.match(/(https?:)?\/\/[^\s"'<>]+\.m3u8/i);
    if (direct) {
      streams.push({
        name: "KickassAnime | VidStreaming",
        title: "VidStreaming",
        url: httpsify(direct[0]),
        quality: "1080p",
        headers: { Accept: "*/*", Origin: host, Referer: server.src, "User-Agent": UA },
        provider: "kickassanime"
      });
      return;
    }
    var sigInfo = getSignature(html, server.name, query);
    if (!sigInfo) return;
    var sourceUrl = host + sigInfo.route + "?id=" + query + "&e=" + sigInfo.timeStamp + "&s=" + sigInfo.sig;
    return fetchJsonApi(sourceUrl, { headers: { "User-Agent": UA, Referer: server.src } }).then(function (payload) {
      var raw = payload && payload.data ? payload.data : "";
      var inner = raw.substring(raw.indexOf(':"') + 2, raw.lastIndexOf('"')).replace(/\\/g, "");
      var parts = inner.split(":");
      if (parts.length < 2) return;
      var decrypted = decryptAesPayload(parts[0], parts[1]);
      if (!decrypted || !decrypted.hls) return;
      streams.push({
        name: "KickassAnime | VidStreaming",
        title: "VidStreaming",
        url: httpsify(decrypted.hls),
        quality: "1080p",
        headers: { Accept: "*/*", Origin: host, Referer: server.src, "User-Agent": UA },
        provider: "kickassanime"
      });
    });
  });
}

function extractServerStreams(server) {
  var streams = [];
  var name = server.name || "";
  if (name.indexOf("VidStreaming") >= 0 || name.indexOf("DuckStream") >= 0) {
    return extractVidStreaming(server, streams).then(function () { return streams; });
  }
  if (name.indexOf("CatStream") >= 0 || name.indexOf("BirdStream") >= 0) {
    var base = getBaseUrl(server.src);
    return fetchTextWithCf(server.src, {
      headers: { Origin: base, Referer: server.src, "User-Agent": UA }
    }).then(function (html) {
      var stream = extractCatOrBirdStream(html, server.src, name);
      if (stream) streams.push(stream);
      return streams;
    });
  }
  return Promise.resolve(streams);
}

function getStreams(tmdbId, mediaType, season, episode) {
  console.log("[KickassAnime] TMDB " + tmdbId + " " + mediaType + " S" + season + "E" + episode);
  if (mediaType !== "tv" && mediaType !== "movie") return Promise.resolve([]);

  var seasonNum = parseInt(season, 10) || 1;
  var epNum = parseInt(episode, 10) || 1;

  return resolveApiHost().then(function () {
    return getTmdbDetails(tmdbId, mediaType);
  }).then(function (info) {
    if (!info.title && !info.originalTitle) {
      console.log("[KickassAnime] No TMDB title");
      return [];
    }
    console.log("[KickassAnime] TMDB title: \"" + info.title + "\"");
    return getMalTitles(info.imdbId, seasonNum, epNum).then(function (malTitles) {
      var queries = buildSearchQueries(info, malTitles, mediaType === "tv" ? seasonNum : 0);
      return searchWithQueries(queries).then(function (results) {
        var match = pickBestResult(results, info, seasonNum);
        var showPath = match ? resultSlug(match) : null;
        if (!showPath) {
          console.log("[KickassAnime] No search match (" + results.length + " raw hits)");
          return [];
        }
        console.log("[KickassAnime] Matched: " + (match.title_en || match.title) + " -> " + showPath);
        return listEpisodes(showPath, epNum).then(function (eps) {
          var target = null;
          for (var i = 0; i < eps.length; i++) {
            if (Math.floor(Number(eps[i].episode_number)) === epNum) {
              target = eps[i];
              break;
            }
          }
          if (!target) {
            console.log("[KickassAnime] Episode " + epNum + " not in list (" + eps.length + " eps)");
            return [];
          }
          var epSlug = target.slug;
          var epUrl = apiBase() + "/api/show" + showPath + "/episode/ep-" + epNum + "-" + epSlug;
          return fetchJsonApi(epUrl).then(function (payload) {
            var servers = payload && payload.servers ? payload.servers : [];
            if (!servers.length) {
              console.log("[KickassAnime] No servers on episode payload");
              return [];
            }
            return Promise.all(servers.map(extractServerStreams)).then(function (groups) {
              var out = [];
              groups.forEach(function (g) { out = out.concat(g); });
              console.log("[KickassAnime] Returning " + out.length + " stream(s)");
              return out;
            });
          });
        });
      });
    });
  }).catch(function (e) {
    console.error("[KickassAnime] Error:", e.message);
    return [];
  });
}

(function __cbWrapExport() {
  var __cbCoreGetStreams = getStreams;
  getStreams = function (tmdbId, mediaType, season, episode) {
    return __cbRepoEntry(__cbCoreGetStreams, 'kickassanime', tmdbId, mediaType, season, episode);
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
  }
  if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
  }
})();
