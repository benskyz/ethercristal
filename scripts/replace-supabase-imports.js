/**
 * scripts/replace-supabase-imports.js
 * - Remplace getSupabaseBrowserClient -> requireSupabaseBrowserClient
 * - Ajuste les imports groupés pour ne garder que requireSupabaseBrowserClient
 * - Ignore lib/supabase.ts (ne pas modifier)
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORES = [
  path.join('lib', 'supabase.ts'),
  path.join('lib', 'supabase.js'),
];

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // skip node_modules and .next
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'dist') continue;
      walk(full, cb);
    } else {
      cb(full);
    }
  }
}

const files = [];
['app','hooks','lib','components','pages','src'].forEach(folder => {
  const p = path.join(ROOT, folder);
  if (fs.existsSync(p)) walk(p, f => files.push(f));
});

// also include root-level files matching extensions
fs.readdirSync(ROOT).forEach(f => {
  const full = path.join(ROOT, f);
  if (fs.statSync(full).isFile() && EXTS.includes(path.extname(f))) files.push(full);
});

const targetFiles = files.filter(f => EXTS.includes(path.extname(f)) && !IGNORES.includes(path.relative(ROOT, f)));

let modified = [];

for (const file of targetFiles) {
  let src = fs.readFileSync(file, 'utf8');
  let original = src;

  // 1) Replace calls: getSupabaseBrowserClient() -> requireSupabaseBrowserClient()
  src = src.replace(/\bgetSupabaseBrowserClient\s*\(\s*\)/g, 'requireSupabaseBrowserClient()');

  // 2) Replace imports that reference getSupabaseBrowserClient
  // handle forms like:
  // import { getSupabaseBrowserClient } from '...';
  // import { getSupabaseBrowserClient, requireSupabaseBrowserClient } from '...';
  // import { requireSupabaseBrowserClient, getSupabaseBrowserClient } from '...';
  src = src.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*(['"][^'"]+['"])\s*;?/g, (m, group, from) => {
    const parts = group.split(',').map(s => s.trim()).filter(Boolean);
    // remove getSupabaseBrowserClient if present
    const kept = new Set(parts.filter(p => p !== 'getSupabaseBrowserClient'));
    // ensure requireSupabaseBrowserClient remains if any supabase import existed
    if (parts.some(p => p === 'getSupabaseBrowserClient' || p === 'requireSupabaseBrowserClient')) {
      kept.add('requireSupabaseBrowserClient');
    }
    // if nothing to import, return original (avoid empty import)
    const arr = Array.from(kept);
    if (arr.length === 0) return m;
    return `import { ${arr.join(', ')} } from ${from};`;
  });

  // 3) A small cleanup: if import now duplicates or has trailing comma spaces, tidy (basic)
  src = src.replace(/import\s*\{\s*([,\s]+)\s*\}\s*from/g, match => match); // noop, keeps safe

  if (src !== original) {
    fs.writeFileSync(file, src, 'utf8');
    modified.push(path.relative(ROOT, file));
  }
}

console.log('Done. fichiers modifiés:', modified.length);
modified.forEach(f => console.log(' -', f));
if (modified.length === 0) console.log('Aucun fichier modifié (peut-être déjà à jour).');
