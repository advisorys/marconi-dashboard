import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const buildVersion = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const isProd = process.argv.includes('--prod');

const jsFiles = [
  'src/js/00-foundation.js',
  'src/js/10-cashflow.js',
  'src/js/20-interactions.js',
  'src/js/30-export-loader.js',
  'src/js/40-fixed-director.js',
  'src/js/50-ux-patches.js',
  'src/js/55-theme-toggle.js'
];

const cssFiles = [
  'src/css/00-theme-base.css',
  'src/css/20-fixed-director.css',
  'src/css/30-executive-interactions.css',
  'src/css/40-ux-patches.css',
  'src/css/50-theme-light.css',
  'src/css/60-theme-light-premium.css',
  'src/css/70-solaris.css'
];

const sizeTargets = {
  js: { dev: 350 * 1024, prod: 220 * 1024 },
  css: { dev: 300 * 1024, prod: 180 * 1024 }
};

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function warnIfOversized(target, bytes, type) {
  const limit = sizeTargets[type][isProd ? 'prod' : 'dev'];
  if (bytes > limit) {
    console.warn(`[build] Warning: ${target} acima do alvo recomendado (${kb(bytes)} > ${kb(limit)})`);
  }
}

async function optionalMinifyJs(code, target) {
  if (!isProd) return code;
  try {
    const { minify } = await import('terser');
    const result = await minify(code, {
      compress: { passes: 2 },
      mangle: false,
      format: { comments: false }
    });
    return result.code || code;
  } catch (error) {
    console.warn(`[build] Warning: ${target} nao minificado; dependencia opcional terser indisponivel.`);
    return code;
  }
}

async function optionalMinifyCss(code, target) {
  if (!isProd) return code;
  try {
    const { transform } = await import('lightningcss');
    const result = transform({
      filename: target,
      code: Buffer.from(code),
      minify: true
    });
    return result.code.toString();
  } catch (error) {
    console.warn(`[build] Warning: ${target} nao minificado; dependencia opcional lightningcss indisponivel.`);
    return code;
  }
}

async function concat(files, target, banner, type) {
  const chunks = [];
  for (const file of files) {
    const fullPath = path.join(repoRoot, file);
    const body = await fs.readFile(fullPath, 'utf8');
    chunks.push(`/* ===== ${file.replaceAll('\\', '/')} ===== */\n\n${body.trimEnd()}`);
  }

  const readableOutput = `${banner}\n * Build: ${buildVersion}
 * Mode: ${isProd ? 'production' : 'development'}
 */\n\n${chunks.join('\n\n')}\n`;
  const output = type === 'js'
    ? await optionalMinifyJs(readableOutput, target)
    : await optionalMinifyCss(readableOutput, target);

  const targetPath = path.join(repoRoot, target);
  await fs.writeFile(targetPath, `${output.trimEnd()}\n`, 'utf8');
  const stats = await fs.stat(targetPath);
  console.log(`Built ${target} from ${files.length} source files - ${kb(stats.size)}`);
  warnIfOversized(target, stats.size, type);
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
  '/* Marconi Dashboard application bundle. Source: src/js. Run: node tools/build.mjs',
  'js'
);

await concat(
  cssFiles,
  'assets/styles.css',
  '/* Marconi Dashboard stylesheet bundle. Source: src/css. Run: node tools/build.mjs',
  'css'
);

await updateVersionedReferences(buildVersion);
