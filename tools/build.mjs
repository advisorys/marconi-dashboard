import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const buildVersion = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

const jsFiles = [
  'src/js/00-foundation.js',
  'src/js/10-cashflow.js',
  'src/js/20-interactions.js',
  'src/js/30-export-loader.js',
  'src/js/40-fixed-director.js',
  'src/js/50-ux-patches.js'
];

const cssFiles = [
  'src/css/00-theme-base.css',
  'src/css/20-fixed-director.css',
  'src/css/30-executive-interactions.css',
  'src/css/40-ux-patches.css'
];

async function concat(files, target, banner) {
  const chunks = [];
  for (const file of files) {
    const fullPath = path.join(repoRoot, file);
    const body = await fs.readFile(fullPath, 'utf8');
    chunks.push(`/* ===== ${file.replaceAll('\\', '/')} ===== */\n\n${body.trimEnd()}`);
  }
  const output = `${banner}\n\n${chunks.join('\n\n')}\n`;
  await fs.writeFile(path.join(repoRoot, target), output, 'utf8');
  console.log(`Built ${target} from ${files.length} source files`);
}

async function updateVersionedReferences(version) {
  const indexPath = path.join(repoRoot, 'index.html');
  const bootstrapPath = path.join(repoRoot, 'assets/bootstrap.js');
  const index = await fs.readFile(indexPath, 'utf8');
  const bootstrap = await fs.readFile(bootstrapPath, 'utf8');

  const nextIndex = index
    .replace(/assets\/styles\.css(?:\?v=[^"']*)?/g, `assets/styles.css?v=${version}`)
    .replace(/assets\/bootstrap\.js(?:\?v=[^"']*)?/g, `assets/bootstrap.js?v=${version}`);

  const nextBootstrap = bootstrap.replace(
    /const ASSET_VERSION = ['"][^'"]+['"];/,
    `const ASSET_VERSION = '${version}';`
  );

  await fs.writeFile(indexPath, nextIndex, 'utf8');
  await fs.writeFile(bootstrapPath, nextBootstrap, 'utf8');
  console.log(`Updated asset version to ${version}`);
}

await concat(
  jsFiles,
  'assets/app.js',
  '/* Marconi Dashboard application bundle. Source: src/js. Run: node tools/build.mjs */'
);

await concat(
  cssFiles,
  'assets/styles.css',
  '/* Marconi Dashboard stylesheet bundle. Source: src/css. Run: node tools/build.mjs */'
);

await updateVersionedReferences(buildVersion);
