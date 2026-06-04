/**
 * CineStream for Nuvio (ported from cbdoglolz/CSX CineStream)
 * Aggregates lightweight API backends from CineStreamExtractors — not the full CS meta catalog.
 */
"use strict";

var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
var ENC_DEC_API = "https://enc-dec.app/api";
var HEXA_API = "https://theemoviedb.hexa.su";
var XPASS_API = "https://play.xpass.top";
var VIDEASY_API = "https://api.videasy.net";
var VIDEASY_HEADERS = {
  Accept: "*/*",
  "User-Agent": USER_AGENT,
  Origin: "https://www.cineby.sc",
  Referer: "https://www.cineby.sc/",
};
var BACKEND_TIMEOUT_MS = 22000;

function fetchText(url, options) {
  options = options || {};
  var headers = options.headers || {};
  var h = {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
  };
  var k;
  for (k in headers) {
    if (headers.hasOwnProperty(k)) h[k] = headers[k];
  }
  return fetch(url, {
    method: options.method || "GET",
    headers: h,
    body: options.body || undefined,
  }).then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.text();
  });
}

function fetchJson(url, options) {
  return fetchText(url, options).then(function (t) {
    return JSON.parse(t);
  });
}

function withTimeout(promise, ms, label) {
  return new Promise(function (resolve) {
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      console.log("[CineStream] " + label + " timed out");
      resolve([]);
    }, ms);
    promise
      .then(function (r) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(r || []);
      })
      .catch(function (e) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        console.log("[CineStream] " + label + " failed: " + (e && e.message ? e.message : e));
        resolve([]);
      });
  });
}

function normalizeStream(name, title, url, quality, type, headers) {
  if (!url || url.indexOf("http") !== 0) return null;
  return {
    name: name,
    title: title || name,
    url: url,
    quality: quality || "Unknown",
    type: type || (url.indexOf(".m3u8") >= 0 ? "m3u8" : "direct"),
    headers: headers || { Referer: USER_AGENT, "User-Agent": USER_AGENT },
  };
}

function getTmdbInfo(tmdbId, mediaType) {
  var ep = mediaType === "tv" ? "tv" : "movie";
  var url =
    "https://api.themoviedb.org/3/" +
    ep +
    "/" +
    tmdbId +
    "?api_key=" +
    TMDB_API_KEY +
    "&append_to_response=external_ids";
  return fetchJson(url).then(function (data) {
    var title = mediaType === "tv" ? data.name : data.title;
    var date = mediaType === "tv" ? data.first_air_date : data.release_date;
    var year = date ? parseInt(String(date).substring(0, 4), 10) : null;
    var imdb =
      data.external_ids && data.external_ids.imdb_id
        ? data.external_ids.imdb_id
        : data.imdb_id || null;
    return { title: title, year: year, imdbId: imdb, data: data };
  });
}

function randomHexKey32() {
  var s = "";
  var i;
  for (i = 0; i < 32; i++) {
    var b = Math.floor(Math.random() * 256);
    var h = b.toString(16);
    if (h.length < 2) h = "0" + h;
    s += h;
  }
  return s;
}

/** Vidflix — madplay holly API (CSX invokeVidflix) */
function fetchVidflix(tmdbId, mediaType, season, episode) {
  var url =
    mediaType === "movie"
      ? "https://madplay.site/api/movies/holly?id=" + tmdbId + "&token=direct"
      : "https://madplay.site/api/movies/holly?id=" +
        tmdbId +
        "&season=" +
        season +
        "&episode=" +
        episode +
        "&token=direct";
  return fetchText(url)
    .then(function (text) {
      var arr = JSON.parse(text);
      var out = [];
      var i;
      for (i = 0; i < arr.length; i++) {
        var item = arr[i];
        if (!item || !item.file) continue;
        var hdrs = item.headers || {};
        var s = normalizeStream(
          "CineStream",
          "Vidflix",
          item.file,
          "Auto",
          "m3u8",
          {
            Referer: hdrs.Referer || "https://madplay.site/",
            Origin: hdrs.Origin || "https://madplay.site/",
            "User-Agent": USER_AGENT,
          }
        );
        if (s) out.push(s);
      }
      return out;
    });
}

/** Playsrc — madplay playsrc API (CSX invokePlaysrc) */
function fetchPlaysrc(tmdbId, mediaType, season, episode) {
  var url =
    mediaType === "movie"
      ? "https://api.madplay.site/api/playsrc?id=" + tmdbId + "&token=direct"
      : "https://madplay.site/api/movies/holly?id=" +
        tmdbId +
        "&season=" +
        season +
        "&episode=" +
        episode +
        "&token=direct";
  return fetchText(url)
    .then(function (text) {
      var list = JSON.parse(text);
      if (!list || !list.length || !list[0].file) return [];
      var item = list[0];
      var hdrs = item.headers || {};
      var s = normalizeStream(
        "CineStream",
        "Playsrc",
        item.file,
        "Auto",
        "m3u8",
        {
          Referer: hdrs.Referer || "https://madplay.site/",
          Origin: hdrs.Origin || "https://madplay.site/",
          "User-Agent": USER_AGENT,
        }
      );
      return s ? [s] : [];
    });
}

/** Hexa — enc-dec.app (CSX invokeHexa) */
function fetchHexa(tmdbId, mediaType, season, episode) {
  var hexaUrl =
    mediaType === "movie"
      ? HEXA_API + "/api/tmdb/movie/" + tmdbId + "/images"
      : HEXA_API +
        "/api/tmdb/tv/" +
        tmdbId +
        "/season/" +
        season +
        "/episode/" +
        episode +
        "/images";
  var key = randomHexKey32();
  return fetchJson(ENC_DEC_API + "/enc-hexa")
    .then(function (tok) {
      var token = tok.result && tok.result.token ? tok.result.token : tok.token;
      if (!token) throw new Error("no hexa token");
      var headers = {
        "User-Agent": USER_AGENT,
        Accept: "text/plain",
        "X-Api-Key": key,
        "X-Fingerprint-Lite": "e9136c41504646444",
        Referer: "https://hexa.su/",
        "X-Cap-Token": token,
      };
      return fetchText(hexaUrl, { headers: headers }).then(function (enc) {
        return fetch(ENC_DEC_API + "/dec-hexa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({ text: enc, key: key }),
        }).then(function (res) {
          if (!res.ok) throw new Error("dec-hexa " + res.status);
          return res.json();
        });
      });
    })
    .then(function (dec) {
      var sources = dec.result && dec.result.sources ? dec.result.sources : [];
      var out = [];
      var i;
      for (i = 0; i < sources.length; i++) {
        var src = sources[i];
        if (!src || !src.url) continue;
        var s = normalizeStream(
          "CineStream",
          "Hexa " + (src.server || "stream"),
          src.url,
          "Auto",
          "m3u8",
          { Referer: "https://hexa.su/", "User-Agent": USER_AGENT }
        );
        if (s) out.push(s);
      }
      return out;
    });
}

/** Xpass (CSX invokeXpass + extractXpassBackups) */
function extractXpassBackups(html) {
  var mark = "var backups=";
  var idx = html.indexOf(mark);
  if (idx < 0) return [];
  var start = html.indexOf("[", idx + mark.length);
  if (start < 0) return [];
  var depth = 0;
  var i;
  var end = -1;
  for (i = start; i < html.length; i++) {
    var ch = html.charAt(i);
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return [];
  try {
    var arr = JSON.parse(html.substring(start, end + 1));
    var out = [];
    for (i = 0; i < arr.length; i++) {
      if (arr[i].name && arr[i].url) out.push({ name: arr[i].name, url: arr[i].url });
    }
    return out;
  } catch (e) {
    return [];
  }
}

function fetchXpass(tmdbId, mediaType, season, episode) {
  var embed =
    mediaType === "movie"
      ? XPASS_API + "/e/movie/" + tmdbId
      : XPASS_API + "/e/tv/" + tmdbId + "/" + season + "/" + episode;
  return fetchText(embed, {
    headers: { Referer: XPASS_API + "/", "User-Agent": USER_AGENT },
  }).then(function (html) {
    var backups = extractXpassBackups(html);
    var jobs = [];
    var i;
    for (i = 0; i < backups.length && i < 3; i++) {
      (function (b) {
        jobs.push(
          fetchJson(
            b.url.indexOf("http") === 0 ? b.url : XPASS_API + b.url,
            { headers: { Referer: XPASS_API + "/" } }
          ).then(function (json) {
            var pl = json.playlist && json.playlist[0] && json.playlist[0].sources;
            if (!pl) return [];
            var streams = [];
            var j;
            for (j = 0; j < pl.length; j++) {
              var file = pl[j].file;
              if (!file || file.indexOf("http") !== 0) continue;
              var isHls =
                (pl[j].type && String(pl[j].type).toLowerCase().indexOf("hls") >= 0) ||
                file.indexOf(".m3u8") >= 0 ||
                file.indexOf("master") >= 0;
              var s = normalizeStream(
                "CineStream",
                "Xpass [" + b.name + "]",
                file,
                "Auto",
                isHls ? "m3u8" : "direct",
                { Referer: XPASS_API + "/", "User-Agent": USER_AGENT }
              );
              if (s) streams.push(s);
            }
            return streams;
          })
        );
      })(backups[i]);
    }
    if (!jobs.length) return [];
    return Promise.all(jobs).then(function (parts) {
      var all = [];
      for (i = 0; i < parts.length; i++) all = all.concat(parts[i]);
      return all;
    });
  });
}

/** Videasy — subset of servers (CSX invokeVideasy) */
function fetchVideasyServer(server, meta, mediaType, season, episode) {
  if (!meta.title) return Promise.resolve([]);
  var encTitle = encodeURIComponent(encodeURIComponent(meta.title));
  var q =
    "title=" +
    encTitle +
    "&mediaType=" +
    (mediaType === "movie" ? "movie" : "tv") +
    "&year=" +
    (meta.year || "") +
    "&tmdbId=" +
    meta.tmdbId +
    "&imdbId=" +
    (meta.imdbId || "");
  if (mediaType === "tv") {
    q += "&episodeId=" + episode + "&seasonId=" + season;
  }
  var url = VIDEASY_API + "/" + server + "/sources-with-title?" + q;
  return fetchText(url, { headers: VIDEASY_HEADERS })
    .then(function (enc) {
      return fetch(ENC_DEC_API + "/dec-videasy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
        body: JSON.stringify({ text: enc, id: meta.tmdbId }),
      }).then(function (res) {
        if (!res.ok) throw new Error("dec-videasy");
        return res.json();
      });
    })
    .then(function (dec) {
      var sources = dec.result && dec.result.sources ? dec.result.sources : [];
      var out = [];
      var i;
      for (i = 0; i < sources.length; i++) {
        var src = sources[i];
        if (!src || !src.url) continue;
        var s = normalizeStream(
          "CineStream",
          "Videasy[" + server + "] " + (src.quality || ""),
          src.url,
          src.quality || "Auto",
          src.url.indexOf(".m3u8") >= 0 ? "m3u8" : "direct",
          VIDEASY_HEADERS
        );
        if (s) out.push(s);
      }
      return out;
    });
}

function fetchVideasy(meta, mediaType, season, episode) {
  var servers = ["cdn", "moviebox", "primesrcme"];
  var jobs = [];
  var i;
  for (i = 0; i < servers.length; i++) {
    jobs.push(
      fetchVideasyServer(servers[i], meta, mediaType, season, episode).catch(function () {
        return [];
      })
    );
  }
  return Promise.all(jobs).then(function (parts) {
    var all = [];
    for (i = 0; i < parts.length; i++) all = all.concat(parts[i]);
    return all;
  });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  console.log(
    "[CineStream] getStreams tmdb=" +
      tmdbId +
      " type=" +
      mediaType +
      " S" +
      seasonNum +
      "E" +
      episodeNum
  );
  var type = mediaType === "series" || mediaType === "tv" ? "tv" : "movie";
  var season = type === "tv" ? parseInt(seasonNum, 10) || 1 : null;
  var episode = type === "tv" ? parseInt(episodeNum, 10) || 1 : null;

  return getTmdbInfo(tmdbId, type)
    .then(function (info) {
      if (!info.title) return [];
      var meta = {
        title: info.title,
        year: info.year,
        imdbId: info.imdbId,
        tmdbId: parseInt(tmdbId, 10),
      };
      var backends = [
        withTimeout(fetchVidflix(tmdbId, type, season, episode), BACKEND_TIMEOUT_MS, "Vidflix"),
        withTimeout(fetchPlaysrc(tmdbId, type, season, episode), BACKEND_TIMEOUT_MS, "Playsrc"),
        withTimeout(fetchHexa(tmdbId, type, season, episode), BACKEND_TIMEOUT_MS, "Hexa"),
        withTimeout(fetchXpass(tmdbId, type, season, episode), BACKEND_TIMEOUT_MS, "Xpass"),
        withTimeout(fetchVideasy(meta, type, season, episode), BACKEND_TIMEOUT_MS, "Videasy"),
      ];
      return Promise.all(backends).then(function (parts) {
        var streams = [];
        var i;
        for (i = 0; i < parts.length; i++) streams = streams.concat(parts[i]);
        console.log("[CineStream] Returning " + streams.length + " stream(s)");
        return streams;
      });
    })
    .catch(function (e) {
      console.log("[CineStream] Error: " + (e && e.message ? e.message : e));
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
