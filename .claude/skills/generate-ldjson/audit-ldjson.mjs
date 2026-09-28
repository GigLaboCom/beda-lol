#!/usr/bin/env node
// Audit JSON-LD in the built site (apps/web/dist/client/**/*.html).
//
// Usage: node .claude/skills/generate-ldjson/audit-ldjson.mjs [--json] [--dump] [path-filter]
//   path-filter  only pages whose route contains this string (e.g. "bukvy", "/en")
//   --dump       print every JSON-LD block after the checks
//   --json       machine-readable report
// Exit code 1 if any page has an error. Run `pnpm --filter web build` first.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const dist = join(repo, 'apps/web/dist/client');
const site = new URL(process.env.BEDA_BASE_URL ?? 'https://beda.lol');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const dump = args.includes('--dump');
const filter = args.find((a) => !a.startsWith('--'));

// Routes that are deliberately out of search (robots.txt / noindex): no JSON-LD required.
const SKIP = [/^\/dev\//, /^\/404$/];
// URL-valued properties that must be absolute and on the site host (external refs allowed in sameAs).
const URL_KEYS = new Set([
  'url',
  'item',
  'mainEntityOfPage',
  '@id',
  'image',
  'logo',
  'thumbnailUrl',
]);
const LANG_OF = { ru: 'ru', en: 'en' };

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

function routeOf(file) {
  const rel = relative(dist, file).split(sep).join('/');
  const r = `/${rel.replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '')}`;
  return r.length > 1 ? r.replace(/\/$/, '') : '/';
}

function attr(html, re) {
  const m = html.match(re);
  return m ? m[1] : undefined;
}

/** Flatten a JSON-LD block into its typed nodes (top level and @graph). */
function nodesOf(block) {
  const roots = Array.isArray(block) ? block : [block];
  return roots.flatMap((r) => (Array.isArray(r['@graph']) ? r['@graph'] : [r]));
}

/** Yield [path, value] for every URL-ish property, recursively. */
function* urlProps(obj, path = '') {
  if (Array.isArray(obj)) {
    for (const [i, v] of obj.entries()) yield* urlProps(v, `${path}[${i}]`);
    return;
  }
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k;
    if (URL_KEYS.has(k) && typeof v === 'string') yield [p, v];
    else if (URL_KEYS.has(k) && v && typeof v === 'object' && typeof v.url === 'string')
      yield [`${p}.url`, v.url];
    if (k !== 'sameAs') yield* urlProps(v, p);
  }
}

function audit(file) {
  const html = readFileSync(file, 'utf8');
  const route = routeOf(file);
  const lang = attr(html, /<html[^>]*\blang="([^"]+)"/);
  const canonical = attr(html, /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  const robots = attr(html, /<meta[^>]*name="robots"[^>]*content="([^"]+)"/) ?? '';
  const noindex = /noindex/.test(robots);
  const errors = [];
  const warnings = [];
  const blocks = [];

  for (const m of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch (e) {
      errors.push(`JSON does not parse: ${e.message}`);
    }
  }

  const nodes = blocks.flatMap(nodesOf);
  const types = nodes.flatMap((n) => n['@type']);

  if (!blocks.length && !noindex && !SKIP.some((re) => re.test(route)))
    warnings.push('indexable page without JSON-LD');

  for (const b of blocks) {
    const roots = Array.isArray(b) ? b : [b];
    for (const r of roots)
      if (r['@context'] !== 'https://schema.org')
        errors.push(`@context is ${JSON.stringify(r['@context'])}, want "https://schema.org"`);
  }

  for (const n of nodes) {
    const t = n['@type'];
    if (!t) {
      errors.push('node without @type');
      continue;
    }
    if (
      n.inLanguage &&
      lang &&
      n.inLanguage !== LANG_OF[lang] &&
      !String(n.inLanguage).startsWith(lang)
    )
      errors.push(`${t}.inLanguage "${n.inLanguage}" ≠ <html lang="${lang}">`);

    for (const [p, v] of urlProps(n)) {
      let u;
      try {
        u = new URL(v);
      } catch {
        errors.push(`${t}.${p} is not an absolute URL: ${v}`);
        continue;
      }
      if (u.host !== site.host) warnings.push(`${t}.${p} points off-site: ${v}`);
      if (u.pathname.length > 1 && u.pathname.endsWith('/'))
        errors.push(`${t}.${p} has a trailing slash (policy is 'never'): ${v}`);
    }

    if (t === 'BreadcrumbList') {
      const items = n.itemListElement ?? [];
      if (items.length < 2) warnings.push('BreadcrumbList with fewer than 2 items');
      items.forEach((it, i) => {
        if (it.position !== i + 1)
          errors.push(`BreadcrumbList position ${it.position} at index ${i}`);
        if (!it.name) errors.push(`BreadcrumbList item ${i + 1} has no name`);
      });
      const last = items.at(-1)?.item;
      const lastUrl = typeof last === 'string' ? last : last?.['@id'];
      if (canonical && lastUrl && lastUrl !== canonical)
        warnings.push(`last breadcrumb ${lastUrl} ≠ canonical ${canonical}`);
    }

    if (['Article', 'BlogPosting', 'NewsArticle'].includes(t)) {
      if (!n.headline) errors.push(`${t} without headline`);
      else if (n.headline.length > 110)
        warnings.push(`${t}.headline is ${n.headline.length} chars (Google truncates > 110)`);
      for (const k of ['image', 'author', 'datePublished'])
        if (!n[k]) warnings.push(`${t} without ${k} (recommended by Google)`);
      if (n.dateModified && n.datePublished && n.dateModified < n.datePublished)
        errors.push(`${t}.dateModified is before datePublished`);
    }

    if (t === 'FAQPage') {
      for (const q of n.mainEntity ?? [])
        if (q['@type'] !== 'Question' || !q.acceptedAnswer?.text)
          errors.push('FAQPage item is not a Question with acceptedAnswer.text');
    }
  }

  const counts = {};
  for (const t of types) counts[t] = (counts[t] ?? 0) + 1;
  for (const [t, c] of Object.entries(counts))
    if (c > 1 && ['BreadcrumbList', 'WebSite', 'Article'].includes(t))
      errors.push(`${c}× ${t} on one page`);

  return { route, lang, canonical, noindex, types, errors, warnings, blocks };
}

let files;
try {
  files = walk(dist);
} catch {
  console.error(`No build at ${relative(repo, dist)} — run \`pnpm --filter web build\` first.`);
  process.exit(2);
}

const reports = files
  .map(audit)
  .filter((r) => !filter || r.route.includes(filter))
  .sort((a, b) => a.route.localeCompare(b.route));

if (asJson) {
  console.log(JSON.stringify(reports, null, 2));
} else {
  for (const r of reports) {
    const flag = r.errors.length ? '✗' : r.warnings.length ? '!' : '✓';
    const types = r.types.length ? r.types.join(', ') : '—';
    console.log(`${flag} ${r.route}  [${r.lang ?? '?'}${r.noindex ? ', noindex' : ''}]  ${types}`);
    for (const e of r.errors) console.log(`    error: ${e}`);
    for (const w of r.warnings) console.log(`    warn:  ${w}`);
    if (dump)
      for (const b of r.blocks) console.log(JSON.stringify(b, null, 2).replace(/^/gm, '    '));
  }
  const e = reports.reduce((s, r) => s + r.errors.length, 0);
  const w = reports.reduce((s, r) => s + r.warnings.length, 0);
  console.log(`\n${reports.length} pages, ${e} errors, ${w} warnings`);
}

process.exit(reports.some((r) => r.errors.length) ? 1 : 0);
