// .archive/lib.mjs — 共享工具，零依赖
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ARCHIVE_DIR = dirname(fileURLToPath(import.meta.url));
export const ROOT = dirname(ARCHIVE_DIR);

const SKIP_DIRS = new Set(['.git', 'node_modules', 'secret', '.archive', '_attachments']);
const SKIP_FILES = new Set([
  'README.md', 'ARCHIVE-SPEC.md', 'PORTABLE-PROMPT.md', 'INDEX.md',
  'CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.gitkeep',
]);

export const FIELD_ORDER = [
  'id', 'type', 'title', 'date', 'created', 'source_ai',
  'model', 'project', 'tags', 'status', 'sensitivity', 'related',
];

export const TYPES = ['ai-log', 'work', 'life', 'knowledge', 'inbox'];
export const SUBDIRS = {
  work: ['projects', 'decisions', 'reviews'],
  life: ['journal', 'health', 'finance'],
  knowledge: ['notes', 'prompts'],
};

const pad = (n) => String(n).padStart(2, '0');

/** 本地时区 ISO 8601，形如 2026-11-23T14:15:00+08:00 */
export function localISO(d = new Date()) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const a = Math.abs(off);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
  );
}

/** 20261123-1415 */
export function stamp(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** 2026-11-23 */
export function dateOnly(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function stripQuote(s) {
  const t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** 解析 frontmatter，返回 {data, body} */
export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  const data = {};
  const lines = m[1].split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const idx = line.indexOf(':');
    if (idx === -1) { i++; continue; }
    const key = line.slice(0, idx).trim();
    const raw = line.slice(idx + 1).trim();

    if (raw === '') {
      // 可能是多行列表写法
      const arr = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
        arr.push(stripQuote(lines[j].replace(/^\s*-\s+/, '').trim()));
        j++;
      }
      if (arr.length) { data[key] = arr; i = j; continue; }
      data[key] = '';
      i++;
      continue;
    }

    if (raw.startsWith('[') && raw.endsWith(']')) {
      const inner = raw.slice(1, -1).trim();
      data[key] = inner ? inner.split(',').map((s) => stripQuote(s.trim())).filter(Boolean) : [];
    } else {
      data[key] = stripQuote(raw);
    }
    i++;
  }
  return { data, body: text.slice(m[0].length) };
}

/** 序列化 frontmatter，固定字段顺序 */
export function stringifyFrontmatter(data, body = '') {
  const keys = [
    ...FIELD_ORDER.filter((k) => k in data),
    ...Object.keys(data).filter((k) => !FIELD_ORDER.includes(k)),
  ];
  const head = keys.map((k) => {
    const v = data[k];
    if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`;
    return `${k}: ${v === undefined || v === null ? '' : v}`;
  });
  return `---\n${head.join('\n')}\n---\n\n${String(body).replace(/^\n+/, '')}\n`;
}

export function readRecord(file) {
  const text = readFileSync(file, 'utf8');
  const { data, body } = parseFrontmatter(text);
  return {
    ...data,
    tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
    related: Array.isArray(data.related) ? data.related : [],
    path: file,
    relPath: relative(ROOT, file).split('\\').join('/'),
    body,
  };
}

export function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, out);
    } else if (extname(name).toLowerCase() === '.md' && !SKIP_FILES.has(name)) {
      out.push(full);
    }
  }
  return out;
}

/** 收集所有已归档记录（不含 secret/） */
export function collectRecords() {
  return walk(ROOT)
    .map((f) => {
      try {
        return readRecord(f);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/** type + 子类 + 敏感度 → 绝对目录 */
export function resolveDir({ type, sub, sensitivity, date }) {
  const base = sensitivity === 'secret' ? join(ROOT, 'secret') : ROOT;
  const d = new Date(date);
  const y = String(isNaN(d) ? new Date().getFullYear() : d.getFullYear());
  const mo = pad(isNaN(d) ? new Date().getMonth() + 1 : d.getMonth() + 1);
  switch (type) {
    case 'ai-log':
      return join(base, 'ai-log', y, mo);
    case 'work':
      return join(base, 'work', normalizeSub('work', sub));
    case 'life':
      return join(base, 'life', normalizeSub('life', sub));
    case 'knowledge':
      return join(base, 'knowledge', normalizeSub('knowledge', sub));
    default:
      return join(base, 'inbox');
  }
}

function normalizeSub(type, sub) {
  const allowed = SUBDIRS[type] || [];
  if (sub && allowed.includes(sub)) return sub;
  return allowed[0] || '';
}

export function slugify(s) {
  const cleaned = String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
  return cleaned || 'entry';
}

/** 稳定短哈希，用于中文标题无法转 slug 时的兜底 */
export function shortHash(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h.toString(36).slice(0, 5);
}

/** 从标题推导 slug；中文标题退化为 note-xxxx 保证唯一。
 *  优先用 fallback（原文件名），它通常已含语义化的英文词；
 *  标题转出的 slug 过短（如中文句子里夹的 "RAG"）说明只是零散词，不足以做标识。
 */
export function deriveSlug(title, fallback = '') {
  const fromFallback = slugify(String(fallback).replace(/[^a-zA-Z0-9\s-]/g, ' '));
  if (fromFallback !== 'entry' && fromFallback.length >= 4) return fromFallback;
  const fromTitle = slugify(title);
  if (fromTitle !== 'entry' && fromTitle.length >= 4) return fromTitle;
  return `note-${shortHash(`${title}|${fallback}`)}`;
}

export function ensureDir(d) {
  mkdirSync(d, { recursive: true });
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

export function toList(v) {
  if (v === undefined || v === true || v === false) return [];
  return String(v).split(/[,，]/).map((s) => s.trim()).filter(Boolean);
}

export function writeRecord(file, data, body) {
  ensureDir(dirname(file));
  writeFileSync(file, stringifyFrontmatter(data, body), 'utf8');
}

export { basename, join, relative, existsSync, readFileSync, writeFileSync, readdirSync, statSync };
