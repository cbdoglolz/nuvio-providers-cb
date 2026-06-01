const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'providers');
const outDir = path.join(root, '_site', 'providers');

fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(srcDir)) {
  if (f.endsWith('.js')) fs.copyFileSync(path.join(srcDir, f), path.join(outDir, f));
}

require('child_process').execFileSync('node', [path.join(root, 'scripts/patch-providers-for-nuvio.js'), outDir], {
  stdio: 'inherit',
});

const tests = [
  { id: 'streamflix', imdb: 'tt0137523', type: 'movie' },
  { id: 'moviebox', imdb: 'tt0137523', type: 'movie' },
  { id: 'hdhub4u', imdb: 'tt0137523', type: 'movie' },
  { id: '4khdhub', imdb: 'tt0137523', type: 'movie' },
  { id: 'vidlink', imdb: 'tt0137523', type: 'movie' },
  { id: 'vixsrc', imdb: 'tt0137523', type: 'movie' },
  { id: 'uhdmovies', imdb: 'tt0137523', type: 'movie' },
  { id: 'moviebox', tmdb: '550', type: 'movie' },
  { id: 'moviebox', tmdb: '19885', type: 'tv', season: 1, episode: 1 },
];

(async () => {
  console.log('Patched dir:', outDir);
  process.chdir(root);
  for (const t of tests) {
    const modPath = path.join(outDir, t.id + '.js');
    if (!fs.existsSync(modPath)) continue;
    delete require.cache[require.resolve(modPath)];
    const mod = require(modPath);
    const fn = mod.getStreams || global.getStreams;
    const arg = t.imdb || t.tmdb;
    const label = t.imdb || 'tmdb:' + t.tmdb + (t.season ? ` S${t.season}E${t.episode}` : '');
    process.stdout.write(`${t.id} ${label} ... `);
    try {
      const start = Date.now();
      const streams = await fn(arg, t.type, t.season, t.episode);
      console.log(`${streams.length} streams (${Date.now() - start}ms)`);
    } catch (e) {
      console.log('ERR ' + e.message);
    }
  }
})();
