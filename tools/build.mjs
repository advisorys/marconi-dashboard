import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();

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
