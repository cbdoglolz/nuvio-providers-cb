#!/usr/bin/env node
/**
 * Wraps getStreams for Nuvio on device (args normalize, IMDb→TMDB, global export).
 * Usage: node scripts/patch-providers-for-nuvio.js [targetDir]
 * Default targetDir: ./_site/providers (CI). Pass ../providers to patch in-tree for local debug.
 */
const fs = require('fs');
const path = require('path');

const targetArg = process.argv[2];
const providersDir = targetArg
  ? path.resolve(targetArg)
  : path.join(__dirname, '..', '_site', 'providers');

const MARKER = '__CB_REPO_NUVIO_PATCHED__';

const PREAMBLE = `/* ${MARKER} */
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

function __cbResolveTmdbId(rawId, mediaType) {
  var id = String(rawId == null ? '' : rawId).trim();
  if (!id) return Promise.resolve('');
  if (/^tmdb:/i.test(id)) id = id.replace(/^tmdb:/i, '');
  if (/^tt\\d+/i.test(id)) {
    var tmdbKey = 'd131017ccc6e5462a81c9304d21476de';
    var findUrl = 'https://api.themoviedb.org/3/find/' + id +
      '?api_key=' + tmdbKey + '&external_source=imdb_id';
  return fetch(findUrl)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return '';
        if (mediaType === 'tv' && data.tv_results && data.tv_results[0]) {
          return String(data.tv_results[0].id);
        }
        if (data.movie_results && data.movie_results[0]) {
          return String(data.movie_results[0].id);
        }
        if (data.tv_results && data.tv_results[0]) {
          return String(data.tv_results[0].id);
        }
        console.log('[cbrepo] TMDB find failed for IMDb ' + id);
        return '';
      })
      .catch(function () { return ''; });
  }
  return Promise.resolve(id);
}

function __cbEnsureStreamsArray(result) {
  if (Array.isArray(result)) return result;
  return [];
}

function __cbRepoEntry(coreFn, providerId, tmdbId, mediaType, season, episode) {
  var type = __cbNormalizeMediaType(mediaType);
  var se = __cbNormalizeSeasonEpisode(season, episode);
  console.log('[cbrepo:' + providerId + '] getStreams id=' + tmdbId + ' type=' + type +
    (type === 'tv' ? ' S' + se.season + 'E' + se.episode : ''));

  return __cbResolveTmdbId(tmdbId, type).then(function (resolvedId) {
    if (!resolvedId) {
      console.log('[cbrepo:' + providerId + '] No valid TMDB id after normalize');
      return [];
    }
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

`;

function wrapExport(providerId) {
  return `
(function __cbWrapExport() {
  var __cbCoreGetStreams = getStreams;
  getStreams = function (tmdbId, mediaType, season, episode) {
    return __cbRepoEntry(__cbCoreGetStreams, '${providerId}', tmdbId, mediaType, season, episode);
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
  }
  if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
  }
})();
`;
}

function patchFile(filePath) {
  const name = path.basename(filePath);
  if (!name.endsWith('.js') || name.startsWith('_')) return false;

  let src = fs.readFileSync(filePath, 'utf8');
  if (src.includes(MARKER)) return false;
  if (!src.includes('function getStreams')) return false;

  const providerId = name.replace(/\.js$/, '');

  src = src.replace(/^\uFEFF/, '');
  if (src.startsWith('"use strict";')) {
    src = '"use strict";\n' + PREAMBLE + src.slice(13);
  } else {
    src = PREAMBLE + src;
  }

  src = src.replace(/\nif \(typeof module[\s\S]*?global\.getStreams = getStreams;\s*\n\}/m, '');
  src = src.replace(/\nif \(typeof module[\s\S]*?module\.exports = \{ getStreams \};\s*\n\}/m, '');
  src = src.replace(/\nmodule\.exports\s*=\s*\{\s*getStreams\s*\}\s*;?\s*$/m, '');
  src = src.trimEnd() + '\n' + wrapExport(providerId);

  fs.writeFileSync(filePath, src, 'utf8');
  return true;
}

function main() {
  if (!fs.existsSync(providersDir)) {
    console.error('Directory not found: ' + providersDir);
    process.exit(1);
  }
  const files = fs.readdirSync(providersDir).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
  let n = 0;
  for (const f of files) {
    if (patchFile(path.join(providersDir, f))) {
      console.log('patched ' + f);
      n++;
    }
  }
  console.log('Patched ' + n + ' file(s) in ' + providersDir);
}

main();
