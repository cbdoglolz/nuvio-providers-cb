import cheerio from 'cheerio-without-node-native';
import { getTMDBDetails, findBestTitleMatch, buildSearchTerms } from './utils.js';
import { MAIN_URL, HEADERS } from './constants.js';

async function fetchWithCfRetry(url, options = {}) {
    const res = await fetch(url, options);
    if (![403, 503].includes(res.status) || typeof Cloudflare === "undefined" || !Cloudflare.solve) {
        return res;
    }

    console.log(`[AllMovieLand] Cloudflare challenge on ${url}, retrying with solved cookies.`);
    const solution = await Cloudflare.solve(url);
    const retryHeaders = {
        ...(options.headers || {}),
        ...(solution?.headers || {})
    };
    if (solution?.cookie || solution?.cookies) {
        retryHeaders.Cookie = solution.cookie || solution.cookies;
    }
    if (solution?.userAgent) {
        retryHeaders["User-Agent"] = solution.userAgent;
    }

    return fetch(url, { ...options, headers: retryHeaders });
}

async function searchAllMovieLand(query) {
    const searchUrl = `${MAIN_URL}/index.php?story=${encodeURIComponent(query)}&do=search&subaction=search`;
    const res = await fetchWithCfRetry(searchUrl, { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $('article.short-mid').each((i, el) => {
        const title = $(el).find('a > h3').text().trim();
        const href = $(el).find('a').attr('href');
        if (!title || !href) return;

        const yearMatch = title.match(/\((\d{4})\)/);
        const year = yearMatch ? parseInt(yearMatch[1]) : null;
        results.push({ title, href, year });
    });

    return results;
}

async function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
    console.log(`[AllMovieLand] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    try {
        const mediaInfo = await getTMDBDetails(tmdbId, mediaType);
        console.log(`[AllMovieLand] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || "N/A"})`);
        
        const searchResults = [];
        const seen = new Set();
        const searchTerms = buildSearchTerms(mediaInfo, mediaType, season);
        for (const query of searchTerms) {
            const results = await searchAllMovieLand(query);
            console.log(`[AllMovieLand] Search "${query}" returned ${results.length} result(s).`);
            for (const result of results) {
                const key = result.href || result.title;
                if (seen.has(key)) continue;
                seen.add(key);
                searchResults.push(result);
            }
        }

        if (searchResults.length === 0) {
            console.log("[AllMovieLand] No search results found.");
            return [];
        }
        
        const bestMatch = findBestTitleMatch(mediaInfo, searchResults);
        if (!bestMatch) {
            console.log("[AllMovieLand] No confident match found.");
            return [];
        }

        const selectedMedia = bestMatch;
        console.log(`[AllMovieLand] Selected: "${selectedMedia.title}" (${selectedMedia.href})`);
        
        const docRes = await fetchWithCfRetry(selectedMedia.href, { headers: HEADERS });
        const docHtml = await docRes.text();
        const doc$ = cheerio.load(docHtml);
        
        const tabsContent = doc$('div.tabs__content script').html() || '';
        const playerScriptMatch = tabsContent.match(/const AwsIndStreamDomain\s*=\s*'([^']+)'/);
        const playerDomain = playerScriptMatch ? playerScriptMatch[1].replace(/\/$/, '') : null;
        const idMatch = tabsContent.match(/src:\s*'([^']+)'/);
        const id = idMatch ? idMatch[1] : null;

        if (!playerDomain || !id) {
            console.log("[AllMovieLand] Could not find player domain or ID.");
            return [];
        }

        const embedLink = `${playerDomain}/play/${id}`;
        const embedRes = await fetchWithCfRetry(embedLink, { headers: { ...HEADERS, Referer: selectedMedia.href } });
        const embedHtml = await embedRes.text();
        const embed$ = cheerio.load(embedHtml);
        
        const lastScript = embed$('body > script').last().html() || '';
        const p3Match = lastScript.match(/let\s+p3\s*=\s*(\{.*\});/);
        
        if (!p3Match) {
            console.log("[AllMovieLand] No p3 JSON found in embed.");
            return [];
        }

        const json = JSON.parse(p3Match[1]);
        let fileUrl = json.file.replace(/\\\//g, '/');
        if (!fileUrl.startsWith('http')) fileUrl = `${playerDomain}${fileUrl}`;
        
        const fileRes = await fetchWithCfRetry(fileUrl, {
            method: 'POST',
            headers: { ...HEADERS, 'X-CSRF-TOKEN': json.key, 'Referer': embedLink }
        });
        const fileText = await fileRes.text();
        
        let targetFiles = [];
        const parsedData = JSON.parse(fileText.replace(/,\]/g, ']'));

        if (mediaType === "movie") {
            targetFiles = parsedData.filter(s => s && s.file);
        } else if (mediaType === "tv") {
            // Improved TV matching: Check for season number in title or ID
            const seasonData = parsedData.find(s => {
                const sTitle = s.title || "";
                const sNumMatch = sTitle.match(/Season\s*(\d+)/i) || sTitle.match(/(\d+)\s*Season/i);
                const sNum = sNumMatch ? parseInt(sNumMatch[1]) : null;
                return sNum === season || s.id == season;
            });

            if (seasonData && seasonData.folder) {
                const episodeData = seasonData.folder.find(e => {
                    const eTitle = e.title || "";
                    const eNumMatch = eTitle.match(/Episode\s*(\d+)/i) || eTitle.match(/(\d+)\s*Episode/i);
                    const eNum = eNumMatch ? parseInt(eNumMatch[1]) : null;
                    return eNum === episode || e.episode == episode;
                });

                if (episodeData && episodeData.folder) {
                    targetFiles = episodeData.folder.filter(s => s && s.file);
                }
            }
        }

        if (targetFiles.length === 0) {
            console.log("[AllMovieLand] No streams found for the requested media.");
            return [];
        }

        const streams = [];

        await Promise.all(targetFiles.map(async (fileObj) => {
            try {
                const playlistFile = fileObj.file.replace(/^~/, '');
                const playlistUrl = `${playerDomain}/playlist/${playlistFile}.txt`;
                
                const postRes = await fetchWithCfRetry(playlistUrl, {
                    method: 'POST',
                    headers: { ...HEADERS, 'X-CSRF-TOKEN': json.key, 'Referer': embedLink }
                });
                
                const m3u8Url = (await postRes.text()).trim();
                
                if (m3u8Url && m3u8Url.startsWith('http')) {
                    const qualityStr = fileObj.title || "Unknown";
                    streams.push({
                        name: "AllMovieLand",
                        title: `AllMovieLand - ${qualityStr}`,
                        url: m3u8Url,
                        quality: qualityStr,
                        headers: {
                            "Referer": `${playerDomain}/`,
                            "Origin": playerDomain,
                            "User-Agent": HEADERS["User-Agent"]
                        },
                        provider: "allmovieland"
                    });
                }
            } catch (e) {
                console.error(`[AllMovieLand] Failed to extract stream: ${e.message}`);
            }
        }));

        return streams;
    } catch (error) {
        console.error(`[AllMovieLand] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
