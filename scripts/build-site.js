// Monta a pasta _site que o GitHub Pages publica:
// public/* (dashboard) + data/dashboard.json (dados pré-computados da caçada).
import {cpSync, mkdirSync, existsSync, writeFileSync, rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');

rmSync(out, {recursive: true, force: true});
mkdirSync(join(out, 'data'), {recursive: true});

cpSync(join(root, 'public'), out, {recursive: true});

const dash = join(root, 'data', 'dashboard.json');
if (existsSync(dash)) {
  cpSync(dash, join(out, 'data', 'dashboard.json'));
} else {
  // primeira publicação antes da primeira caçada: evita 404 no fetch
  writeFileSync(
    join(out, 'data', 'dashboard.json'),
    JSON.stringify({products: [], lastRun: {at: null, sourceStatus: {}}})
  );
}

console.log('_site montado.');
