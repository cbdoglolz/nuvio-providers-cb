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
 * UHDMovies Provider - Ported from Kotlin CloudStream Extension
 * Based on: phisher98/cloudstream-extensions-phisher/UHDmoviesProvider
 */
"use strict";

var cheerio = require("cheerio-without-node-native");

var DOMAIN = "https://uhdmovies.pink";
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
var DOMAIN_CACHE = { url: DOMAIN, ts: 0 };

function getLatestDomain() {
  const now = Date.now();
  if (now - DOMAIN_CACHE.ts < 36e5) return Promise.resolve(DOMAIN_CACHE.url);
  return fetch(DOMAINS_URL)
    .then(res => res.json())
    .then(data => {
      if (data && data["UHDMovies"]) {
        DOMAIN_CACHE.url = data["UHDMovies"];
        DOMAIN_CACHE.ts = now;
      }
      return DOMAIN_CACHE.url;
    })
    .catch(() => DOMAIN_CACHE.url);
}
var TMDB_API = "https://api.themoviedb.org/3";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ============ UTILITY FUNCTIONS ============

function getBaseUrl(url) {
  try {
    var urlObj = new URL(url);
    return urlObj.protocol + "//" + urlObj.host;
  } catch (e) {
    return DOMAIN;
  }
}

function fixUrl(url, domain) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return domain + url;
  return domain + "/" + url;
}

function getIndexQuality(str) {
  if (!str) return "Unknown";
  var match = str.match(/(\d{3,4})[pP]/);
  if (match) return match[1] + "p";
  if (str.toUpperCase().includes("4K") || str.toUpperCase().includes("UHD")) return "2160p";
  return "Unknown";
}

function cleanTitle(title) {
  var parts = title.split(/[.\-_]/);
  var qualityTags = ["WEBRip", "WEB-DL", "WEB", "BluRay", "HDRip", "DVDRip", "HDTV", "CAM", "TS", "R5", "DVDScr", "BRRip", "BDRip", "DVD", "PDTV", "HD"];
  var audioTags = ["AAC", "AC3", "DTS", "MP3", "FLAC", "DD5", "EAC3", "Atmos"];
  var subTags = ["ESub", "ESubs", "Subs", "MultiSub", "NoSub", "EnglishSub", "HindiSub"];
  var codecTags = ["x264", "x265", "H264", "HEVC", "AVC"];

  var startIndex = parts.findIndex(function (part) {
    return qualityTags.some(function (tag) {
      return part.toLowerCase().includes(tag.toLowerCase());
    });
  });

  var endIndex = -1;
  for (var i = parts.length - 1; i >= 0; i--) {
    var part = parts[i];
    if (subTags.some(function (tag) { return part.toLowerCase().includes(tag.toLowerCase()); }) ||
      audioTags.some(function (tag) { return part.toLowerCase().includes(tag.toLowerCase()); }) ||
      codecTags.some(function (tag) { return part.toLowerCase().includes(tag.toLowerCase()); })) {
      endIndex = i;
      break;
    }
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    return parts.slice(startIndex, endIndex + 1).join(".");
  } else if (startIndex !== -1) {
    return parts.slice(startIndex).join(".");
  }
  return parts.slice(-3).join(".");
}

function extractSize(text) {
  var match = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  return match ? match[1] + " " + match[2].toUpperCase() : null;
}

// ============ SEARCH FUNCTIONS ============

function searchByTitle(title, year) {
  return getLatestDomain().then(function(domain) {
    var runSearch = function(queryText) {
      var query = encodeURIComponent(queryText.trim());
      var searchUrl = domain + "/?s=" + query;
      console.log("[UHDMovies] Search URL: " + searchUrl);
      return fetch(searchUrl, {
        headers: { "User-Agent": USER_AGENT }
      })
        .then(function (response) { return response.text(); })
        .then(function (html) {
          console.log("[UHDMovies] Response length: " + html.length + " bytes");
          return parseSearchResults(html, domain);
        });
    };
    var titleWithYear = (title + " " + (year || "")).trim();
    return runSearch(titleWithYear)
      .then(function(results) {
        if (results.length > 0) return results;
        if (!year) return results;
        console.log("[UHDMovies] Retrying search without year");
        return runSearch(title);
      })
      .then(function(results) {
        if (results.length > 0) return results;
        // TMDB often prefixes "Project …" while the site lists the short title.
        var shortTitle = title.replace(/^project\s+/i, "").trim();
        if (shortTitle && shortTitle.toLowerCase() !== title.toLowerCase()) {
          console.log("[UHDMovies] Retrying search with short title: " + shortTitle);
          return runSearch(shortTitle + " " + (year || "")).then(function(r2) {
            if (r2.length > 0) return r2;
            return runSearch(shortTitle);
          });
        }
        return results;
      })
      .catch(function (error) {
        console.error("[UHDMovies] Search failed:", error.message);
        return [];
      });
  });
}

function parseSearchResults(html, domain) {
  var $ = cheerio.load(html);
  var results = [];

  // Using selector from Kotlin: article.gridlove-post
  $("article.gridlove-post").each(function (_, el) {
    var $el = $(el);
    var titleRaw = $el.find("h1.sanket").text().trim().replace(/^Download\s+/i, "");
    var title = titleRaw.substring(0, titleRaw.indexOf("(") > -1 ? titleRaw.indexOf("(") : titleRaw.length).replace(/\bSeason\b.*$/i, "").replace(/\bS0\d+\b.*$/i, "").trim() || titleRaw;
    var href = fixUrl($el.find("div.entry-image > a").attr("href"), domain);

    if (href && title) {
      results.push({
        title: title,
        url: href,
        rawTitle: titleRaw
      });
    }
  });

  console.log("[UHDMovies] Found " + results.length + " search results");
  return results;
}

// ============ BYPASS FUNCTIONS (from Utils.kt) ============

function bypassHrefli(url) {
  var host = getBaseUrl(url);
  console.log("[UHDMovies] Bypassing Hrefli: " + url);

  return fetch(url, { headers: { "User-Agent": USER_AGENT } })
    .then(function (res) { return res.text(); })
    .then(function (html) {
      if (/just a moment|cf-challenge/i.test(html)) {
        console.log("[UHDMovies] Hrefli blocked by Cloudflare");
        return null;
      }
      var $ = cheerio.load(html);
      var formUrl = $("form#landing").attr("action");
      if (!formUrl) {
        console.log("[UHDMovies] Hrefli: no landing form");
        return null;
      }
      if (!formUrl.startsWith("http")) {
        formUrl = new URL(formUrl, url).toString();
      }
      var formData = {};
      $("form#landing input").each(function (_, el) {
        formData[$(el).attr("name")] = $(el).attr("value") || "";
      });

      return fetch(formUrl, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams(formData).toString()
      });
    })
    .then(function (res) {
      if (!res || typeof res.text !== "function") return null;
      return res.text();
    })
    .then(function (html) {
      if (!html) return null;
      var $ = cheerio.load(html);
      var formUrl = $("form#landing").attr("action");
      var formData = {};
      $("form#landing input").each(function (_, el) {
        formData[$(el).attr("name")] = $(el).attr("value") || "";
      });

      return fetch(formUrl, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams(formData).toString()
      }).then(function (res) {
        return { response: res, formData: formData };
      });
    })
    .then(function (result) {
      if (!result || !result.response) return null;
      return result.response.text().then(function (html) {
        return { html: html, formData: result.formData };
      });
    })
    .then(function (result) {
      if (!result || !result.html) return null;
      var $ = cheerio.load(result.html);
      var script = $("script:contains(?go=)").html() || "";
      var skTokenMatch = script.match(/\?go=([^"]+)/);
      if (!skTokenMatch) return null;
      var skToken = skTokenMatch[1];
      var wpHttp2 = result.formData["_wp_http2"] || "";

      return fetch(host + "?go=" + skToken, {
        headers: {
          "User-Agent": USER_AGENT,
          "Cookie": skToken + "=" + wpHttp2
        }
      });
    })
    .then(function (res) {
      if (!res) return null;
      return res.text();
    })
    .then(function (html) {
      if (!html) return null;
      var $ = cheerio.load(html);
      var metaRefresh = $('meta[http-equiv="refresh"]').attr("content") || "";
      var driveUrlMatch = metaRefresh.match(/url=(.+)/);
      if (!driveUrlMatch) return null;
      return driveUrlMatch[1];
    })
    .then(function (driveUrl) {
      if (!driveUrl) return null;
      return fetch(driveUrl, { headers: { "User-Agent": USER_AGENT } })
        .then(function (res) { return res.text(); })
        .then(function (html) {
          var pathMatch = html.match(/replace\("([^"]+)"\)/);
          if (!pathMatch || pathMatch[1] === "/404") return null;
          return fixUrl(pathMatch[1], getBaseUrl(driveUrl));
        });
    })
    .catch(function (error) {
      console.error("[UHDMovies] Hrefli bypass failed:", error.message);
      return null;
    });
}

// ============ EXTRACTOR FUNCTIONS (from Extractors.kt - Driveseed) ============

function extractVideoSeed(finallink) {
  console.log("[UHDMovies] Extracting VideoSeed: " + finallink);

  try {
    var urlObj = new URL(finallink);
    var host = urlObj.host || "video-seed.xyz";
    var token = finallink.split("?url=")[1];
    if (!token) return Promise.resolve(null);

    return fetch("https://" + host + "/api", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        "x-token": host,
        "Referer": finallink
      },
      body: "keys=" + encodeURIComponent(token)
    })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var urlMatch = text.match(/url":"([^"]+)"/);
        if (urlMatch) {
          return urlMatch[1].replace(/\\\//g, "/");
        }
        return null;
      })
      .catch(function (error) {
        console.error("[UHDMovies] VideoSeed extraction failed:", error.message);
        return null;
      });
  } catch (e) {
    return Promise.resolve(null);
  }
}

function extractInstantLink(finallink) {
  console.log("[UHDMovies] Extracting InstantLink: " + finallink);

  return fetch(finallink, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow"
  })
    .then(function (res) {
      var resolved = res.url || finallink;
      if (resolved.includes("url=")) {
        var extracted = decodeURIComponent(resolved.split("url=").slice(1).join("url="));
        if (extracted.startsWith("http")) {
          return extracted;
        }
      }

      // Legacy video-seed hosts still expose a token API on some redirects.
      try {
        var urlObj = new URL(resolved);
        var host = urlObj.host;
        var token = resolved.split("url=")[1];
        if (!token) return null;

        return fetch("https://" + host + "/api", {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
            "x-token": host,
            "Referer": resolved
          },
          body: "keys=" + encodeURIComponent(token)
        })
          .then(function (apiRes) { return apiRes.text(); })
          .then(function (text) {
            var urlMatch = text.match(/url":"([^"]+)"/);
            if (urlMatch) {
              return urlMatch[1].replace(/\\\//g, "/");
            }
            return null;
          });
      } catch (e) {
        return null;
      }
    })
    .catch(function (error) {
      console.error("[UHDMovies] InstantLink extraction failed:", error.message);
      return null;
    });
}

function extractResumeBot(url) {
  console.log("[UHDMovies] Extracting ResumeBot: " + url);

  return fetch(url, { headers: { "User-Agent": USER_AGENT } })
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var tokenMatch = html.match(/formData\.append\('token', '([a-f0-9]+)'\)/);
      var pathMatch = html.match(/fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/);
      if (!tokenMatch || !pathMatch) return null;

      var token = tokenMatch[1];
      var path = pathMatch[1];
      var baseUrl = url.split("/download")[0];

      return fetch(baseUrl + "/download?id=" + path, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "*/*",
          "Origin": baseUrl,
          "Referer": url
        },
        body: "token=" + encodeURIComponent(token)
      });
    })
    .then(function (res) {
      if (!res) return null;
      return res.text();
    })
    .then(function (text) {
      if (!text) return null;
      try {
        var json = JSON.parse(text);
        return json.url && json.url.startsWith("http") ? json.url : null;
      } catch (e) {
        return null;
      }
    })
    .catch(function (error) {
      console.error("[UHDMovies] ResumeBot extraction failed:", error.message);
      return null;
    });
}

function extractCFType1(url) {
  console.log("[UHDMovies] Extracting CFType1: " + url);

  return fetch(url + "?type=1", { headers: { "User-Agent": USER_AGENT } })
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var $ = cheerio.load(html);
      var links = [];
      $("a.btn-success").each(function (_, el) {
        var href = $(el).attr("href");
        if (href && href.startsWith("http")) {
          links.push(href);
        }
      });
      return links;
    })
    .catch(function (error) {
      console.error("[UHDMovies] CFType1 extraction failed:", error.message);
      return [];
    });
}

function extractResumeCloudLink(baseUrl, path) {
  console.log("[UHDMovies] Extracting ResumeCloud: " + baseUrl + path);

  return fetch(baseUrl + path, { headers: { "User-Agent": USER_AGENT } })
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var $ = cheerio.load(html);
      var link = $("a.btn-success").first().attr("href");
      return link && link.startsWith("http") ? link : null;
    })
    .catch(function (error) {
      console.error("[UHDMovies] ResumeCloud extraction failed:", error.message);
      return null;
    });
}

// ============ DRIVESEED PAGE EXTRACTION (from Extractors.kt) ============

function extractDriveseedPage(url) {
  console.log("[UHDMovies] Extracting Driveseed page: " + url);
  var streams = [];

  return Promise.resolve()
    .then(function () {
      // Handle r?key= redirect
      if (url.includes("r?key=")) {
        return fetch(url, { headers: { "User-Agent": USER_AGENT } })
          .then(function (res) { return res.text(); })
          .then(function (html) {
            var redirectMatch = html.match(/replace\("([^"]+)"\)/);
            if (redirectMatch) {
              var baseDomain = getBaseUrl(url);
              return fetch(baseDomain + redirectMatch[1], { headers: { "User-Agent": USER_AGENT } })
                .then(function (res) { return res.text(); });
            }
            return html;
          });
      }
      return fetch(url, { headers: { "User-Agent": USER_AGENT } })
        .then(function (res) { return res.text(); });
    })
    .then(function (html) {
      var $ = cheerio.load(html);
      var baseDomain = getBaseUrl(url);

      var qualityText = $("li.list-group-item").first().text() || "";
      var rawFileName = qualityText.replace("Name : ", "").trim();
      var fileName = cleanTitle(rawFileName);
      var size = $("li:nth-child(3)").text().replace("Size : ", "").trim();
      var quality = getIndexQuality(qualityText);

      var labelExtras = "";
      if (fileName) labelExtras += "[" + fileName + "]";
      if (size) labelExtras += "[" + size + "]";

      var promises = [];

      $("div.text-center > a").each(function (_, el) {
        var text = $(el).text();
        var href = $(el).attr("href");
        if (!href) return;

        if (text.toLowerCase().includes("instant download")) {
          promises.push(
            extractInstantLink(href).then(function (link) {
              if (link) {
                streams.push({
                  name: "UHDMovies",
                  title: "Driveseed Instant " + labelExtras,
                  url: link,
                  quality: quality,
                  size: size
                });
              }
            })
          );
        } else if (text.toLowerCase().includes("resume worker bot")) {
          promises.push(
            extractResumeBot(href).then(function (link) {
              if (link) {
                streams.push({
                  name: "UHDMovies",
                  title: "Driveseed ResumeBot " + labelExtras,
                  url: link,
                  quality: quality,
                  size: size
                });
              }
            })
          );
        } else if (text.toLowerCase().includes("direct links")) {
          promises.push(
            extractCFType1(baseDomain + href).then(function (links) {
              links.forEach(function (link) {
                streams.push({
                  name: "UHDMovies",
                  title: "Driveseed Direct " + labelExtras,
                  url: link,
                  quality: quality,
                  size: size
                });
              });
            })
          );
        } else if (text.toLowerCase().includes("resume cloud")) {
          promises.push(
            extractResumeCloudLink(baseDomain, href).then(function (link) {
              if (link) {
                streams.push({
                  name: "UHDMovies",
                  title: "Driveseed ResumeCloud " + labelExtras,
                  url: link,
                  quality: quality,
                  size: size
                });
              }
            })
          );
        } else if (text.toLowerCase().includes("cloud download")) {
          streams.push({
            name: "UHDMovies",
            title: "Driveseed Cloud " + labelExtras,
            url: href,
            quality: quality,
            size: size
          });
        }
      });

      return Promise.all(promises).then(function () {
        return streams;
      });
    })
    .catch(function (error) {
      console.error("[UHDMovies] Driveseed extraction failed:", error.message);
      return [];
    });
}

// ============ MOVIE LINK EXTRACTION (from UHDmoviesProvider.kt load function) ============

function getMovieLinks(pageUrl) {
  console.log("[UHDMovies] Getting movie links from: " + pageUrl);

  return fetch(pageUrl, { headers: { "User-Agent": USER_AGENT } })
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var $ = cheerio.load(html);
      var links = [];

      // From Kotlin: div.entry-content > p with [.*] regex and a.maxbutton-1
      var iframeRegex = /\[.*\]/;
      $("div.entry-content > p").each(function (_, el) {
        var $el = $(el);
        var elHtml = $.html(el);

        if (iframeRegex.test(elHtml)) {
          var sourceName = $el.text().split("Download")[0].trim();
          var nextEl = $el.next();
          var sourceLink = nextEl.find("a.maxbutton-1").attr("href") || "";

          if (sourceLink) {
            links.push({
              sourceName: sourceName,
              sourceLink: fixUrl(sourceLink, getBaseUrl(pageUrl))
            });
          }
        }
      });

      console.log("[UHDMovies] Found " + links.length + " movie links");
      return links;
    })
    .catch(function (error) {
      console.error("[UHDMovies] Movie links extraction failed:", error.message);
      return [];
    });
}

// ============ TV EPISODE LINK EXTRACTION (from UHDmoviesProvider.kt) ============

function getTvEpisodeLink(pageUrl, targetSeason, targetEpisode) {
  console.log("[UHDMovies] Getting TV episode S" + targetSeason + "E" + targetEpisode + " from: " + pageUrl);

  return fetch(pageUrl, { headers: { "User-Agent": USER_AGENT } })
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var $ = cheerio.load(html);
      var links = [];
      var currentSeason = 1;
      $("pre, p, a:contains(Episode)").each(function (_, el) {
        var $el = $(el);
        var text = $el.text() || "";
        var seasonMatch = text.match(/(?:season\s*|S)(\d+)/i);
        if (seasonMatch) {
          currentSeason = parseInt(seasonMatch[1]);
        }
        if ($el.prop("tagName") !== "A" || !/Episode/i.test(text) || /Zip/i.test(text))
          return;
        var episodeMatch = text.match(/Episode\s*0*(\d+)/i);
        var realEpisode = episodeMatch ? parseInt(episodeMatch[1]) : null;
        if (currentSeason !== targetSeason || realEpisode !== targetEpisode)
          return;
        var link = fixUrl($el.attr("href"), getBaseUrl(pageUrl));
        if (!link)
          return;
        var context = [$el.parent().text(), $el.parent().prev().text(), text].join(" ");
        var qualityMatch = context.match(/(2160p|1080p|720p|480p|4K|\d{3,4}p)/i);
        var sizeMatch = context.match(/(\d+(?:\.\d+)?\s*(?:MB|GB))/i);
        links.push({
          sourceName: "UHD",
          sourceLink: link,
          quality: qualityMatch ? qualityMatch[1] : "Unknown",
          size: sizeMatch ? sizeMatch[1] : null,
          details: context
        });
      });

      console.log("[UHDMovies] Found " + links.length + " episode links for S" + targetSeason + "E" + targetEpisode);
      return links;
    })
    .catch(function (error) {
      console.error("[UHDMovies] TV episode extraction failed:", error.message);
      return [];
    });
}

// ============ MAIN ENTRY POINT ============

function getTmdbDetails(tmdbId, mediaType) {
  var isSeries = mediaType === "series" || mediaType === "tv";
  var endpoint = isSeries ? "tv" : "movie";
  var url = TMDB_API + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY;

  console.log("[UHDMovies] Fetching TMDB details from: " + url);

  return fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (isSeries) {
        return {
          title: data.name,
          year: data.first_air_date ? parseInt(data.first_air_date.split("-")[0]) : null
        };
      } else {
        return {
          title: data.title,
          year: data.release_date ? parseInt(data.release_date.split("-")[0]) : null
        };
      }
    })
    .catch(function (error) {
      console.error("[UHDMovies] TMDB request failed:", error.message);
      return null;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  console.log("[UHDMovies] Searching for " + mediaType + " " + tmdbId);
  var allStreams = [];

  return getTmdbDetails(tmdbId, mediaType)
    .then(function (tmdbDetails) {
      if (!tmdbDetails) {
        console.log("[UHDMovies] Could not get TMDB details");
        return [];
      }

      var title = tmdbDetails.title;
      var year = tmdbDetails.year;
      console.log("[UHDMovies] Search: " + title + " (" + year + ")");

      return searchByTitle(title, year);
    })
    .then(function (searchResults) {
      if (!searchResults || searchResults.length === 0) {
        console.log("[UHDMovies] No results found");
        return [];
      }

      var isSeries = mediaType === "series" || mediaType === "tv";

      // Process each search result sequentially
      var processResult = function (index) {
        if (index >= searchResults.length) {
          return Promise.resolve(allStreams);
        }

        var result = searchResults[index];
        console.log("[UHDMovies] Processing result: " + result.title);

        var linksPromise;
        if (isSeries && season && episode) {
          linksPromise = getTvEpisodeLink(result.url, season, episode);
        } else {
          linksPromise = getMovieLinks(result.url);
        }

        return linksPromise.then(function (links) {
          var extractPromises = links.map(function (linkData) {
            var sourceLink = linkData.sourceLink;
            if (!sourceLink) return Promise.resolve([]);

            // Bypass hrefli if needed (from Kotlin loadLinks)
            var finalLinkPromise;
            if (sourceLink.toLowerCase().includes("unblockedgames")) {
              finalLinkPromise = bypassHrefli(sourceLink);
            } else {
              finalLinkPromise = Promise.resolve(sourceLink);
            }

            return finalLinkPromise.then(function (finalLink) {
              if (!finalLink) return [];

              // Check if it's a driveseed/driveleech link
              if (finalLink.includes("driveseed") || finalLink.includes("driveleech")) {
                return extractDriveseedPage(finalLink);
              }

              // Check for video-seed
              if (finalLink.includes("video-seed")) {
                return extractVideoSeed(finalLink).then(function (url) {
                  if (url) {
                    return [{
                      name: "UHDMovies",
                      title: "UHDMovies " + (linkData.quality || "Unknown"),
                      url: url,
                      quality: linkData.quality || "Unknown",
                      size: linkData.size
                    }];
                  }
                  return [];
                });
              }

              // Return the link as-is for external player
              return [{
                name: "UHDMovies",
                title: "UHDMovies " + (linkData.sourceName || linkData.quality || ""),
                url: finalLink,
                quality: linkData.quality || "Unknown",
                size: linkData.size,
                headers: {
                  "User-Agent": USER_AGENT
                },
                provider: "uhdmovies"
              }];
            });
          });

          return Promise.all(extractPromises).then(function (results) {
            results.forEach(function (streams) {
              allStreams = allStreams.concat(streams);
            });
            return processResult(index + 1);
          });
        });
      };

      return processResult(0);
    })
    .catch(function (error) {
      console.error("[UHDMovies] Error:", error.message);
      return [];
    });
}

(function __cbWrapExport() {
  var __cbCoreGetStreams = getStreams;
  getStreams = function (tmdbId, mediaType, season, episode) {
    return __cbRepoEntry(__cbCoreGetStreams, 'uhdmovies', tmdbId, mediaType, season, episode);
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
  }
  if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
  }
})();
