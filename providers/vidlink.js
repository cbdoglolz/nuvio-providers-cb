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

/**
 * vidlink - Built from src/vidlink/
 * Generated: 2025-12-31T21:23:16.719Z
 */
"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/vidlink/constants.js
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
var ENC_DEC_API = "https://enc-dec.app/api";
var VIDLINK_API = "https://vidlink.pro/api/b";
var VIDLINK_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Connection": "keep-alive",
  "Referer": "https://vidlink.pro/",
  "Origin": "https://vidlink.pro"
};

// src/vidlink/http.js
function makeRequest(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const defaultHeaders = __spreadValues({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Accept": "application/json,*/*",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      "Connection": "keep-alive"
    }, options.headers);
    try {
      const response = yield fetch(url, __spreadValues({
        method: options.method || "GET",
        headers: defaultHeaders
      }, options));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error(`[Vidlink] Request failed for ${url}: ${error.message}`);
      throw error;
    }
  });
}

// src/vidlink/tmdb.js
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a, _b;
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = yield makeRequest(url);
    const data = yield response.json();
    const title = mediaType === "tv" ? data.name : data.title;
    const year = mediaType === "tv" ? (_a = data.first_air_date) == null ? void 0 : _a.substring(0, 4) : (_b = data.release_date) == null ? void 0 : _b.substring(0, 4);
    if (!title) {
      throw new Error("Could not extract title from TMDB response");
    }
    console.log(`[Vidlink] TMDB Info: "${title}" (${year})`);
    return { title, year, data };
  });
}
function encryptTmdbId(tmdbId) {
  return __async(this, null, function* () {
    console.log(`[Vidlink] Encrypting TMDB ID: ${tmdbId}`);
    const response = yield makeRequest(`${ENC_DEC_API}/enc-vidlink?text=${tmdbId}`);
    const data = yield response.json();
    if (data && data.result) {
      console.log(`[Vidlink] Successfully encrypted TMDB ID`);
      return data.result;
    } else {
      throw new Error("Invalid encryption response format");
    }
  });
}

// src/vidlink/m3u8.js
function resolveUrl(url, baseUrl) {
  if (url.startsWith("http")) {
    return url;
  }
  try {
    return new URL(url, baseUrl).toString();
  } catch (error) {
    console.error(`[Vidlink] Could not resolve URL: ${url} against ${baseUrl}`);
    return url;
  }
}
function formatBitrate(bps) {
  if (!bps || bps <= 0)
    return "";
  if (bps >= 1e6)
    return (bps / 1e6).toFixed(1) + " Mbps";
  return Math.round(bps / 1e3) + " Kbps";
}
function playlistHeaders(playlistUrl) {
  try {
    const origin = new URL(playlistUrl).origin;
    return __spreadValues(__spreadValues({}, VIDLINK_HEADERS), {
      Referer: origin + "/",
      Origin: origin
    });
  } catch (e) {
    return VIDLINK_HEADERS;
  }
}
function validateM3u8Url(url, headers) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(url, {
        method: "GET",
        headers: __spreadValues(__spreadValues({}, headers), { Range: "bytes=0-2048" })
      });
      if (!response.ok)
        return false;
      const text = yield response.text();
      return text.indexOf("#EXTM3U") >= 0;
    } catch (e) {
      return false;
    }
  });
}
function getQualityFromResolution(resolution) {
  if (!resolution)
    return "Auto";
  const [, height] = resolution.split("x").map(Number);
  if (height >= 2160)
    return "4K";
  if (height >= 1440)
    return "1440p";
  if (height >= 1080)
    return "1080p";
  if (height >= 720)
    return "720p";
  if (height >= 480)
    return "480p";
  if (height >= 360)
    return "360p";
  return "240p";
}
function parseM3U8(content, baseUrl) {
  const lines = content.split("\n").map((line) => line.trim()).filter((line) => line);
  const streams = [];
  let currentStream = null;
  for (const line of lines) {
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      currentStream = { bandwidth: null, resolution: null, url: null };
      const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
      if (bandwidthMatch) {
        currentStream.bandwidth = parseInt(bandwidthMatch[1]);
      }
      const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      if (resolutionMatch) {
        currentStream.resolution = resolutionMatch[1];
      }
    } else if (currentStream && !line.startsWith("#")) {
      currentStream.url = resolveUrl(line, baseUrl);
      streams.push(currentStream);
      currentStream = null;
    }
  }
  return streams;
}
function fetchAndParseM3U8(playlistUrl, mediaInfo) {
  return __async(this, null, function* () {
    console.log(`[Vidlink] Fetching M3U8 playlist: ${playlistUrl.substring(0, 80)}...`);
    const plHeaders = playlistHeaders(playlistUrl);
    const masterStream = {
      name: "Vidlink - Auto",
      title: mediaInfo.title,
      url: playlistUrl,
      quality: "Auto",
      type: "direct",
      headers: plHeaders,
      provider: "vidlink"
    };
    try {
      const response = yield makeRequest(playlistUrl, { headers: plHeaders });
      const m3u8Content = yield response.text();
      if (m3u8Content.indexOf("#EXTM3U") < 0) {
        console.log("[Vidlink] Playlist response is not valid m3u8 — using API playlist URL");
        return [masterStream];
      }
      console.log(`[Vidlink] Parsing M3U8 content`);
      const parsedStreams = parseM3U8(m3u8Content, playlistUrl);
      if (parsedStreams.length === 0) {
        console.log("[Vidlink] Media playlist — using master URL");
        return [masterStream];
      }
      console.log(`[Vidlink] Found ${parsedStreams.length} quality variants`);
      const seen = /* @__PURE__ */ new Set();
      const out = [masterStream];
      parsedStreams.sort((a, b) => {
        const ah = a.resolution ? parseInt(a.resolution.split("x")[1], 10) : 0;
        const bh = b.resolution ? parseInt(b.resolution.split("x")[1], 10) : 0;
        return bh - ah;
      });
      for (const stream of parsedStreams) {
        const quality = getQualityFromResolution(stream.resolution);
        if (seen.has(quality))
          continue;
        const ok = yield validateM3u8Url(stream.url, plHeaders);
        if (!ok) {
          console.log(`[Vidlink] Skip ${quality}: variant not reachable`);
          continue;
        }
        seen.add(quality);
        const bitrate = formatBitrate(stream.bandwidth);
        out.push({
          name: `Vidlink - ${quality}`,
          title: mediaInfo.title,
          url: stream.url,
          quality,
          size: bitrate || void 0,
          type: "direct",
          headers: plHeaders,
          provider: "vidlink"
        });
      }
      return out;
    } catch (error) {
      console.error(`[Vidlink] Error fetching/parsing M3U8: ${error.message}`);
      console.log("[Vidlink] Returning master playlist URL (CDN may block server; device can retry)");
      return [masterStream];
    }
  });
}

// src/vidlink/processor.js
function extractQuality(streamData) {
  if (!streamData)
    return "Auto";
  const qualityFields = ["quality", "resolution", "label", "name"];
  for (const field of qualityFields) {
    if (streamData[field]) {
      const quality = streamData[field].toString().toLowerCase();
      if (quality.includes("2160") || quality.includes("4k"))
        return "4K";
      if (quality.includes("1440") || quality.includes("2k"))
        return "1440p";
      if (quality.includes("1080") || quality.includes("fhd"))
        return "1080p";
      if (quality.includes("720") || quality.includes("hd"))
        return "720p";
      if (quality.includes("480") || quality.includes("sd"))
        return "480p";
      if (quality.includes("360"))
        return "360p";
      if (quality.includes("240"))
        return "240p";
      const match = quality.match(/(\d{3,4})[pP]?/);
      if (match) {
        const resolution = parseInt(match[1]);
        if (resolution >= 2160)
          return "4K";
        if (resolution >= 1440)
          return "1440p";
        if (resolution >= 1080)
          return "1080p";
        if (resolution >= 720)
          return "720p";
        if (resolution >= 480)
          return "480p";
        if (resolution >= 360)
          return "360p";
        return "240p";
      }
    }
  }
  return "Auto";
}
function createStreamTitle(mediaInfo) {
  if (mediaInfo.mediaType === "tv" && mediaInfo.season && mediaInfo.episode) {
    return `${mediaInfo.title} S${String(mediaInfo.season).padStart(2, "0")}E${String(mediaInfo.episode).padStart(2, "0")}`;
  }
  return mediaInfo.year ? `${mediaInfo.title} (${mediaInfo.year})` : mediaInfo.title;
}
function processVidlinkResponse(data, mediaInfo) {
  const streams = [];
  try {
    console.log(`[Vidlink] Processing response data`);
    const streamTitle = createStreamTitle(mediaInfo);
    if (data.stream && data.stream.qualities) {
      console.log(`[Vidlink] Processing qualities from stream object`);
      Object.entries(data.stream.qualities).forEach(([qualityKey, qualityData]) => {
        if (qualityData.url) {
          const quality = extractQuality({ quality: qualityKey });
          streams.push({
            name: `Vidlink - ${quality}`,
            title: streamTitle,
            url: qualityData.url,
            quality,
            type: "direct",
            headers: VIDLINK_HEADERS,
            provider: "vidlink"
          });
        }
      });
      if (data.stream.playlist) {
        streams.push({
          _isPlaylist: true,
          url: data.stream.playlist,
          mediaInfo: __spreadProps(__spreadValues({}, mediaInfo), { title: streamTitle })
        });
      }
    } else if (data.stream && data.stream.playlist && !data.stream.qualities) {
      console.log(`[Vidlink] Processing playlist-only response`);
      streams.push({
        _isPlaylist: true,
        url: data.stream.playlist,
        mediaInfo: __spreadProps(__spreadValues({}, mediaInfo), { title: streamTitle })
      });
    } else if (data.url) {
      const quality = extractQuality(data);
      streams.push({
        name: `Vidlink - ${quality}`,
        title: streamTitle,
        url: data.url,
        quality,
        type: "direct",
        headers: VIDLINK_HEADERS,
        provider: "vidlink"
      });
    } else if (data.streams && Array.isArray(data.streams)) {
      data.streams.forEach((stream, index) => {
        if (stream.url) {
          const quality = extractQuality(stream);
          streams.push({
            name: `Vidlink Stream ${index + 1} - ${quality}`,
            title: streamTitle,
            url: stream.url,
            quality,
            size: stream.size || "",
            headers: VIDLINK_HEADERS,
            provider: "vidlink"
          });
        }
      });
    } else if (data.links && Array.isArray(data.links)) {
      data.links.forEach((link, index) => {
        if (link.url) {
          const quality = extractQuality(link);
          streams.push({
            name: `Vidlink Link ${index + 1} - ${quality}`,
            title: streamTitle,
            url: link.url,
            quality,
            size: link.size || "",
            headers: VIDLINK_HEADERS,
            provider: "vidlink"
          });
        }
      });
    } else if (typeof data === "object") {
      const findUrls = (obj) => {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === "string" && (value.startsWith("http") || value.includes(".m3u8"))) {
            if (value.includes(".srt") || value.includes(".vtt") || value.includes("subtitle") || value.includes("captions") || key.toLowerCase().includes("subtitle") || key.toLowerCase().includes("caption")) {
              continue;
            }
            const quality = extractQuality({ [key]: value });
            streams.push({
              name: `Vidlink ${key} - ${quality}`,
              title: streamTitle,
              url: value,
              quality,
              size: "",
              headers: VIDLINK_HEADERS,
              provider: "vidlink"
            });
          } else if (typeof value === "object" && value !== null) {
            if (!key.toLowerCase().includes("caption") && !key.toLowerCase().includes("subtitle")) {
              findUrls(value);
            }
          }
        }
      };
      findUrls(data);
    }
    console.log(`[Vidlink] Extracted ${streams.length} streams from response`);
  } catch (error) {
    console.error(`[Vidlink] Error processing response: ${error.message}`);
  }
  return streams;
}

// src/vidlink/index.js
var QUALITY_ORDER = {
  "4K": 5,
  "1440p": 4,
  "1080p": 3,
  "720p": 2,
  "480p": 1,
  "360p": 0,
  "240p": -1,
  "Auto": -2,
  "Unknown": -3
};
function getStreams(tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) {
  return __async(this, null, function* () {
    console.log(`[Vidlink] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === "tv" ? `, S:${seasonNum}E:${episodeNum}` : ""}`);
    try {
      const { title, year } = yield getTmdbInfo(tmdbId, mediaType);
      const encryptedId = yield encryptTmdbId(tmdbId);
      let vidlinkUrl;
      if (mediaType === "tv" && seasonNum && episodeNum) {
        vidlinkUrl = `${VIDLINK_API}/tv/${encryptedId}/${seasonNum}/${episodeNum}`;
      } else {
        vidlinkUrl = `${VIDLINK_API}/movie/${encryptedId}`;
      }
      console.log(`[Vidlink] Requesting: ${vidlinkUrl}`);
      const response = yield makeRequest(vidlinkUrl, { headers: VIDLINK_HEADERS });
      const data = yield response.json();
      console.log(`[Vidlink] Received response from Vidlink API`);
      const mediaInfo = {
        title,
        year,
        mediaType,
        season: seasonNum,
        episode: episodeNum
      };
      const streams = processVidlinkResponse(data, mediaInfo);
      if (streams.length === 0) {
        console.log("[Vidlink] No streams found in response");
        return [];
      }
      const playlistStreams = streams.filter((s) => s._isPlaylist);
      const directStreams = streams.filter((s) => !s._isPlaylist);
      if (playlistStreams.length > 0) {
        console.log(`[Vidlink] Processing ${playlistStreams.length} M3U8 playlists`);
        const playlistPromises = playlistStreams.map(
          (ps) => fetchAndParseM3U8(ps.url, ps.mediaInfo)
        );
        const parsedStreamArrays = yield Promise.all(playlistPromises);
        const allStreams = directStreams.concat(...parsedStreamArrays);
        allStreams.sort((a, b) => (QUALITY_ORDER[b.quality] || -3) - (QUALITY_ORDER[a.quality] || -3));
        console.log(`[Vidlink] Successfully processed ${allStreams.length} total streams`);
        return allStreams;
      } else {
        directStreams.sort((a, b) => (QUALITY_ORDER[b.quality] || -3) - (QUALITY_ORDER[a.quality] || -3));
        console.log(`[Vidlink] Successfully processed ${directStreams.length} streams`);
        return directStreams;
      }
    } catch (error) {
      console.error(`[Vidlink] Error in getStreams: ${error.message}`);
      return [];
    }
  });
}

(function __cbWrapExport() {
  var __cbCoreGetStreams = getStreams;
  getStreams = function (tmdbId, mediaType, season, episode) {
    return __cbRepoEntry(__cbCoreGetStreams, 'vidlink', tmdbId, mediaType, season, episode);
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
  }
  if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
  }
})();
