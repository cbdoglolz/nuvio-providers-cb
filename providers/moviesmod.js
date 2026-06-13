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
const cheerio = require("cheerio-without-node-native");
console.log("[MoviesMod] Using cheerio-without-node-native for DOM parsing");
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const FALLBACK_DOMAIN = "https://moviesmod.farm";
const DOMAIN_CACHE_TTL = 4 * 60 * 60 * 1e3;
let moviesModDomain = FALLBACK_DOMAIN;
let domainCacheTimestamp = 0;
function getMoviesModDomain() {
  return __async(this, null, function* () {
    const now = Date.now();
    if (now - domainCacheTimestamp < DOMAIN_CACHE_TTL) {
      return moviesModDomain;
    }
    try {
      console.log("[MoviesMod] Fetching latest domain...");
      const response = yield fetch("https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (response.ok) {
        const data = yield response.json();
        if (data && data.moviesmod) {
          moviesModDomain = data.moviesmod;
          domainCacheTimestamp = now;
          console.log(`[MoviesMod] Updated domain to: ${moviesModDomain}`);
        }
      }
    } catch (error) {
      console.error(`[MoviesMod] Failed to fetch latest domain: ${error.message}`);
    }
    return moviesModDomain;
  });
}
function makeRequest(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1"
    };
    const response = yield fetch(url, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues(__spreadValues({}, defaultHeaders), options.headers)
    }));
    if ((response.status === 403 || response.status === 503) && typeof Cloudflare !== "undefined" && Cloudflare.solve) {
      console.log(`[MoviesMod] Cloudflare challenge detected for ${url}, requesting solver`);
      const solved = yield Cloudflare.solve(url);
      const retryHeaders = __spreadValues(__spreadValues({}, defaultHeaders), options.headers);
      if (solved && solved.Cookie)
        retryHeaders.Cookie = solved.Cookie;
      if (solved && solved["User-Agent"])
        retryHeaders["User-Agent"] = solved["User-Agent"];
      const retry = yield fetch(url, __spreadProps(__spreadValues({}, options), { headers: retryHeaders }));
      if (!retry.ok) {
        throw new Error(`HTTP ${retry.status}: ${retry.statusText}`);
      }
      return retry;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  });
}
function extractQuality(text) {
  if (!text)
    return "Unknown";
  const qualityMatch = text.match(/(480p|720p|1080p|2160p|4k)/i);
  if (qualityMatch) {
    return qualityMatch[1];
  }
  const cleanMatch = text.match(/(480p|720p|1080p|2160p|4k)[^)]*\)/i);
  if (cleanMatch) {
    return cleanMatch[0];
  }
  return "Unknown";
}
function parseQualityForSort(qualityString) {
  if (!qualityString)
    return 0;
  const match = qualityString.match(/(\d{3,4})p/i);
  return match ? parseInt(match[1], 10) : 0;
}
function getTechDetails(qualityString) {
  if (!qualityString)
    return [];
  const details = [];
  const lowerText = qualityString.toLowerCase();
  if (lowerText.includes("10bit"))
    details.push("10-bit");
  if (lowerText.includes("hevc") || lowerText.includes("x265"))
    details.push("HEVC");
  if (lowerText.includes("hdr"))
    details.push("HDR");
  return details;
}
function findBestMatch(mainString, targetStrings) {
  if (!targetStrings || targetStrings.length === 0) {
    return { bestMatch: { target: "", rating: 0 }, bestMatchIndex: -1 };
  }
  const ratings = targetStrings.map((target) => {
    if (!target)
      return 0;
    const main = mainString.toLowerCase();
    const targ = target.toLowerCase();
    if (main === targ)
      return 1;
    if (targ.includes(main) || main.includes(targ))
      return 0.8;
    const mainWords = main.split(/\s+/);
    const targWords = targ.split(/\s+/);
    let matches = 0;
    for (const word of mainWords) {
      if (word.length > 2 && targWords.some((tw) => tw.includes(word) || word.includes(tw))) {
        matches++;
      }
    }
    return matches / Math.max(mainWords.length, targWords.length);
  });
  const bestRating = Math.max(...ratings);
  const bestIndex = ratings.indexOf(bestRating);
  return {
    bestMatch: { target: targetStrings[bestIndex], rating: bestRating },
    bestMatchIndex: bestIndex
  };
}
function searchMoviesMod(query) {
  return __async(this, null, function* () {
    try {
      const baseUrl = yield getMoviesModDomain();
      const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
      console.log(`[MoviesMod] Searching: ${searchUrl}`);
      const response = yield makeRequest(searchUrl);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const results = [];
      $(".latestPost").each((i, element) => {
        const linkElement = $(element).find("a");
        const title = linkElement.attr("title");
        const url = linkElement.attr("href");
        if (title && url) {
          results.push({ title, url });
        }
      });
      console.log(`[MoviesMod] Found ${results.length} search results`);
      return results;
    } catch (error) {
      console.error(`[MoviesMod] Error searching: ${error.message}`);
      return [];
    }
  });
}
function extractDownloadLinks(moviePageUrl) {
  return __async(this, null, function* () {
    try {
      const response = yield makeRequest(moviePageUrl);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const links = [];
      const contentBox = $(".thecontent");
      const headers = contentBox.find('h3:contains("Season"), h4');
      headers.each((i, el) => {
        const header = $(el);
        const headerText = header.text().trim();
        const blockContent = header.nextUntil("h3, h4");
        if (header.is("h3") && headerText.toLowerCase().includes("season")) {
          const linkElements = blockContent.find("a").filter((i2, el2) => {
            const text = $(el2).text().trim().toLowerCase();
            return text.includes("episode links") && !text.includes("batch");
          });
          linkElements.each((j, linkEl) => {
            const buttonText = $(linkEl).text().trim();
            const linkUrl = $(linkEl).attr("href");
            if (linkUrl) {
              links.push({
                quality: `${headerText} - ${buttonText}`,
                url: linkUrl
              });
            }
          });
        } else if (header.is("h4")) {
          const linkElement = blockContent.find("a.maxbutton-download-links, .maxbutton").first();
          if (linkElement.length > 0) {
            const link = linkElement.attr("href");
            const cleanQuality = extractQuality(headerText);
            if (link && cleanQuality) {
              links.push({
                quality: cleanQuality,
                url: link
              });
            }
          }
        }
      });
      console.log(`[MoviesMod] Extracted ${links.length} download links`);
      return links;
    } catch (error) {
      console.error(`[MoviesMod] Error extracting download links: ${error.message}`);
      return [];
    }
  });
}
function resolveIntermediateLink(initialUrl, refererUrl, quality) {
  return __async(this, null, function* () {
    try {
      const urlObject = new URL(initialUrl);
      if (urlObject.hostname.includes("links.modpro.blog") || urlObject.hostname.includes("posts.modpro.blog")) {
        const response = yield makeRequest(initialUrl, { headers: { "Referer": refererUrl } });
        const html = yield response.text();
        const $ = cheerio.load(html);
        const finalLinks = [];
        $('.entry-content a[href*="driveseed.org"], .entry-content a[href*="tech.unblockedgames.world"], .entry-content a[href*="tech.creativeexpressionsblog.com"], .entry-content a[href*="tech.examzculture.in"]').each((i, el) => {
          const link = $(el).attr("href");
          const text = $(el).text().trim();
          if (link && text && !text.toLowerCase().includes("batch")) {
            finalLinks.push({
              server: text.replace(/\s+/g, " "),
              url: link
            });
          }
        });
        if (finalLinks.length === 0) {
          $('a[href*="driveseed.org"], a[href*="tech.unblockedgames.world"], a[href*="tech.creativeexpressionsblog.com"], a[href*="tech.examzculture.in"]').each((i, el) => {
            const link = $(el).attr("href");
            const text = $(el).text().trim();
            if (link && text && !text.toLowerCase().includes("batch")) {
              finalLinks.push({
                server: text.replace(/\s+/g, " ") || "Download Link",
                url: link
              });
            }
          });
        }
        console.log(`[MoviesMod] Found ${finalLinks.length} links from ${urlObject.hostname}`);
        return finalLinks;
      } else if (urlObject.hostname.includes("episodes.modpro.blog")) {
        const response = yield makeRequest(initialUrl, { headers: { "Referer": refererUrl } });
        const html = yield response.text();
        const $ = cheerio.load(html);
        const finalLinks = [];
        $("h3").each((i, el) => {
          const headerText = $(el).text().trim();
          const episodeMatch = headerText.match(/Episode\s+(\d+)/i);
          if (episodeMatch) {
            const episodeNum = episodeMatch[1];
            const linkElement = $(el).find("a").first();
            if (linkElement.length > 0) {
              const link = linkElement.attr("href");
              if (link) {
                finalLinks.push({
                  server: `Episode ${episodeNum}`,
                  url: link
                });
              }
            }
          }
        });
        console.log(`[MoviesMod] Found ${finalLinks.length} episode links from episodes.modpro.blog`);
        return finalLinks;
      } else if (urlObject.hostname.includes("modrefer.in")) {
        const encodedUrl = urlObject.searchParams.get("url");
        if (!encodedUrl) {
          console.error("[MoviesMod] Could not find encoded URL in modrefer.in link.");
          return [];
        }
        const decodedUrl = atob(encodedUrl);
        console.log(`[MoviesMod] Decoded modrefer URL: ${decodedUrl}`);
        const response = yield makeRequest(decodedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Referer": refererUrl
          }
        });
        const html = yield response.text();
        const $ = cheerio.load(html);
        const finalLinks = [];
        console.log(`[MoviesMod] Page title: ${$("title").text()}`);
        console.log(`[MoviesMod] Total links on page: ${$("a").length}`);
        console.log(`[MoviesMod] HTML length: ${html.length} characters`);
        $(".timed-content-client_show_0_5_0 a").each((i, el) => {
          const link = $(el).attr("href");
          const text = $(el).text().trim();
          if (link) {
            finalLinks.push({
              server: text,
              url: link
            });
          }
        });
        if (finalLinks.length === 0) {
          console.log(`[MoviesMod] No timed content found, looking for direct links...`);
          $("a").each((i, el) => {
            const link = $(el).attr("href");
            const text = $(el).text().trim();
            if (link && (link.includes("driveseed.org") || link.includes("tech.unblockedgames.world") || link.includes("tech.examzculture.in") || link.includes("tech.creativeexpressionsblog.com") || link.includes("tech.examdegree.site"))) {
              console.log(`[MoviesMod] Found direct link: ${text} -> ${link}`);
              finalLinks.push({
                server: text || "Download Link",
                url: link
              });
            }
          });
        }
        if (finalLinks.length === 0) {
          console.log(`[MoviesMod] Looking for alternative download patterns...`);
          $('button, .download-btn, .btn, [class*="download"], [class*="btn"]').each((i, el) => {
            const $el = $(el);
            const link = $el.attr("href") || $el.attr("data-href") || $el.find("a").attr("href");
            const text = $el.text().trim();
            if (link && (link.includes("driveseed.org") || link.includes("tech.unblockedgames.world") || link.includes("tech.examzculture.in") || link.includes("tech.creativeexpressionsblog.com") || link.includes("tech.examdegree.site"))) {
              console.log(`[MoviesMod] Found alternative link: ${text} -> ${link}`);
              finalLinks.push({
                server: text || "Alternative Download",
                url: link
              });
            }
          });
        }
        console.log(`[MoviesMod] Found ${finalLinks.length} total links`);
        return finalLinks;
      }
      return [];
    } catch (error) {
      console.error(`[MoviesMod] Error resolving intermediate link: ${error.message}`);
      return [];
    }
  });
}
function resolveTechUnblockedLink(sidUrl) {
  return __async(this, null, function* () {
    console.log(`[MoviesMod] Resolving SID link: ${sidUrl}`);
    try {
      const response = yield makeRequest(sidUrl);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const initialForm = $("#landing");
      const wp_http_step1 = initialForm.find('input[name="_wp_http"]').val();
      const action_url_step1 = initialForm.attr("action");
      if (!wp_http_step1 || !action_url_step1) {
        console.error("  [SID] Error: Could not find _wp_http in initial form.");
        return null;
      }
      const step1Data = new URLSearchParams({ "_wp_http": wp_http_step1 });
      const responseStep1 = yield makeRequest(action_url_step1, {
        method: "POST",
        headers: {
          "Referer": sidUrl,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: step1Data.toString()
      });
      const html2 = yield responseStep1.text();
      const $2 = cheerio.load(html2);
      const verificationForm = $2("#landing");
      const action_url_step2 = verificationForm.attr("action");
      const wp_http2 = verificationForm.find('input[name="_wp_http2"]').val();
      const token = verificationForm.find('input[name="token"]').val();
      if (!action_url_step2) {
        console.error("  [SID] Error: Could not find verification form.");
        return null;
      }
      const step2Data = new URLSearchParams({ "_wp_http2": wp_http2, "token": token });
      const responseStep2 = yield makeRequest(action_url_step2, {
        method: "POST",
        headers: {
          "Referer": responseStep1.url,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: step2Data.toString()
      });
      const finalHtml = yield responseStep2.text();
      let finalLinkPath = null;
      let cookieName = null;
      let cookieValue = null;
      const cookieMatch = finalHtml.match(/s_343\('([^']+)',\s*'([^']+)'/);
      const linkMatch = finalHtml.match(/c\.setAttribute\("href",\s*"([^"]+)"\)/);
      if (cookieMatch) {
        cookieName = cookieMatch[1].trim();
        cookieValue = cookieMatch[2].trim();
      }
      if (linkMatch) {
        finalLinkPath = linkMatch[1].trim();
      }
      if (!finalLinkPath || !cookieName || !cookieValue) {
        console.error("  [SID] Error: Could not extract dynamic cookie/link from JS.");
        return null;
      }
      const { origin } = new URL(sidUrl);
      const finalUrl = new URL(finalLinkPath, origin).href;
      const finalResponse = yield makeRequest(finalUrl, {
        headers: {
          "Referer": responseStep2.url,
          "Cookie": `${cookieName}=${cookieValue}`
        }
      });
      const metaHtml = yield finalResponse.text();
      const $3 = cheerio.load(metaHtml);
      const metaRefresh = $3('meta[http-equiv="refresh"]');
      if (metaRefresh.length > 0) {
        const content = metaRefresh.attr("content");
        const urlMatch = content.match(/url=(.*)/i);
        if (urlMatch && urlMatch[1]) {
          const driveleechUrl = urlMatch[1].replace(/"/g, "").replace(/'/g, "");
          console.log(`  [SID] SUCCESS! Resolved Driveleech URL: ${driveleechUrl}`);
          return driveleechUrl;
        }
      }
      console.error("  [SID] Error: Could not find meta refresh tag with Driveleech URL.");
      return null;
    } catch (error) {
      console.error(`  [SID] Error during SID resolution: ${error.message}`);
      return null;
    }
  });
}
function resolveDriveseedLink(driveseedUrl) {
  return __async(this, null, function* () {
    try {
      const response = yield makeRequest(driveseedUrl, {
        headers: {
          "Referer": "https://links.modpro.blog/"
        }
      });
      const html = yield response.text();
      const redirectMatch = html.match(/window\.location\.replace\("([^"]+)"\)/);
      if (redirectMatch && redirectMatch[1]) {
        const finalPath = redirectMatch[1];
        const finalUrl = `https://driveseed.org${finalPath}`;
        const finalResponse = yield makeRequest(finalUrl, {
          headers: {
            "Referer": driveseedUrl
          }
        });
        const finalHtml = yield finalResponse.text();
        const $ = cheerio.load(finalHtml);
        const downloadOptions = [];
        let size = null;
        let fileName = null;
        $("ul.list-group li").each((i, el) => {
          const text = $(el).text();
          if (text.includes("Size :")) {
            size = text.split(":")[1].trim();
          } else if (text.includes("Name :")) {
            fileName = text.split(":")[1].trim();
          }
        });
        const resumeCloudLink = $('a:contains("Resume Cloud")').attr("href");
        if (resumeCloudLink) {
          downloadOptions.push({
            title: "Resume Cloud",
            type: "resume",
            url: `https://driveseed.org${resumeCloudLink}`,
            priority: 1
          });
        }
        const workerSeedLink = $('a:contains("Resume Worker Bot")').attr("href");
        if (workerSeedLink) {
          downloadOptions.push({
            title: "Resume Worker Bot",
            type: "worker",
            url: workerSeedLink,
            priority: 2
          });
        }
        $('a[href*="/download/"]').each((i, el) => {
          const href = $(el).attr("href");
          const text = $(el).text().trim();
          if (href && text && !downloadOptions.some((opt) => opt.url === href)) {
            downloadOptions.push({
              title: text,
              type: "generic",
              url: href.startsWith("http") ? href : `https://driveseed.org${href}`,
              priority: 4
            });
          }
        });
        const instantDownloadLink = $('a:contains("Instant Download")').attr("href");
        if (instantDownloadLink) {
          downloadOptions.push({
            title: "Instant Download",
            type: "instant",
            url: instantDownloadLink,
            priority: 3
          });
        }
        downloadOptions.sort((a, b) => a.priority - b.priority);
        return { downloadOptions, size, fileName };
      }
      return { downloadOptions: [], size: null, fileName: null };
    } catch (error) {
      console.error(`[MoviesMod] Error resolving Driveseed link: ${error.message}`);
      return { downloadOptions: [], size: null, fileName: null };
    }
  });
}
function resolveResumeCloudLink(resumeUrl) {
  return __async(this, null, function* () {
    try {
      const response = yield makeRequest(resumeUrl, {
        headers: {
          "Referer": "https://driveseed.org/"
        }
      });
      const html = yield response.text();
      const $ = cheerio.load(html);
      const downloadLink = $('a:contains("Cloud Resume Download")').attr("href");
      return downloadLink || null;
    } catch (error) {
      console.error(`[MoviesMod] Error resolving Resume Cloud link: ${error.message}`);
      return null;
    }
  });
}
function resolveVideoSeedLink(videoSeedUrl) {
  return __async(this, null, function* () {
    try {
      const urlParams = new URLSearchParams(new URL(videoSeedUrl).search);
      const keys = urlParams.get("url");
      if (keys) {
        const apiUrl = `${new URL(videoSeedUrl).origin}/api`;
        const formData = new URLSearchParams();
        formData.append("keys", keys);
        const apiResponse = yield fetch(apiUrl, {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "x-token": new URL(videoSeedUrl).hostname,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        if (apiResponse.ok) {
          const responseData = yield apiResponse.json();
          if (responseData && responseData.url) {
            return responseData.url;
          }
        }
      }
      return null;
    } catch (error) {
      console.error(`[MoviesMod] Error resolving VideoSeed link: ${error.message}`);
      return null;
    }
  });
}
function validateVideoUrl(url, timeout = 1e4) {
  return __async(this, null, function* () {
    try {
      console.log(`[MoviesMod] Validating URL: ${url.substring(0, 100)}...`);
      const response = yield fetch(url, {
        method: "HEAD",
        headers: {
          "Range": "bytes=0-1",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (response.ok || response.status === 206) {
        console.log(`[MoviesMod] \u2713 URL validation successful (${response.status})`);
        return true;
      } else {
        console.log(`[MoviesMod] \u2717 URL validation failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`[MoviesMod] \u2717 URL validation failed: ${error.message}`);
      return false;
    }
  });
}
function processDownloadLink(link, selectedResult, mediaType, episodeNum) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(`[MoviesMod] Processing quality: ${link.quality}`);
      const finalLinks = yield resolveIntermediateLink(link.url, selectedResult.url, link.quality);
      if (!finalLinks || finalLinks.length === 0) {
        console.log(`[MoviesMod] No final links found for ${link.quality}`);
        return null;
      }
      let targetLinks = finalLinks;
      if ((mediaType === "tv" || mediaType === "series") && episodeNum !== null) {
        targetLinks = finalLinks.filter((targetLink) => {
          const serverName = targetLink.server.toLowerCase();
          const episodePatterns = [
            new RegExp(`episode\\s+${episodeNum}\\b`, "i"),
            new RegExp(`ep\\s+${episodeNum}\\b`, "i"),
            new RegExp(`e${episodeNum}\\b`, "i"),
            new RegExp(`\\b${episodeNum}\\b`)
          ];
          return episodePatterns.some((pattern) => pattern.test(serverName));
        });
        if (targetLinks.length === 0) {
          console.log(`[MoviesMod] No episode ${episodeNum} found for ${link.quality}`);
          return null;
        }
      }
      for (const targetLink of targetLinks) {
        try {
          let currentUrl = targetLink.url;
          if (currentUrl && (currentUrl.includes("tech.unblockedgames.world") || currentUrl.includes("tech.creativeexpressionsblog.com") || currentUrl.includes("tech.examzculture.in") || currentUrl.includes("tech.examdegree.site"))) {
            console.log(`[MoviesMod] Resolving SID link: ${targetLink.server}`);
            const resolvedUrl = yield resolveTechUnblockedLink(currentUrl);
            if (!resolvedUrl) {
              console.log(`[MoviesMod] Failed to resolve SID link for ${targetLink.server}`);
              continue;
            }
            if (resolvedUrl.includes("report-broken-links") || resolvedUrl.includes("moviesmod.wiki")) {
              console.log(`[MoviesMod] Skipping broken link report page for ${targetLink.server}`);
              continue;
            }
            currentUrl = resolvedUrl;
          }
          if (currentUrl && currentUrl.includes("driveseed.org")) {
            const { downloadOptions, size, fileName } = yield resolveDriveseedLink(currentUrl);
            if (!downloadOptions || downloadOptions.length === 0) {
              console.log(`[MoviesMod] No download options found for ${targetLink.server} - ${currentUrl}`);
              continue;
            }
            let finalDownloadUrl = null;
            let usedMethod = null;
            for (const option of downloadOptions) {
              try {
                console.log(`[MoviesMod] Trying ${option.title} for ${link.quality}...`);
                if (option.type === "resume" || option.type === "worker") {
                  finalDownloadUrl = yield resolveResumeCloudLink(option.url);
                } else if (option.type === "instant") {
                  finalDownloadUrl = yield resolveVideoSeedLink(option.url);
                } else if (option.type === "generic") {
                  finalDownloadUrl = option.url;
                }
                if (finalDownloadUrl) {
                  if (typeof URL_VALIDATION_ENABLED !== "undefined" && !URL_VALIDATION_ENABLED) {
                    usedMethod = option.title;
                    console.log(`[MoviesMod] \u2713 URL validation disabled, accepting ${usedMethod} result`);
                    break;
                  }
                  const isValid = yield validateVideoUrl(finalDownloadUrl);
                  if (isValid) {
                    usedMethod = option.title;
                    console.log(`[MoviesMod] \u2713 Successfully resolved using ${usedMethod}`);
                    break;
                  } else {
                    console.log(`[MoviesMod] \u2717 ${option.title} returned invalid URL`);
                    finalDownloadUrl = null;
                  }
                }
              } catch (error) {
                console.log(`[MoviesMod] \u2717 ${option.title} failed: ${error.message}`);
              }
            }
            if (finalDownloadUrl) {
              const actualQuality = extractQuality(link.quality);
              const sizeInfo = size || ((_a = link.quality.match(/\[([^\]]+)\]/)) == null ? void 0 : _a[1]);
              const cleanFileName = fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[._]/g, " ") : `Stream from ${link.quality}`;
              const techDetails = getTechDetails(link.quality);
              const techDetailsString = techDetails.length > 0 ? ` \u2022 ${techDetails.join(" \u2022 ")}` : "";
              return {
                name: `MoviesMod`,
                title: `${cleanFileName}
${sizeInfo || ""}${techDetailsString}`,
                url: finalDownloadUrl,
                quality: actualQuality,
                size: sizeInfo,
                fileName,
                type: "direct"
              };
            }
          }
        } catch (error) {
          console.error(`[MoviesMod] Error processing target link: ${error.message}`);
        }
      }
      return null;
    } catch (error) {
      console.error(`[MoviesMod] Error processing quality ${link.quality}: ${error.message}`);
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) {
  return __async(this, null, function* () {
    var _a, _b;
    console.log(`[MoviesMod] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${seasonNum ? `, S${seasonNum}E${episodeNum}` : ""}`);
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const tmdbResponse = yield makeRequest(tmdbUrl);
      const tmdbData = yield tmdbResponse.json();
      const title = mediaType === "tv" ? tmdbData.name : tmdbData.title;
      const year = mediaType === "tv" ? (_a = tmdbData.first_air_date) == null ? void 0 : _a.substring(0, 4) : (_b = tmdbData.release_date) == null ? void 0 : _b.substring(0, 4);
      const imdbId = tmdbData.external_ids ? tmdbData.external_ids.imdb_id : null;
      
      if (!title) {
        throw new Error("Could not extract title from TMDB response");
      }
      console.log(`[MoviesMod] TMDB Info: "${title}" (${year}) [IMDB: ${imdbId || 'N/A'}]`);
      
      let searchResults = [];
      let selectedResult = null;
      
      if (imdbId) {
        const imdbQuery = mediaType === "tv" && seasonNum ? `${imdbId} Season ${seasonNum}` : imdbId;
        console.log(`[MoviesMod] Trying IMDB ID search first: ${imdbQuery}`);
        searchResults = yield searchMoviesMod(imdbQuery);
        if (searchResults.length > 0) {
            console.log(`[MoviesMod] Found match using IMDB ID: ${searchResults[0].title}`);
            selectedResult = searchResults[0];
        }
      }

      if (!selectedResult) {
        console.log(`[MoviesMod] Falling back to title search for: ${title}`);
        const titleQuery = mediaType === "tv" && seasonNum ? `${title} Season ${seasonNum}` : title;
        searchResults = yield searchMoviesMod(titleQuery);
        if (searchResults.length === 0) {
          // If title+season fails, try just title
          searchResults = yield searchMoviesMod(title);
        }
        
        if (searchResults.length === 0) {
          console.log(`[MoviesMod] No search results found`);
          return [];
        }
        
        const titles = searchResults.map((r) => r.title);
        const bestMatch = findBestMatch(title, titles);
        console.log(`[MoviesMod] Best match for "${title}" is "${bestMatch.bestMatch.target}" with a rating of ${bestMatch.bestMatch.rating.toFixed(2)}`);
        
        if (bestMatch.bestMatch.rating > 0.3) {
          selectedResult = searchResults[bestMatch.bestMatchIndex];
          if (mediaType === "movie" && year) {
            if (!selectedResult.title.includes(year)) {
              console.warn(`[MoviesMod] Title match found, but year mismatch. Matched: "${selectedResult.title}", Expected year: ${year}. Discarding match.`);
              selectedResult = null;
            }
          }
        }
        
        if (!selectedResult) {
          console.log("[MoviesMod] Similarity match failed. Trying stricter search...");
          const titleRegex = new RegExp(`\\b${escapeRegExp(title.toLowerCase())}\\b`);
          if (mediaType === "movie") {
            selectedResult = searchResults.find(
              (r) => titleRegex.test(r.title.toLowerCase()) && (!year || r.title.includes(year))
            );
          } else {
            selectedResult = searchResults.find(
              (r) => titleRegex.test(r.title.toLowerCase()) && r.title.toLowerCase().includes("season")
            );
          }
        }
      }

      if (!selectedResult) {
        console.log(`[MoviesMod] No suitable search result found for "${title} (${year})"`);
        return [];
      }
      console.log(`[MoviesMod] Selected: ${selectedResult.title}`);
      const downloadLinks = yield extractDownloadLinks(selectedResult.url);
      if (downloadLinks.length === 0) {
        console.log(`[MoviesMod] No download links found`);
        return [];
      }
      let relevantLinks = downloadLinks;
      if ((mediaType === "tv" || mediaType === "series") && seasonNum !== null) {
        relevantLinks = downloadLinks.filter(
          (link) => link.quality.toLowerCase().includes(`season ${seasonNum}`) || link.quality.toLowerCase().includes(`s${seasonNum}`)
        );
      }
      relevantLinks = relevantLinks.filter((link) => !link.quality.toLowerCase().includes("480p"));
      console.log(`[MoviesMod] ${relevantLinks.length} links remaining after 480p filter.`);
      if (relevantLinks.length === 0) {
        console.log(`[MoviesMod] No relevant links found after filtering`);
        return [];
      }
      const streamPromises = relevantLinks.map((link) => __async(this, null, function* () {
        var _a2;
        try {
          const finalLinks = yield resolveIntermediateLink(link.url, selectedResult.url, link.quality);
          if (!finalLinks || finalLinks.length === 0) {
            console.log(`[MoviesMod] No final links found for ${link.quality}`);
            return null;
          }
          const processedStreams = [];
          for (const targetLink of finalLinks) {
            let currentUrl = targetLink.url;
            const isEpisodeLink = targetLink.server && targetLink.server.toLowerCase().includes("episode");
            console.log(`[MoviesMod] Processing link: server="${targetLink.server}", isEpisodeLink=${isEpisodeLink}, url=${targetLink.url.substring(0, 50)}...`);
            if (currentUrl.includes("tech.unblockedgames.world") || currentUrl.includes("tech.creativeexpressionsblog.com") || currentUrl.includes("tech.examzculture.in")) {
              const resolvedUrl = yield resolveTechUnblockedLink(currentUrl);
              if (!resolvedUrl)
                continue;
              currentUrl = resolvedUrl;
            }
            if (currentUrl && currentUrl.includes("driveseed.org")) {
              console.log(`[MoviesMod] Processing driveseed URL: ${currentUrl.substring(0, 80)}...`);
              const driveseedInfo = yield resolveDriveseedLink(currentUrl);
              console.log(`[MoviesMod] Driveseed info: ${driveseedInfo ? `options=${((_a2 = driveseedInfo.downloadOptions) == null ? void 0 : _a2.length) || 0}` : "null"}`);
              if (driveseedInfo && driveseedInfo.downloadOptions && driveseedInfo.downloadOptions.length > 0) {
                console.log(`[MoviesMod] Download options available: ${driveseedInfo.downloadOptions.map((opt) => `${opt.type}: ${opt.title}`).join(", ")}`);
                const sortedOptions = driveseedInfo.downloadOptions.sort((a, b) => a.priority - b.priority);
                let finalDownloadUrl = null;
                let usedMethod = null;
                for (const option of sortedOptions) {
                  console.log(`[MoviesMod] Trying ${option.title} (${option.type}) for ${link.quality}...`);
                  if (option.type === "resume" || option.type === "worker") {
                    finalDownloadUrl = yield resolveResumeCloudLink(option.url);
                    console.log(`[MoviesMod] Resume/Worker result: ${finalDownloadUrl ? "got URL" : "null"}`);
                  } else if (option.type === "instant") {
                    finalDownloadUrl = yield resolveVideoSeedLink(option.url);
                    console.log(`[MoviesMod] Instant API result: ${finalDownloadUrl ? "got URL" : "null"}`);
                    if (!finalDownloadUrl) {
                      finalDownloadUrl = option.url;
                      console.log(`[MoviesMod] Instant fallback: using URL directly`);
                    }
                  } else if (option.type === "generic") {
                    finalDownloadUrl = option.url;
                    console.log(`[MoviesMod] Generic result: using URL directly`);
                  }
                  if (finalDownloadUrl) {
                    const isValid = yield validateVideoUrl(finalDownloadUrl);
                    if (isValid) {
                      usedMethod = option.title;
                      console.log(`[MoviesMod] \u2713 Successfully resolved using ${usedMethod}`);
                      break;
                    } else {
                      console.log(`[MoviesMod] \u2717 ${option.title} returned invalid URL`);
                      finalDownloadUrl = null;
                    }
                  }
                }
                if (finalDownloadUrl) {
                  console.log(`[MoviesMod] URL validation: SUCCESS`);
                  if (isEpisodeLink && episodeNum !== null) {
                    const episodeFromServer = targetLink.server.match(/Episode\s+(\d+)/i);
                    console.log(`[MoviesMod] Episode filtering: server="${targetLink.server}", requested episode=${episodeNum}, found episode=${episodeFromServer ? episodeFromServer[1] : "none"}`);
                    if (episodeFromServer && parseInt(episodeFromServer[1]) !== episodeNum) {
                      console.log(`[MoviesMod] Skipping episode ${episodeFromServer[1]} (not episode ${episodeNum})`);
                      continue;
                    } else if (episodeFromServer && parseInt(episodeFromServer[1]) === episodeNum) {
                      console.log(`[MoviesMod] Processing episode ${episodeNum} - continuing...`);
                    }
                  }
                  const mediaTitle = mediaType === "tv" && seasonNum && episodeNum ? `${selectedResult.title} S${seasonNum.toString().padStart(2, "0")}E${episodeNum.toString().padStart(2, "0")}` : selectedResult.title;
                  processedStreams.push({
                    name: `MoviesMod ${targetLink.server || ""} - ${link.quality}`.trim(),
                    title: mediaTitle,
                    url: finalDownloadUrl,
                    quality: link.quality,
                    size: driveseedInfo.size || "Unknown",
                    headers: {
                      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                      "Referer": "https://driveseed.org/"
                    },
                    provider: "moviesmod"
                  });
                  break;
                }
              }
            }
          }
          const result = processedStreams.length > 0 ? processedStreams[0] : null;
          console.log(`[MoviesMod] Returning ${result ? "stream" : "null"} for ${link.quality}`);
          return result;
        } catch (error) {
          console.error(`[MoviesMod] Error processing link ${link.quality}: ${error.message}`);
          return null;
        }
      }));
      const rawStreams = yield Promise.all(streamPromises);
      console.log(`[MoviesMod] Raw streams before filtering: ${rawStreams.length}`);
      rawStreams.forEach((stream, i) => {
        console.log(`  [${i}] ${stream ? "VALID" : "NULL"}`);
      });
      const streams = rawStreams.filter(Boolean);
      console.log(`[MoviesMod] Streams after null filtering: ${streams.length}`);
      streams.sort((a, b) => {
        const qualityA = parseQualityForSort(a.quality);
        const qualityB = parseQualityForSort(b.quality);
        return qualityB - qualityA;
      });
      console.log(`[MoviesMod] Successfully processed ${streams.length} streams`);
      return streams;
    } catch (error) {
      console.error(`[MoviesMod] Error in getStreams: ${error.message}`);
      return [];
    }
  });
}

(function __cbWrapExport() {
  var __cbCoreGetStreams = getStreams;
  getStreams = function (tmdbId, mediaType, season, episode) {
    return __cbRepoEntry(__cbCoreGetStreams, 'moviesmod', tmdbId, mediaType, season, episode);
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
  }
  if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
  }
})();
