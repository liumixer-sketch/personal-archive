#!/usr/bin/env node
// .archive/search.mjs — 检索索引
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv);
const keywords = args._.map((s) => String(s).toLowerCase());

if (args.help || args.h) {
  console.log(`用法: node .archive/search.mjs [关键词...] [选项]

关键词会匹配 title / tags / project / id（全部命中才算匹配）

选项:
  --type       只查某类: ai-log|work|life|knowledge|inbox
  --tag        按标签过滤
  --project    按项目过滤
  --since      起始日期 YYYY-MM-DD
  --until      截止日期 YYYY-MM-DD
  --status     active|done|archived
  --limit      最多返回条数，默认 20
  --json       输出 JSON
`);
  process.exit(0);
}

const indexPath = join(ROOT, 'index.json');
if (!existsSync(indexPath)) {
  console.error('index.json 不存在，先运行: node .archive/rebuild-index.mjs');
  process.exit(1);
}

let idx;
try {
  idx = JSON.parse(readFileSync(indexPath, 'utf8'));
} catch (e) {
  console.error('index.json 解析失败，重建一次试试:', e.message);
  process.exit(1);
}

const limit = Number(args.limit) || 20;

let rows = idx.records.filter((r) => {
  if (args.type && r.type !== args.type) return false;
  if (args.tag && !r.tags.includes(String(args.tag))) return false;
  if (args.project && r.project !== String(args.project)) return false;
  if (args.status && (r.status || 'active') !== args.status) return false;
  if (args.since && new Date(r.date) < new Date(args.since)) return false;
  if (args.until && new Date(r.date) > new Date(`${args.until}T23:59:59`)) return false;

  if (keywords.length) {
    const hay = [r.title, r.id, r.project || '', ...r.tags].join(' ').toLowerCase();
    // 中文无法按空格分词，整体包含判断
    return keywords.every((k) => hay.includes(k));
  }
  return true;
});

rows = rows.slice(0, limit);

if (args.json) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

if (rows.length === 0) {
  console.log('没有匹配的记录。');
  process.exit(0);
}

console.log(`找到 ${rows.length} 条${rows.length >= limit ? `（已截断至 ${limit}）` : ''}：\n`);
for (const r of rows) {
  const d = String(r.date).slice(0, 10);
  const tags = r.tags.length ? ` [${r.tags.join(', ')}]` : '';
  console.log(`${d}  ${r.title}${tags}`);
  console.log(`          ${r.type} · ${r.id}`);
  console.log(`          ${r.path}`);
}
