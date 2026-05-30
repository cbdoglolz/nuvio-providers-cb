"use strict";

var CryptoJS = require("crypto-js");

var MAIN_URL = "https://kaa.lt";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var VID_KEY = "e13d38099bf562e8b9851a652d2043d3";
var SEARCH_HEADERS = {
  "Accept": "*/*",
  "User-Agent": UA,
  "Content-Type": "application/json",
  "x-origin": "kickass-anime.ru"
};

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
  if (hex.length % 2 !== 0) return "";
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

function fetchWithCf(url, options) {
  options = options || {};
  var headers = Object.assign({ "User-Agent": UA }, options.headers || {});
  return fetch(url, Object.assign({}, options, { headers: headers })).then(function (res) {
    if ((res.status === 403 || res.status === 503) && typeof Cloudflare !== "undefined" && Cloudflare.solve) {
      console.log("[KickassAnime] Cloudflare challenge for " + url);
      return Cloudflare.solve(url).then(function (solved) {
        var retryHeaders = Object.assign({}, headers);
        if (solved && solved.Cookie) retryHeaders.Cookie = solved.Cookie;
        if (solved && solved["User-Agent"]) retryHeaders["User-Agent"] = solved["User-Agent"];
        return fetch(url, Object.assign({}, options, { headers: retryHeaders }));
      });
    }
    return res;
  });
}

function fetchJson(url, options) {
  return fetchWithCf(url, options).then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
    return res.json();
  });
}

function fetchText(url, options) {
  return fetchWithCf(url, options).then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
    return res.text();
  });
}

function resolveHost() {
  return fetchWithCf(MAIN_URL, { redirect: "manual" }).then(function (res) {
    var loc = res.headers.get("location");
    if (loc) {
      if (!loc.endsWith("/")) loc += "/";
      return loc;
    }
    return MAIN_URL + "/";
  }).catch(function () {
    return MAIN_URL + "/";
  });
}

function getTmdbDetails(tmdbId, mediaType) {
  var type = mediaType === "tv" ? "tv" : "movie";
  var url = "https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?api_key=" + TMDB_API_KEY;
  return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
    return {
      title: d.title || d.name || "",
      originalTitle: d.original_title || d.original_name || ""
    };
  }).catch(function () {
    return { title: "", originalTitle: "" };
  });
}

function buildSearchQueries(info, season) {
  var out = [];
  var seen = {};
  function add(q) {
    q = String(q || "").trim();
    if (!q || seen[q.toLowerCase()]) return;
    seen[q.toLowerCase()] = true;
    out.push(q);
  }
  [info.title, info.originalTitle].forEach(function (base) {
    if (!base) return;
    add(base);
    add(base.replace(/[:._-]+/g, " "));
    if (season && parseInt(season, 10) > 1) {
      add(base + " Season " + season);
    }
  });
  return out;
}

function searchAnime(host, query) {
  var body = JSON.stringify({ page: "1", query: query });
  return fetchJson(host + "api/fsearch", {
    method: "POST",
    headers: SEARCH_HEADERS,
    body: body
  }).then(function (data) {
    return data && data.result ? data.result : [];
  });
}

function searchWithQueries(host, queries) {
  var idx = 0;
  function next() {
    if (idx >= queries.length) return Promise.resolve([]);
    var q = queries[idx++];
    return searchAnime(host, q).then(function (results) {
      if (results && results.length) return results;
      return next();
    }).catch(function () {
      return next();
    });
  }
  return next();
}

function pickBestResult(results, info, season) {
  if (!results || !results.length) return null;
  var want = normalizeTitle(info.title);
  var wantOrig = normalizeTitle(info.originalTitle);
  var seasonNum = parseInt(season, 10) || 1;
  var best = null;
  var bestScore = 0;
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var title = r.title_en || r.title || "";
    var norm = normalizeTitle(title);
    var score = 0;
    if (norm === want || norm === wantOrig) score += 1;
    else if (want && (norm.indexOf(want) >= 0 || want.indexOf(norm) >= 0)) score += 0.7;
    else if (wantOrig && (norm.indexOf(wantOrig) >= 0 || wantOrig.indexOf(norm) >= 0)) score += 0.65;
    if (seasonNum > 1 && /season\s*0*(\d+)/i.test(title)) {
      var sm = title.match(/season\s*0*(\d+)/i);
      if (sm && parseInt(sm[1], 10) === seasonNum) score += 0.25;
    }
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= 0.5 ? best : (results[0] || null);
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
  var headers = {
    Origin: base,
    Referer: serverSrc,
    "User-Agent": UA
  };
  return {
    name: "KickassAnime | " + serverLabel,
    title: serverLabel,
    url: videoUrl,
    quality: "1080p",
    headers: headers,
    provider: "kickassanime"
  };
}

function extractVidStreaming(server, streams) {
  var host = getBaseUrl(server.src);
  var query = server.src.split("?id=")[1].split("&")[0];
  return fetchText(server.src, { headers: { "User-Agent": UA } }).then(function (html) {
    var direct = html.match(/(https?:)?\/\/[^\s"'<>]+\.m3u8/i);
    if (direct) {
      streams.push({
        name: "KickassAnime | VidStreaming",
        title: "VidStreaming",
        url: httpsify(direct[0]),
        quality: "1080p",
        headers: {
          Accept: "*/*",
          Origin: host,
          Referer: server.src,
          "User-Agent": UA
        },
        provider: "kickassanime"
      });
      return;
    }
    var sigInfo = getSignature(html, server.name, query);
    if (!sigInfo) return;
    var sourceUrl = host + sigInfo.route + "?id=" + query + "&e=" + sigInfo.timeStamp + "&s=" + sigInfo.sig;
    return fetchJson(sourceUrl, { headers: { "User-Agent": UA } }).then(function (payload) {
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
        headers: {
          Accept: "*/*",
          Origin: host,
          Referer: server.src,
          "User-Agent": UA
        },
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
    return fetchText(server.src, {
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

  return getTmdbDetails(tmdbId, mediaType).then(function (info) {
    if (!info.title && !info.originalTitle) return [];
    return resolveHost().then(function (host) {
      var queries = buildSearchQueries(info, mediaType === "tv" ? seasonNum : 0);
      return searchWithQueries(host, queries).then(function (results) {
        var match = pickBestResult(results, info, seasonNum);
        if (!match || !match.slug) {
          console.log("[KickassAnime] No search match");
          return [];
        }
        var showPath = match.slug.startsWith("/") ? match.slug : "/" + match.slug;
        return fetchJson(host + "api/show" + showPath + "/episodes?ep=1&lang=ja-JP").then(function (epData) {
          var eps = epData && epData.result ? epData.result : [];
          var target = null;
          for (var i = 0; i < eps.length; i++) {
            var n = Math.floor(Number(eps[i].episode_number));
            if (n === epNum) {
              target = eps[i];
              break;
            }
          }
          if (!target) {
            console.log("[KickassAnime] Episode " + epNum + " not found (" + eps.length + " eps listed)");
            return [];
          }
          var epSlug = target.slug;
          var epUrl = host + "api/show" + showPath + "/episode/ep-" + epNum + "-" + epSlug;
          return fetchJson(epUrl).then(function (payload) {
            var servers = payload && payload.servers ? payload.servers : [];
            if (!servers.length) return [];
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

module.exports = { getStreams };
