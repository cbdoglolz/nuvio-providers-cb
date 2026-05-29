/**
 * 4khdhub - Built from src/4khdhub/
 * Generated: 2025-12-31T21:33:16.718Z
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

// src/4khdhub/constants.js
var BASE_URL = "https://4khdhub.click";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";

// src/4khdhub/utils.js
var domainCache = { url: BASE_URL, ts: 0 };
function fetchLatestDomain() {
  return __async(this, null, function* () {
    const now = Date.now();
    if (now - domainCache.ts < 36e5) return domainCache.url;
    try {
      const response = yield fetch(DOMAINS_URL);
      const data = yield response.json();
      if (data && data["4khdhub"]) {
        domainCache.url = data["4khdhub"];
        domainCache.ts = now;
      }
    } catch (e) {}
    return domainCache.url;
  });
}

// src/4khdhub/http.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    try {
      const response = yield fetch(url, {
        headers: __spreadValues({
          "User-Agent": USER_AGENT
        }, options.headers)
      });
      return yield response.text();
    } catch (err) {
      console.log(`[4KHDHub] Request failed for ${url}: ${err.message}`);
      return null;
    }
  });
}

// src/4khdhub/tmdb.js
function getTmdbDetails(tmdbId, type) {
  return __async(this, null, function* () {
    const isSeries = type === "series" || type === "tv";
    const endpoint = isSeries ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    console.log(`[4KHDHub] Fetching TMDB details from: ${url}`);
    try {
      const response = yield fetch(url);
      const data = yield response.json();
      if (isSeries) {
        return {
          title: data.name,
          year: data.first_air_date ? parseInt(data.first_air_date.split("-")[0]) : 0
        };
      } else {
        return {
          title: data.title,
          year: data.release_date ? parseInt(data.release_date.split("-")[0]) : 0
        };
      }
    } catch (error) {
      console.log(`[4KHDHub] TMDB request failed: ${error.message}`);
      return null;
    }
  });
}

// src/4khdhub/utils.js
function atob(input) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = String(input).replace(/=+$/, "");
  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  let output = "";
  for (let bc = 0, bs, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}
function rot13Cipher(str) {
  return str.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
}
function levenshteinDistance(s, t) {
  if (s === t)
    return 0;
  const n = s.length;
  const m = t.length;
  if (n === 0)
    return m;
  if (m === 0)
    return n;
  const d = [];
  for (let i = 0; i <= n; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (let j = 0; j <= m; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s.charAt(i - 1) === t.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[n][m];
}
function parseBytes(val) {
  if (typeof val === "number")
    return val;
  if (!val)
    return 0;
  const match = val.match(/^([0-9.]+)\s*([a-zA-Z]+)$/);
  if (!match)
    return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  let multiplier = 1;
  if (unit.indexOf("k") === 0)
    multiplier = 1024;
  else if (unit.indexOf("m") === 0)
    multiplier = 1024 * 1024;
  else if (unit.indexOf("g") === 0)
    multiplier = 1024 * 1024 * 1024;
  else if (unit.indexOf("t") === 0)
    multiplier = 1024 * 1024 * 1024 * 1024;
  return num * multiplier;
}
function formatBytes(val) {
  if (val === 0)
    return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = Math.floor(Math.log(val) / Math.log(k));
  if (i < 0)
    i = 0;
  return parseFloat((val / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
function normalizeSourceName(source) {
  return String(source || "Direct").replace(/\s+/g, " ").trim();
}
function getSeekScore(source, url) {
  const text = `${source || ""} ${url || ""}`.toLowerCase();
  if (text.includes("workers.dev/?id=") || text.includes(".fans/?id=") || text.includes("dl.php?link="))
    return 15;
  if (text.includes("googleusercontent") || text.includes("r2.cloudflarestorage") || text.includes("r2.dev"))
    return 100;
  if (text.includes("pixeldrain") || text.includes("pixelserver") || text.includes("pixel server"))
    return 95;
  if (text.includes("s3 server") || text.includes("mega server"))
    return 70;
  if (text.includes("pdl"))
    return 45;
  if (text.includes("fsl") || text.includes("download file"))
    return 30;
  return 50;
}
function getSeekHint(source, url) {
  const score = getSeekScore(source, url);
  if (score >= 90)
    return "Seek OK";
  if (score >= 60)
    return "Seek Maybe";
  return "No Seek?";
}
function getBaseUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch (e) {
    return "";
  }
}
function cleanTitle(title) {
  const normalized = String(title || "").replace(/\.[a-zA-Z0-9]{2,4}$/, "").replace(/WEB[-_. ]?DL/gi, "WEB-DL").replace(/WEB[-_. ]?RIP/gi, "WEBRIP").replace(/H[ .]?265/gi, "H265").replace(/H[ .]?264/gi, "H264").replace(/DDP[ .]?([0-9]\.[0-9])/gi, "DDP$1");
  const sourceTags = /* @__PURE__ */ new Set(["WEB-DL", "WEBRIP", "BLURAY", "HDRIP", "DVDRIP", "HDTV", "CAM", "TS", "BRRIP", "BDRIP"]);
  const codecTags = /* @__PURE__ */ new Set(["H264", "H265", "X264", "X265", "HEVC", "AVC"]);
  const audioTags = ["AAC", "AC3", "DTS", "MP3", "FLAC", "DD", "DDP", "EAC3"];
  const hdrTags = /* @__PURE__ */ new Set(["SDR", "HDR", "HDR10", "HDR10+", "DV", "DOLBYVISION"]);
  return [...new Set(normalized.split(/[ _.]+/).map((part) => {
    const p = part.toUpperCase();
    if (sourceTags.has(p) || codecTags.has(p) || audioTags.some((tag) => p.startsWith(tag)) || hdrTags.has(p))
      return p === "DV" ? "DOLBYVISION" : p;
    if (p === "NF" || p === "CR" || p === "ATMOS")
      return p;
    return null;
  }).filter(Boolean))].join(" ");
}

// src/4khdhub/search.js
var cheerio = require("cheerio-without-node-native");
function fetchPageUrl(name, year, isSeries) {
  return __async(this, null, function* () {
    const domain = yield fetchLatestDomain();
    const searchUrl = `${domain}/?s=${encodeURIComponent(name + " " + year)}`;
    console.log(`[4KHDHub] Search Request URL: ${searchUrl}`);
    const html = yield fetchText(searchUrl);
    if (!html) {
      console.log("[4KHDHub] Search failed: No HTML response");
      return null;
    }
    const $ = cheerio.load(html);
    const targetType = isSeries ? "Series" : "Movies";
    console.log(`[4KHDHub] Parsing search results for type: ${targetType}`);
    const matchingCards = $(".movie-card").filter((_, el) => {
      const hasFormat = $(el).find(`.movie-card-format:contains("${targetType}")`).length > 0;
      if (!hasFormat) {
      }
      return hasFormat;
    }).filter((_, el) => {
      const metaText = $(el).find(".movie-card-meta").text();
      const movieCardYear = parseInt(metaText);
      const yearMatch = !isNaN(movieCardYear) && Math.abs(movieCardYear - year) <= 1;
      if (!yearMatch) {
        console.log(`[4KHDHub] Skip: Year mismatch (${movieCardYear} vs ${year}) - ${$(el).find(".movie-card-title").text().trim()}`);
      }
      return yearMatch;
    }).filter((_, el) => {
      const movieCardTitle = $(el).find(".movie-card-title").text().replace(/\[.*?]/g, "").trim();
      const distance = levenshteinDistance(movieCardTitle.toLowerCase(), name.toLowerCase());
      const match = distance < 5;
      console.log(`[4KHDHub] Checking: "${movieCardTitle}" (Dist: ${distance}) vs "${name}"`);
      return match;
    }).map((_, el) => {
      let href = $(el).attr("href");
      if (href && !href.startsWith("http")) {
        href = domain + (href.startsWith("/") ? "" : "/") + href;
      }
      return href;
    }).get();
    if (matchingCards.length === 0) {
      console.log("[4KHDHub] No matching cards found after filtering");
    } else {
      console.log(`[4KHDHub] Found ${matchingCards.length} matching cards`);
    }
    return matchingCards.length > 0 ? matchingCards[0] : null;
  });
}

// src/4khdhub/extractor.js
var cheerio2 = require("cheerio-without-node-native");
function resolveRedirectUrl(redirectUrl) {
  return __async(this, null, function* () {
    const redirectHtml = yield fetchText(redirectUrl);
    if (!redirectHtml)
      return null;
    try {
      const redirectDataMatch = redirectHtml.match(/'o','(.*?)'/);
      if (!redirectDataMatch)
        return null;
      const step1 = atob(redirectDataMatch[1]);
      const step2 = atob(step1);
      const step3 = rot13Cipher(step2);
      const step4 = atob(step3);
      const redirectData = JSON.parse(step4);
      if (redirectData && redirectData.o) {
        return atob(redirectData.o);
      }
    } catch (e) {
      console.log(`[4KHDHub] Error resolving redirect: ${e.message}`);
    }
    return null;
  });
}
function extractSourceResults($, el) {
  return __async(this, null, function* () {
    const localHtml = $(el).html();
    const sizeMatch = localHtml.match(/([\d.]+ ?[GM]B)/);
    const heightMatch = localHtml.match(/\d{3,}p/);
    const title = $(el).find(".file-title, .episode-file-title").text().trim();
    let height = heightMatch ? parseInt(heightMatch[0]) : 0;
    if (height === 0 && (title.includes("4K") || title.includes("4k") || localHtml.includes("4K") || localHtml.includes("4k"))) {
      height = 2160;
    }
    const meta = {
      bytes: sizeMatch ? parseBytes(sizeMatch[1]) : 0,
      height,
      title
    };
    const hubCloudLink = $(el).find("a").filter((_, a) => $(a).text().includes("HubCloud")).attr("href");
    if (hubCloudLink) {
      if (hubCloudLink.includes("hubcloud")) {
        return { url: hubCloudLink, meta };
      }
      const resolved = yield resolveRedirectUrl(hubCloudLink);
      return { url: resolved || hubCloudLink, meta };
    }
    const hubDriveLink = $(el).find("a").filter((_, a) => $(a).text().includes("HubDrive")).attr("href");
    if (hubDriveLink) {
      if (hubDriveLink.includes("hubdrive")) {
        return { url: hubDriveLink, meta };
      }
      const resolvedDrive = yield resolveRedirectUrl(hubDriveLink);
      if (resolvedDrive) {
        const hubDriveHtml = yield fetchText(resolvedDrive);
        if (hubDriveHtml) {
          const $2 = cheerio2.load(hubDriveHtml);
          const innerCloudLink = $2('a:contains("HubCloud")').attr("href");
          if (innerCloudLink) {
            return { url: innerCloudLink, meta };
          }
        }
      }
    }
    return null;
  });
}
function extractMetaFromItem($, el) {
  const localHtml = $(el).html() || "";
  const sizeMatch = localHtml.match(/([\d.]+ ?[GM]B)/i);
  const heightMatch = localHtml.match(/\d{3,}p/i);
  const title = $(el).find(".file-title, .episode-file-title, .flex-1.text-left.font-semibold").text().trim() || $(el).text().replace(/\s+/g, " ").trim();
  let height = heightMatch ? parseInt(heightMatch[0]) : 0;
  if (height === 0 && /4k/i.test(`${title} ${localHtml}`))
    height = 2160;
  return {
    bytes: sizeMatch ? parseBytes(sizeMatch[1]) : 0,
    height,
    title
  };
}
function absolutizeUrl(url, baseUrl) {
  if (!url)
    return "";
  try {
    return url.startsWith("http") ? url : new URL(url, baseUrl).toString();
  } catch (e) {
    return url;
  }
}
function extractRawLinksFromItem($, el, pageUrl) {
  const links = [];
  $(el).find("a").each((_, a) => {
    const href = absolutizeUrl($(a).attr("href"), pageUrl);
    if (href && !links.includes(href))
      links.push(href);
  });
  return links;
}
function extractHubCdn(hubCdnUrl, baseMeta) {
  return __async(this, null, function* () {
    const html = yield fetchText(hubCdnUrl, { headers: { Referer: hubCdnUrl } });
    if (!html)
      return [];
    let encoded = "";
    const reurlMatch = html.match(/reurl\s*=\s*["']([^"']+)["']/);
    if (reurlMatch)
      encoded = reurlMatch[1].split("?r=").pop();
    if (!encoded) {
      const rMatch = html.match(/[?&]r=([A-Za-z0-9+/=]+)/) || html.match(/r=([A-Za-z0-9+/=]+)/);
      encoded = rMatch ? rMatch[1] : "";
    }
    if (!encoded)
      return [];
    try {
      const decoded = atob(encoded).split("link=").pop();
      if (!decoded)
        return [];
      return [{
        source: "HUBCDN",
        url: decoded,
        meta: baseMeta
      }];
    } catch (e) {
      console.log(`[4KHDHub] HUBCDN decode failed: ${e.message}`);
      return [];
    }
  });
}
function extractHblinks(hblinksUrl, baseMeta) {
  return __async(this, null, function* () {
    const html = yield fetchText(hblinksUrl, { headers: { Referer: hblinksUrl } });
    if (!html)
      return [];
    const $ = cheerio2.load(html);
    const links = [];
    $("h3 a, h5 a, div.entry-content p a, a").each((_, el) => {
      const href = absolutizeUrl($(el).attr("href"), hblinksUrl);
      if (href && !links.includes(href))
        links.push(href);
    });
    const nested = yield Promise.all(links.map((link) => extractResolvedLink(link, baseMeta)));
    return nested.flat();
  });
}
function resolveBuzzServer(buzzUrl, baseMeta) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(buzzUrl.endsWith("/download") ? buzzUrl : `${buzzUrl.replace(/\/$/, "")}/download`, {
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": buzzUrl
        },
        redirect: "manual"
      });
      const target = response.headers.get("hx-redirect") || response.headers.get("HX-Redirect") || response.headers.get("location");
      return target ? [{
        source: "BuzzServer",
        url: target,
        meta: baseMeta
      }] : [];
    } catch (e) {
      console.log(`[4KHDHub] BuzzServer failed: ${e.message}`);
      return [];
    }
  });
}
// HubCloud download buttons often point at intermediate redirect endpoints
// (gamerxyt/360news4u dl.php wrappers, *.workers.dev/?id=, pixeldrain /u/).
// Those endpoints ignore HTTP Range requests, so seeking restarts playback from
// the beginning. Resolve them to the real direct file URL (googleusercontent /
// R2 / pixeldrain api) which honors Range and is therefore seekable.
function resolveFinalLink(rawUrl, depth) {
  return __async(this, null, function* () {
    if (!rawUrl)
      return rawUrl;
    let url = rawUrl;
    if (depth === void 0)
      depth = 0;
    if (depth > 5)
      return url;
    const pdMatch = url.match(/pixeldrain\.(?:net|dev)\/u\/([a-zA-Z0-9]+)/);
    if (pdMatch && pdMatch[1]) {
      return `https://pixeldrain.net/api/file/${pdMatch[1]}?download`;
    }
    const dlMatch = url.match(/(?:gamerxyt\.com|360news4u\.net)\/dl\.php\?link=([^&\s]+)/);
    if (dlMatch && dlMatch[1]) {
      try {
        return decodeURIComponent(dlMatch[1]);
      } catch (e) {
        return dlMatch[1];
      }
    }
    if (/video-downloads\.googleusercontent\.com|r2\.cloudflarestorage\.com|\.r2\.dev/i.test(url)) {
      return url;
    }
    if (/workers\.dev\/.+\.(?:mkv|mp4|avi|m4v)/i.test(url) && !/workers\.dev\/\?id=/i.test(url)) {
      return url;
    }
    if (/\.workers\.dev\/\?id=|\.fans\/\?id=/i.test(url)) {
      try {
        const response = yield fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          },
          redirect: "manual"
        });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (location)
            return yield resolveFinalLink(location, depth + 1);
        }
        if (response.status === 200) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.indexOf("video/") !== -1)
            return url;
          const text = yield response.text();
          const directMatch = text.match(/(https?:\/\/[^"'\s]+\.r2\.cloudflarestorage\.com[^"'\s]*)/) || text.match(/(https?:\/\/[^"'\s]+\/[^"'\s]*\.(?:mkv|mp4|avi|m4v)[^"'\s]*)/i);
          if (directMatch)
            return directMatch[1];
        }
      } catch (e) {
        console.log(`[4KHDHub] resolveFinalLink failed: ${e.message}`);
      }
    }
    return url;
  });
}
function expandNestedLinks(links, baseMeta) {
  return __async(this, null, function* () {
    const expanded = [];
    for (const link of links) {
      const lower = String(link.url || "").toLowerCase();
      if (lower.includes("hubcdn")) {
        expanded.push(...yield extractHubCdn(link.url, link.meta || baseMeta));
      } else if (String(link.source || "").toLowerCase().includes("buzzserver")) {
        const buzzLinks = yield resolveBuzzServer(link.url, link.meta || baseMeta);
        expanded.push(...(buzzLinks.length ? buzzLinks : [link]));
      } else {
        expanded.push(link);
      }
    }
    return expanded;
  });
}
function extractResolvedLink(rawUrl, baseMeta) {
  return __async(this, null, function* () {
    if (!rawUrl)
      return [];
    let resolved = rawUrl;
    if (resolved.includes("id=")) {
      resolved = yield resolveRedirectUrl(resolved) || resolved;
    }
    const lower = resolved.toLowerCase();
    if (lower.includes("hubdrive") || lower.includes("hubcloud"))
      return yield expandNestedLinks(yield extractHubCloud(resolved, baseMeta), baseMeta);
    if (lower.includes("hubcdn"))
      return yield extractHubCdn(resolved, baseMeta);
    if (lower.includes("hblinks"))
      return yield extractHblinks(resolved, baseMeta);
    if (lower.includes("pixeldrain") || lower.includes("pixelserver") || lower.includes("pixeldra")) {
      const base = getBaseUrl(resolved);
      const finalUrl = resolved.includes("download") ? resolved : `${base}/api/file/${resolved.split("/").filter(Boolean).pop()}?download`;
      return [{
        source: "Pixeldrain",
        url: finalUrl,
        meta: baseMeta
      }];
    }
    return [{
      source: "Direct",
      url: resolved,
      meta: baseMeta
    }];
  });
}
function extractHubCloud(hubCloudUrl, baseMeta) {
  return __async(this, null, function* () {
    if (!hubCloudUrl)
      return [];
    if (hubCloudUrl.includes("hubdrive")) {
      const hubDriveHtml = yield fetchText(hubCloudUrl, {
        headers: {
          "Referer": hubCloudUrl
        }
      });
      if (!hubDriveHtml)
        return [];
      const $drive = cheerio2.load(hubDriveHtml);
      const hubDriveTarget = $drive(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") || $drive('a:contains("HubCloud")').attr("href") || $drive("a.btn").filter((_, el) => {
        const text = $drive(el).text().toLowerCase();
        const href = ($drive(el).attr("href") || "").toLowerCase();
        return text.includes("download") || href.includes("hubcloud") || href.includes("hubcdn") || href.includes("pixeldrain");
      }).first().attr("href");
      if (!hubDriveTarget)
        return [];
      hubCloudUrl = hubDriveTarget.startsWith("http") ? hubDriveTarget : new URL(hubDriveTarget, hubCloudUrl).toString();
    }
    const redirectHtml = yield fetchText(hubCloudUrl, { headers: { Referer: hubCloudUrl } });
    if (!redirectHtml)
      return [];
    let finalLinksUrl = null;
    const $redirect = cheerio2.load(redirectHtml);
    const downloadHref = $redirect("#download").attr("href");
    if (downloadHref) {
      finalLinksUrl = downloadHref.startsWith("http") ? downloadHref : new URL(downloadHref, hubCloudUrl).toString();
    }
    if (!finalLinksUrl) {
      const redirectUrlMatch = redirectHtml.match(/var url ?= ?['"](.*?)['"]/);
      if (redirectUrlMatch) {
        finalLinksUrl = redirectUrlMatch[1];
      }
    }
    const linksHtml = finalLinksUrl ? yield fetchText(finalLinksUrl, { headers: { Referer: hubCloudUrl } }) : redirectHtml;
    if (!linksHtml)
      return [];
    const $ = cheerio2.load(linksHtml);
    const results = [];
    const sizeText = $("#size, i#size").first().text();
    const titleText = $("div.card-header").first().text().trim() || $("title").text().trim();
    const currentMeta = __spreadProps(__spreadValues({}, baseMeta), {
      bytes: parseBytes(sizeText) || baseMeta.bytes,
      title: cleanTitle(titleText) || titleText || baseMeta.title
    });
    $("a.btn, a").each((_, el) => {
      const text = $(el).text();
      const href = $(el).attr("href");
      if (!href)
        return;
      const label = text.toLowerCase();
      if (label.includes("fsl") || label.includes("download file") || label.includes("s3 server") || label.includes("fslv2") || label.includes("mega server") || label.includes("pdl server") || label.includes("pdl")) {
        results.push({
          source: text.trim() || "Direct",
          url: href,
          meta: currentMeta
        });
      } else if (label.includes("buzzserver")) {
        results.push({
          source: "BuzzServer",
          url: href.endsWith("/download") ? href : `${href.replace(/\/$/, "")}/download`,
          meta: currentMeta
        });
      } else if (href.toLowerCase().includes("hubcdn")) {
        results.push({
          source: "HUBCDN",
          url: href,
          meta: currentMeta
        });
      } else if (label.includes("pixelserver") || label.includes("pixel server") || label.includes("pixeldrain") || label.includes("pixeldra")) {
        const pixelUrl = href.includes("?download") ? href : href.replace("/u/", "/api/file/").replace(/\/file\/([^/?#]+).*$/, "/api/file/$1?download");
        results.push({
          source: "Pixeldrain",
          url: pixelUrl,
          meta: currentMeta
        });
      }
    });
    const resolved = yield Promise.all(results.map((r) => __async(this, null, function* () {
      const src = String(r.source || "").toLowerCase();
      if (src.includes("buzzserver") || src.includes("hubcdn"))
        return r;
      const finalUrl = yield resolveFinalLink(r.url);
      return __spreadProps(__spreadValues({}, r), { url: finalUrl });
    })));
    return resolved;
  });
}
function toNuvioStream(link, sourceMeta) {
  const meta = link.meta || {};
  const fallbackMeta = sourceMeta || {};
  const source = normalizeSourceName(link.source);
  const seekHint = getSeekHint(source, link.url);
  const seekScore = getSeekScore(source, link.url);
  const height = meta.height || fallbackMeta.height;
  return {
    name: `4KHDHub - ${source} ${seekHint}${height ? ` ${height}p` : ""}`,
    title: `${meta.title || fallbackMeta.title || "4KHDHub"}
${source} | ${seekHint} | ${formatBytes(meta.bytes || fallbackMeta.bytes || 0)}`,
    url: link.url,
    quality: height ? `${height}p` : void 0,
    headers: {
      "User-Agent": USER_AGENT
    },
    provider: "4khdhub",
    behaviorHints: {
      bingeGroup: `4khdhub-${source}`,
      seekScore
    }
  };
}

// src/4khdhub/index.js
var cheerio3 = require("cheerio-without-node-native");
function getStreams(tmdbId, type, season, episode) {
  return __async(this, null, function* () {
    const tmdbDetails = yield getTmdbDetails(tmdbId, type);
    if (!tmdbDetails)
      return [];
    const { title, year } = tmdbDetails;
    console.log(`[4KHDHub] Search: ${title} (${year})`);
    const isSeries = type === "series" || type === "tv";
    const pageUrl = yield fetchPageUrl(title, year, isSeries);
    if (!pageUrl) {
      console.log("[4KHDHub] Page not found");
      return [];
    }
    console.log(`[4KHDHub] Found page: ${pageUrl}`);
    const html = yield fetchText(pageUrl);
    if (!html)
      return [];
    const $ = cheerio3.load(html);
    const itemsToProcess = [];
    if (isSeries && season && episode) {
      const seasonStr = "S" + String(season).padStart(2, "0");
      const episodeStr = "Episode-" + String(episode).padStart(2, "0");
      const episodeRegex = new RegExp(`Episode-?0*${episode}(?!\\\\d)`, "i");
      $("div.episodes-list div.season-item, .episode-item").each((_, el) => {
        const seasonText = $("div.episode-number, .episode-title", el).text();
        if (seasonText.includes(seasonStr) || new RegExp(`S?0*${season}(?!\\\\d)`, "i").test(seasonText)) {
          const downloadItems = $(".episode-download-item", el).filter((_2, item) => episodeRegex.test($(item).text()));
          downloadItems.each((_2, item) => {
            itemsToProcess.push(item);
          });
        }
      });
    } else {
      $(".download-item").each((_, el) => {
        itemsToProcess.push(el);
      });
    }
    console.log(`[4KHDHub] Processing ${itemsToProcess.length} items`);
    const streamPromises = itemsToProcess.map((item) => __async(this, null, function* () {
      try {
        const meta = extractMetaFromItem($, item);
        const rawLinks = extractRawLinksFromItem($, item, pageUrl);
        if (rawLinks.length === 0) {
          const sourceResult = yield extractSourceResults($, item);
          if (!sourceResult || !sourceResult.url)
            return [];
          rawLinks.push(sourceResult.url);
        }
        const extracted = (yield Promise.all(rawLinks.map((raw) => extractResolvedLink(raw, meta)))).flat();
        return extracted.filter((link) => link && link.url && !link.url.includes(".zip")).map((link) => toNuvioStream(link, meta));
      } catch (err) {
        console.log(`[4KHDHub] Item processing error: ${err.message}`);
        return [];
      }
    }));
    const results = yield Promise.all(streamPromises);
    return results.reduce((acc, val) => acc.concat(val), []).sort((a, b) => {
      const aScore = a.behaviorHints && a.behaviorHints.seekScore || 0;
      const bScore = b.behaviorHints && b.behaviorHints.seekScore || 0;
      return bScore - aScore;
    });
  });
}
module.exports = { getStreams };
