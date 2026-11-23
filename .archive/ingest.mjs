#!/usr/bin/env node
// .archive/ingest.mjs — 归化 inbox 里的外部内容（来自其他 AI 或手动粘贴）
import { readFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import {
  ROOT, parseFrontmatter, localISO, stamp, dateOnly, slugify, deriveSlug, resolveDir,
  writeRecord, ensureDir, parseArgs,
} from './lib.mjs';

const args = parseArgs(process.argv);
const DRY = !!args['dry-run'];
const FORCE_TYPE = args.type ? String(args.type) : null;

if (args.help || args.h) {
  console.log(`用法: node .archive/ingest.mjs [选项]

扫描 inbox/ 下的 .md / .txt，补全 frontmatter、推断类型、移动到对应目录。

选项:
  --dry-run     只打印计划，不动文件
  --type <t>    强制归为某一类型
  --keep        归位后保留 inbox 原件（默认删除，因为已移动）
`);
  process.exit(0);
}

const inbox = join(ROOT, 'inbox');
if (!existsSync(inbox)) {
  console.log('inbox/ 不存在，无需归化。');
  process.exit(0);
}

const files = readdirSync(inbox).filter((n) => {
  if (n.startsWith('.') || n.startsWith('_')) return false;
  const st = statSync(join(inbox, n));
  return st.isFile() && ['.md', '.txt'].includes(extname(n).toLowerCase());
});

if (files.length === 0) {
  console.log('inbox/ 是空的，无需归化。');
  process.exit(0);
}

const AI_NAME = /chatgpt|claude|deepseek|gemini|copilot|kimi|qwen|文心|豆包|通义/i;

function inferType(text, name) {
  const t = `${name}\n${text}`;
  // 强信号优先：内容性质比"提到哪个 AI"更能决定类型
  if (/聊天记录|对话记录|我问|我跟.{0,6}(聊|讨论|问)|它回答|它说|prompt|提示词/i.test(t)) return 'ai-log';
  if (/会议|需求评审|上线|交付|客户|排期|汇报|周报|okr|kpi|项目进展/i.test(t)) return 'work';
  if (/方法论|原理|教程|是什么|怎么用|最佳实践|踩坑|小结|笔记|规范|结论/i.test(t)) return 'knowledge';
  if (/今天|感觉|心情|健康|跑步|睡眠|花了|买了|吃了/i.test(t)) return 'life';
  // 弱信号兜底：只是提到了某家 AI
  if (AI_NAME.test(t)) return 'ai-log';
  return 'inbox';
}

function inferTitle(text, name) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const h1 = lines.find((l) => /^#\s+/.test(l));
  if (h1) return h1.replace(/^#\s+/, '').slice(0, 60);
  if (lines.length) return lines[0].replace(/^[#>*\-]\s*/, '').slice(0, 60);
  return basename(name, extname(name)).slice(0, 60);
}

/** 从正文里识别来源 AI */
function detectAI(text) {
  const MAP = [
    [/\bchatgpt\b|\bgpt-[45]\b/i, 'ChatGPT'],
    [/\bclaude\b/i, 'Claude'],
    [/\bdeepseek\b/i, 'DeepSeek'],
    [/\bgemini\b/i, 'Gemini'],
    [/\bcopilot\b/i, 'Copilot'],
    [/\bkimi\b/i, 'Kimi'],
  ];
  for (const [re, name] of MAP) if (re.test(text)) return name;
  return 'Human';
}

/** title 已承载标题时，去掉正文重复的首行 H1 */
function stripLeadingH1(body, title) {
  const m = body.match(/^\s*#\s+(.+?)\s*(?:\r?\n|$)/);
  if (!m) return body;
  if (m[1].trim() !== String(title).trim()) return body;
  return body.slice(m[0].length).replace(/^\s*\n/, '');
}

const plan = [];

for (const name of files) {
  const file = join(inbox, name);
  const text = readFileSync(file, 'utf8');
  const { data, body } = parseFrontmatter(text);

  const isStructured = Object.keys(data).length > 0 && !!data.type;
  let type = FORCE_TYPE || (isStructured ? data.type : inferType(text, name));
  let title = data.title || inferTitle(body || text, name);
  const dateISO = data.date && !isNaN(new Date(data.date)) ? data.date : localISO(new Date());
  const sensitivity = ['normal', 'private', 'secret'].includes(data.sensitivity)
    ? data.sensitivity
    : 'normal';
  const slug = data.slug
    ? slugify(data.slug)
    : deriveSlug(title, basename(name, extname(name)));

  // inbox 里的泛型内容，尝试升级类型
  if (type === 'inbox') {
    const guess = FORCE_TYPE || inferType(body || text, name);
    if (guess !== 'inbox') type = guess;
  }

  const st = stamp(new Date(dateISO));
  const dir = resolveDir({ type, sub: data.sub, sensitivity, date: dateISO });
  const target = join(dir, `${st}-${slug}.md`);
  const id = data.id || `${type}-${st}-${slug}`;

  const finalBody = stripLeadingH1(body || text, title);
  plan.push({ name, file, target, id, type, title, dateISO, sensitivity, data, body: finalBody });
}

// 输出计划
console.log(`inbox/ 里发现 ${plan.length} 个文件：\n`);
for (const p of plan) {
  const tag = p.type === 'inbox' ? '（无法判定类型，保留在 inbox）' : '';
  console.log(`  ${p.name}`);
  console.log(`    → ${p.type} ${tag}`);
  console.log(`    → ${p.target.replace(ROOT, '').replace(/\\/g, '/')}`);
}

if (DRY) {
  console.log('\n（dry-run，未改动任何文件）');
  process.exit(0);
}

let moved = 0;
for (const p of plan) {
  const merged = {
    id: p.id,
    type: p.type,
    title: p.title,
    date: p.dateISO,
    created: p.data.created || localISO(new Date()),
    source_ai: p.data.source_ai || detectAI(p.body),
    model: p.data.model || '',
    project: p.data.project || '',
    tags: (() => {
      const t = Array.isArray(p.data.tags) ? p.data.tags : p.data.tags ? [p.data.tags] : [];
      return t.length ? t : ['未分类'];
    })(),
    status: p.data.status || 'active',
    sensitivity: p.sensitivity,
    related: Array.isArray(p.data.related) ? p.data.related : [],
  };

  if (existsSync(p.target) && p.target !== p.file) {
    let n = 2;
    const base = p.target.replace(/\.md$/, '');
    while (existsSync(`${base}-${n}.md`)) n++;
    p.target = `${base}-${n}.md`;
  }

  if (p.target === p.file) {
    // 原地更新（inbox 内补 frontmatter）
    writeRecord(p.file, merged, p.body);
  } else {
    writeRecord(p.target, merged, p.body);
    if (!args.keep) {
      try { unlinkSync(p.file); } catch { /* 忽略 */ }
    }
    moved++;
  }
}

console.log(`\n✓ 归化完成，移动 ${moved} 条。`);
if (plan.some((p) => p.type === 'inbox')) console.log('  有记录无法判定类型，仍留在 inbox/，可加 --type 手动指定。');
console.log('下一步: node .archive/rebuild-index.mjs');
