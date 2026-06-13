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

// AllWish anime provider for Nuvio.
// Ported from phisher98/phisher-nuvio-providers with season matching and
// Promise-only control flow for the Nuvio/Hermes sandbox.

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://all-wish.me";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36";
var BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function base64Encode(value) {
  var str = String(value || "");
  var output = "";
  var i = 0;
  while (i < str.length) {
    var chr1 = str.charCodeAt(i++);
    var chr2 = str.charCodeAt(i++);
    var chr3 = str.charCodeAt(i++);
    var enc1 = chr1 >> 2;
    var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    var enc4 = chr3 & 63;
    if (isNaN(chr2)) {
      enc3 = 64;
      enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }
    output +=
      BASE64_CHARS.charAt(enc1) +
      BASE64_CHARS.charAt(enc2) +
      BASE64_CHARS.charAt(enc3) +
      BASE64_CHARS.charAt(enc4);
  }
  return output;
}

function request(url, json, headers) {
  var merged = {
    "User-Agent": USER_AGENT,
    "X-Requested-With": "XMLHttpRequest"
  };
  Object.keys(headers || {}).forEach(function (key) {
    merged[key] = headers[key];
  });
  return fetch(url, { headers: merged }).then(function (response) {
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " for " + url);
    }
    return json ? response.json() : response.text();
  });
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/season\s+\d+|(?:^|\s)s\d+(?:\s|$)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function seasonFromTitle(value) {
  var match = String(value || "").match(/\bseason\s+(\d+)\b/i);
  if (!match) match = String(value || "").match(/(?:^|\s)s(\d+)(?:\s|$)/i);
  return match ? parseInt(match[1], 10) : 1;
}

function scoreResult(name, title, season, mediaType) {
  var expected = normalizeTitle(title);
  var actual = normalizeTitle(name);
  var score = actual === expected ? 100 : 0;
  if (!score && (actual.indexOf(expected) >= 0 || expected.indexOf(actual) >= 0)) score = 70;
  if (!score) {
    var expectedWords = expected.split(" ");
    var matched = expectedWords.filter(function (word) {
      return word.length > 2 && actual.indexOf(word) >= 0;
    }).length;
    score = matched * 5;
  }
  if (mediaType === "tv") {
    score += seasonFromTitle(name) === (Number(season) || 1) ? 40 : -40;
  }
  if (/special|movie|ova|ona|frozen bond|memory snow/i.test(name) && mediaType === "tv") {
    score -= 35;
  }
  return score;
}

function generateEpisodeVrf(episodeId) {
  var secretKey = "ysJhV6U27FVIjjuk";
  var encodedId = encodeURIComponent(episodeId);
  var keyCodes = secretKey.split("").map(function (c) { return c.charCodeAt(0); });
  var dataCodes = encodedId.split("").map(function (c) { return c.charCodeAt(0); });
  var n = [];
  var a = 0;
  var o;
  for (o = 0; o < 256; o++) n[o] = o;
  for (o = 0; o < 256; o++) {
    a = (a + n[o] + keyCodes[o % keyCodes.length]) % 256;
    var swap = n[o];
    n[o] = n[a];
    n[a] = swap;
  }
  var out = [];
  o = 0;
  a = 0;
  for (var r = 0; r < dataCodes.length; r++) {
    o = (o + 1) % 256;
    a = (a + n[o]) % 256;
    var swap2 = n[o];
    n[o] = n[a];
    n[a] = swap2;
    out.push(dataCodes[r] ^ n[(n[o] + n[a]) % 256]);
  }
  var binary = out.map(function (b) { return String.fromCharCode(b & 255); }).join("");
  var first = base64Encode(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  var transformed = [];
  for (var i = 0; i < first.length; i++) {
    var code = first.charCodeAt(i);
    var mod = i % 8;
    if (mod === 1) code += 3;
    else if (mod === 7) code += 5;
    else if (mod === 2) code -= 4;
    else if (mod === 4) code -= 2;
    else if (mod === 6) code += 4;
    else if (mod === 0) code -= 3;
    else if (mod === 3) code += 2;
    else if (mod === 5) code += 5;
    transformed.push(String.fromCharCode(code & 255));
  }
  return base64Encode(transformed.join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .replace(/[A-Za-z]/g, function (c) {
      var base = c <= "Z" ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
}

function getTmdbInfo(tmdbId, mediaType) {
  var type = mediaType === "movie" ? "movie" : "tv";
  var url = "https://api.themoviedb.org/3/" + type + "/" + tmdbId +
    "?api_key=" + TMDB_API_KEY;
  return request(url, true).then(function (data) {
    return { title: data.title || data.name || "", type: type };
  });
}

function findAnimePage(title, season, mediaType) {
  var url = BASE_URL + "/filter?keyword=" + encodeURIComponent(title);
  return request(url, false).then(function (html) {
    var $ = cheerio.load(html);
    var candidates = [];
    $("div.item").each(function (_, item) {
      var anchor = $(item).find("div.name > a");
      var href = anchor.attr("href");
      var name = anchor.text().trim();
      if (href && name) {
        candidates.push({
          name: name,
          href: href.indexOf("http") === 0 ? href : BASE_URL + href,
          score: scoreResult(name, title, season, mediaType)
        });
      }
    });
    candidates.sort(function (a, b) { return b.score - a.score; });
    if (!candidates.length || candidates[0].score < 30) return null;
    console.log("[AllWish] Selected " + candidates[0].name);
    return candidates[0].href.replace(/\/+$/, "");
  });
}

function getEpisodeIds(animeUrl, episode) {
  return request(animeUrl, false).then(function (html) {
    var $ = cheerio.load(html);
    var dataId = $("main > div.container").attr("data-id");
    if (!dataId) return null;
    var vrf = generateEpisodeVrf(dataId);
    return request(BASE_URL + "/ajax/episode/list/" + dataId + "?vrf=" + vrf, true)
      .then(function (payload) {
        if (!payload || payload.status !== 200) return null;
        var $list = cheerio.load(payload.result || "");
        var target = Number(episode) || 1;
        var episodeIds = null;
        $list("div.range > div > a").each(function (_, el) {
          if (parseInt($list(el).attr("data-slug"), 10) === target) {
            episodeIds = $list(el).attr("data-ids");
          }
        });
        return episodeIds;
      });
  });
}

function extractMegaPlay(realUrl, sectionType) {
  return request(realUrl, false, {
    Referer: "https://megaplay.buzz/"
  }).then(function (html) {
    var match = html.match(/data-id="(\d+)"/);
    if (!match) return [];
    return request("https://megaplay.buzz/stream/getSources?id=" + match[1], true, {
      Referer: realUrl,
      Origin: "https://megaplay.buzz"
    }).then(function (payload) {
      var source = payload && payload.sources && payload.sources.file;
      if (!/^https?:\/\//i.test(source || "")) return [];
      var subtitles = (payload.tracks || []).filter(function (track) {
        return track && /^https?:\/\//i.test(track.file || "");
      }).map(function (track) {
        return { lang: track.label || "Unknown", url: track.file };
      });
      return [{
        name: "AllWish " + String(sectionType || "SUB").toUpperCase(),
        title: "AllWish " + String(sectionType || "SUB").toUpperCase(),
        url: source,
        quality: "1080p",
        subtitles: subtitles,
        headers: {
          Referer: "https://megaplay.buzz/",
          Origin: "https://megaplay.buzz",
          "User-Agent": USER_AGENT
        },
        provider: "allwish"
      }];
    });
  }).catch(function (error) {
    console.log("[AllWish] MegaPlay error: " + error.message);
    return [];
  });
}

function getServerStreams(episodeIds) {
  return request(BASE_URL + "/ajax/server/list?servers=" + encodeURIComponent(episodeIds), true)
    .then(function (payload) {
      if (!payload || payload.status !== 200) return [];
      var $ = cheerio.load(payload.result || "");
      var servers = [];
      $("div.server-type").each(function (_, section) {
        var sectionType = $(section).attr("data-type") || "SUB";
        $(section).find("div.server-list > div.server").each(function (__, server) {
          var linkId = $(server).attr("data-link-id");
          if (linkId) servers.push({ linkId: linkId, sectionType: sectionType });
        });
      });
      return Promise.all(servers.slice(0, 6).map(function (server) {
        return request(BASE_URL + "/ajax/server?get=" + server.linkId, true)
          .then(function (data) {
            var realUrl = data && data.result && data.result.url;
            if (!/^https?:\/\//i.test(realUrl || "")) {
              console.log("[AllWish] Ignored incomplete server URL: " + String(realUrl || ""));
              return [];
            }
            if (/megaplay|rapid-cloud/i.test(realUrl)) {
              return extractMegaPlay(realUrl, server.sectionType);
            }
            return [{
              name: "AllWish " + String(server.sectionType).toUpperCase(),
              title: "AllWish " + String(server.sectionType).toUpperCase(),
              url: realUrl,
              quality: "1080p",
              headers: { Referer: BASE_URL + "/", "User-Agent": USER_AGENT },
              provider: "allwish"
            }];
          }).catch(function () { return []; });
      })).then(function (groups) {
        var seen = {};
        var streams = [];
        groups.forEach(function (group) {
          group.forEach(function (stream) {
            if (!seen[stream.url]) {
              seen[stream.url] = true;
              streams.push(stream);
            }
          });
        });
        return streams;
      });
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  console.log("[AllWish] Fetching " + mediaType + " " + tmdbId +
    (mediaType === "tv" ? " S" + (season || 1) + "E" + (episode || 1) : ""));
  return getTmdbInfo(tmdbId, mediaType)
    .then(function (info) {
      if (!info.title) return null;
      return findAnimePage(info.title, season, info.type);
    })
    .then(function (animeUrl) {
      if (!animeUrl) return null;
      return getEpisodeIds(animeUrl, mediaType === "movie" ? 1 : episode);
    })
    .then(function (episodeIds) {
      if (!episodeIds) return [];
      return getServerStreams(episodeIds);
    })
    .then(function (streams) {
      console.log("[AllWish] Found " + streams.length + " stream(s)");
      return streams;
    })
    .catch(function (error) {
      console.log("[AllWish] Error: " + error.message);
      return [];
    });
}

(function __cbWrapExport() {
  var __cbCoreGetStreams = getStreams;
  getStreams = function (tmdbId, mediaType, season, episode) {
    return __cbRepoEntry(__cbCoreGetStreams, 'allwish', tmdbId, mediaType, season, episode);
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
  }
  if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
  }
})();
