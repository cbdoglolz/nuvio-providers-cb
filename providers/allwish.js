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

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
