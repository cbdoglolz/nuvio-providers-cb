/**
 * vixsrc - Built from src/vixsrc/
 * Generated: 2025-12-31T21:23:16.687Z
 */
"use strict";
var __defProp = Object.defineProperty;
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

// src/vixsrc/constants.js
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
var BASE_URL = "https://vixsrc.to";
var USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// src/vixsrc/http.js
function makeRequest(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const defaultHeaders = __spreadValues({
      "User-Agent": USER_AGENT,
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
      if ((response.status === 403 || response.status === 503) && typeof Cloudflare !== "undefined" && Cloudflare.solve) {
        console.log(`[Vixsrc] Cloudflare challenge detected for ${url}, requesting solver`);
        const solved = yield Cloudflare.solve(url);
        const retryHeaders = __spreadValues({}, defaultHeaders);
        if (solved && solved.Cookie)
          retryHeaders.Cookie = solved.Cookie;
        if (solved && solved["User-Agent"])
          retryHeaders["User-Agent"] = solved["User-Agent"];
        const retryResponse = yield fetch(url, __spreadValues(__spreadValues({
          method: options.method || "GET",
          headers: retryHeaders
        }, options), { headers: retryHeaders }));
        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
        }
        return retryResponse;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error(`[Vixsrc] Request failed for ${url}: ${error.message}`);
      throw error;
    }
  });
}

// src/vixsrc/tmdb.js
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
    console.log(`[Vixsrc] TMDB Info: "${title}" (${year})`);
    return { title, year, data };
  });
}

// src/vixsrc/extractor.js
function extractStreamFromPage(contentType, contentId, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    let vixsrcUrl;
    let apiUrl;
    let subtitleApiUrl;
    if (contentType === "movie") {
      vixsrcUrl = `${BASE_URL}/movie/${contentId}`;
      apiUrl = `${BASE_URL}/api/movie/${contentId}`;
      subtitleApiUrl = `https://sub.wyzie.ru/search?id=${contentId}`;
    } else {
      vixsrcUrl = `${BASE_URL}/tv/${contentId}/${seasonNum}/${episodeNum}`;
      apiUrl = `${BASE_URL}/api/tv/${contentId}/${seasonNum}/${episodeNum}`;
      subtitleApiUrl = `https://sub.wyzie.ru/search?id=${contentId}&season=${seasonNum}&episode=${episodeNum}`;
    }
    console.log(`[Vixsrc] Fetching: ${vixsrcUrl}`);
    let html = "";
    try {
      const apiResponse = yield makeRequest(apiUrl, {
        headers: {
          "Accept": "application/json,*/*",
          "Referer": vixsrcUrl
        }
      });
      const apiData = yield apiResponse.json();
      if (apiData && apiData.src) {
        const embedUrl = apiData.src.startsWith("http") ? apiData.src : `${BASE_URL}${apiData.src}`;
        console.log(`[Vixsrc] Fetching embed: ${embedUrl}`);
        const embedResponse = yield makeRequest(embedUrl, {
          headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Referer": vixsrcUrl
          }
        });
        html = yield embedResponse.text();
      }
    } catch (apiError) {
      console.log(`[Vixsrc] API/embed fetch failed, falling back to page HTML: ${apiError.message}`);
    }
    if (!html) {
      const response = yield makeRequest(vixsrcUrl, {
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      html = yield response.text();
    }
    console.log(`[Vixsrc] HTML length: ${html.length} characters`);
    let masterPlaylistUrl = null;
    if (html.includes("window.masterPlaylist")) {
      console.log("[Vixsrc] Found window.masterPlaylist");
      const urlMatch = html.match(/url:\s*['"]([^'"]+)['"]/);
      const tokenMatch = html.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
      const expiresMatch = html.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);
      if (urlMatch && tokenMatch && expiresMatch) {
        const baseUrl = urlMatch[1];
        const token = tokenMatch[1];
        const expires = expiresMatch[1];
        console.log("[Vixsrc] Extracted tokens:");
        console.log(`  - Base URL: ${baseUrl}`);
        console.log(`  - Token: ${token.substring(0, 20)}...`);
        console.log(`  - Expires: ${expires}`);
        if (baseUrl.includes("?b=1")) {
          masterPlaylistUrl = `${baseUrl}&token=${token}&expires=${expires}&h=1&lang=en`;
        } else {
          masterPlaylistUrl = `${baseUrl}?token=${token}&expires=${expires}&h=1&lang=en`;
        }
        console.log(`[Vixsrc] Constructed master playlist URL: ${masterPlaylistUrl}`);
      }
    }
    if (!masterPlaylistUrl) {
      const m3u8Match = html.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
      if (m3u8Match) {
        masterPlaylistUrl = m3u8Match[1];
        console.log("[Vixsrc] Found direct .m3u8 URL:", masterPlaylistUrl);
      }
    }
    if (!masterPlaylistUrl) {
      const scriptMatches = html.match(new RegExp("<script[^>]*>(.*?)<\\/script>", "gs"));
      if (scriptMatches) {
        for (const script of scriptMatches) {
          const streamMatch = script.match(/['"]?(https?:\/\/[^'"\s]+(?:\.m3u8|playlist)[^'"\s]*)/);
          if (streamMatch) {
            masterPlaylistUrl = streamMatch[1];
            console.log("[Vixsrc] Found stream in script:", masterPlaylistUrl);
            break;
          }
        }
      }
    }
    if (!masterPlaylistUrl) {
      console.log("[Vixsrc] No master playlist URL found");
      return null;
    }
    return { masterPlaylistUrl, subtitleApiUrl };
  });
}

function resolveM3u8Url(url, baseUrl) {
  if (url.startsWith("http"))
    return url;
  try {
    return new URL(url, baseUrl).href;
  } catch (e) {
    return url;
  }
}
function getQualityFromResolution(resolution) {
  if (!resolution)
    return "Auto";
  const parts = resolution.split("x").map(Number);
  const height = parts[1] || parts[0];
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
function formatBitrate(bps) {
  if (!bps || bps <= 0)
    return "";
  if (bps >= 1e6)
    return (bps / 1e6).toFixed(1) + " Mbps";
  return Math.round(bps / 1e3) + " Kbps";
}
function parseMasterM3u8(content, baseUrl) {
  const lines = content.split("\n").map((line) => line.trim()).filter((line) => line);
  const streams = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      current = { bandwidth: null, resolution: null, url: null };
      const bw = line.match(/BANDWIDTH=(\d+)/i);
      if (bw)
        current.bandwidth = parseInt(bw[1], 10);
      const res = line.match(/RESOLUTION=(\d+x\d+)/i);
      if (res)
        current.resolution = res[1];
    } else if (current && !line.startsWith("#")) {
      current.url = resolveM3u8Url(line, baseUrl);
      streams.push(current);
      current = null;
    }
  }
  return streams;
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
function buildStreamsFromMaster(masterPlaylistUrl, displayTitle) {
  return __async(this, null, function* () {
    const headers = {
      Referer: BASE_URL + "/",
      Origin: BASE_URL,
      "User-Agent": USER_AGENT,
      Accept: "*/*"
    };
    const masterStream = {
      name: "Vixsrc",
      title: displayTitle,
      url: masterPlaylistUrl,
      quality: "Auto",
      type: "direct",
      headers,
      provider: "vixsrc"
    };
    try {
      const response = yield makeRequest(masterPlaylistUrl, { headers });
      const text = yield response.text();
      if (text.indexOf("#EXTM3U") < 0) {
        console.log("[Vixsrc] Invalid master playlist body — still returning master URL");
      } else {
        console.log("[Vixsrc] Master playlist OK — single adaptive stream for playback");
      }
    } catch (e) {
      console.log("[Vixsrc] Master playlist probe failed, returning URL anyway:", e.message);
    }
    return [masterStream];
  });
}

// src/vixsrc/subtitles.js
function getSubtitles(subtitleApiUrl) {
  return __async(this, null, function* () {
    try {
      const response = yield makeRequest(subtitleApiUrl);
      const subtitleData = yield response.json();
      let subtitleTrack = subtitleData.find(
        (track) => track.display.includes("English") && (track.encoding === "ASCII" || track.encoding === "UTF-8")
      );
      if (!subtitleTrack) {
        subtitleTrack = subtitleData.find(
          (track) => track.display.includes("English") && track.encoding === "CP1252"
        );
      }
      if (!subtitleTrack) {
        subtitleTrack = subtitleData.find(
          (track) => track.display.includes("English") && track.encoding === "CP1250"
        );
      }
      if (!subtitleTrack) {
        subtitleTrack = subtitleData.find(
          (track) => track.display.includes("English") && track.encoding === "CP850"
        );
      }
      const subtitles = subtitleTrack ? subtitleTrack.url : "";
      console.log(
        subtitles ? `[Vixsrc] Found subtitles: ${subtitles}` : "[Vixsrc] No English subtitles found"
      );
      return subtitles;
    } catch (error) {
      console.log("[Vixsrc] Subtitle fetch failed:", error.message);
      return "";
    }
  });
}

// src/vixsrc/index.js
function getStreams(tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) {
  return __async(this, null, function* () {
    console.log(`[Vixsrc] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    try {
      const tmdbInfo = yield getTmdbInfo(tmdbId, mediaType);
      const { title, year } = tmdbInfo;
      console.log(`[Vixsrc] Title: "${title}" (${year})`);
      const streamData = yield extractStreamFromPage(mediaType, tmdbId, seasonNum, episodeNum);
      if (!streamData) {
        console.log("[Vixsrc] No stream data found");
        return [];
      }
      const { masterPlaylistUrl, subtitleApiUrl } = streamData;
      yield getSubtitles(subtitleApiUrl);
      const displayTitle = year ? `${title} (${year})` : title;
      const nuvioStreams = yield buildStreamsFromMaster(masterPlaylistUrl, displayTitle);
      console.log(`[Vixsrc] Returning ${nuvioStreams.length} stream(s)`);
      return nuvioStreams;
    } catch (error) {
      console.error(`[Vixsrc] Error in getStreams: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
