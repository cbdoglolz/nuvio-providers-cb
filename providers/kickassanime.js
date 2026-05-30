"use strict";

var CryptoJS = require("crypto-js");

var MAIN_URL = "https://kaa.lt";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var VID_KEY = "e13d38099bf562e8b9851a652d2043d3";
var sessionCookie = null;

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

function apiHeaders(extra) {
  return Object.assign({
    "Accept": "application/json, */*",
    "User-Agent": UA,
    "Referer": MAIN_URL + "/",
    "Origin": MAIN_URL,
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
  return fetchTextWithCf(MAIN_URL + "/", { method: "GET", headers: { Accept: "text/html,*/*" } }).catch(function () {
    return "";
  });
}

function getTmdbDetails(tmdbId, mediaType) {
  var type = mediaType === "tv" ? "tv" : "movie";
  var url = "https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&append_to_response=external_ids";
  return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
    return {
      title: d.title || d.name || "",
      originalTitle: d.original_title || d.original_name || "",
      imdbId: d.external_ids && d.external_ids.imdb_id
    };
  }).catch(function () {
    return { title: "", originalTitle: "", imdbId: null };
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
  function add(q) {
    q = String(q || "").replace(/\s+/g, " ").trim();
    if (!q || q.length < 2 || seen[q.toLowerCase()]) return;
    seen[q.toLowerCase()] = true;
    out.push(q);
  }

  function expandTitle(base) {
    if (!base) return;
    add(base);
    add(base.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim());
    add(base.replace(/[:._-]+/g, " ").trim());
    add(base.replace(/\s+/g, ""));
    if (base.indexOf(":") >= 0) {
      var parts = base.split(/[:：]/);
      add(parts[0].trim());
      add(parts.slice(1).join(" ").trim());
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

function searchAnime(query) {
  var body = JSON.stringify({ page: "1", query: query });
  return fetchJsonApi(MAIN_URL + "/api/fsearch", {
    method: "POST",
    body: body
  }).then(function (data) {
    return data && data.result ? data.result : [];
  });
}

function searchWithQueries(queries) {
  var idx = 0;
  function next() {
    if (idx >= queries.length) return Promise.resolve([]);
    var q = queries[idx++];
    console.log("[KickassAnime] Search: " + q);
    return searchAnime(q).then(function (results) {
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
    var url = MAIN_URL + "/api/show" + showPath + "/episodes?ep=" + page + "&lang=ja-JP";
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

  return warmSession().then(function () {
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
          var epUrl = MAIN_URL + "/api/show" + showPath + "/episode/ep-" + epNum + "-" + epSlug;
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

module.exports = { getStreams };
