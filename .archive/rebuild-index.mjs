#!/usr/bin/env node
// .archive/rebuild-index.mjs — 从各条记录重建 INDEX.md 与 index.json
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, collectRecords, parseArgs, localISO, dateOnly,
} from './lib.mjs';

const args = parseArgs(process.argv);
const CHECK_ONLY = !!args.check;
const FILENAME_RE = /^\d{8}-\d{4}-[a-z0-9-]+\.md$/;

const records = collectRecords();
const problems = [];

// --- 校验 ---
const seen = new Map();
for (const r of records) {
  const name = r.relPath.split('/').pop();
  if (!FILENAME_RE.test(name)) problems.push(`文件名不合规: ${r.relPath}`);
  if (!r.id) problems.push(`缺 id: ${r.relPath}`);
  if (!r.type) problems.push(`缺 type: ${r.relPath}`);
  if (!r.title) problems.push(`缺 title: ${r.relPath}`);
  if (!r.date) problems.push(`缺 date: ${r.relPath}`);
  if (r.date && isNaN(new Date(r.date))) problems.push(`date 无法解析: ${r.relPath} (${r.date})`);
  if (r.tags.length === 0) problems.push(`tags 为空: ${r.relPath}`);
  if (r.id) {
    if (seen.has(r.id)) problems.push(`id 重复: ${r.id} → ${seen.get(r.id)} / ${r.relPath}`);
    else seen.set(r.id, r.relPath);
  }
}

if (CHECK_ONLY) {
  console.log(`扫描 ${records.length} 条记录`);
  if (problems.length === 0) {
    console.log('✓ 全部合规');
    process.exit(0);
  }
  console.log(`发现 ${problems.length} 个问题:`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}

// --- 排序：日期倒序 ---
records.sort((a, b) => new Date(b.date) - new Date(a.date));

// --- index.json ---
const index = {
  generated: localISO(new Date()),
  count: records.length,
  records: records.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    date: r.date,
    status: r.status || 'active',
    tags: r.tags,
    project: r.project || '',
    source_ai: r.source_ai || '',
    sensitivity: r.sensitivity || 'normal',
    path: r.relPath,
  })),
};
writeFileSync(join(ROOT, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');

// --- INDEX.md ---
const TYPE_LABEL = {
  'ai-log': 'AI 使用记录',
  work: '工作档案',
  life: '生活档案',
  knowledge: '知识沉淀',
  inbox: '待分类',
};
const TYPE_ORDER = ['ai-log', 'work', 'life', 'knowledge', 'inbox'];

const byType = new Map(TYPE_ORDER.map((t) => [t, []]));
for (const r of records) {
  const t = byType.has(r.type) ? r.type : 'inbox';
  byType.get(t).push(r);
}

const lines = [];
lines.push('# 档案索引');
lines.push('');
lines.push('> 本文件由 `.archive/rebuild-index.mjs` 自动生成，**请勿手改**。');
lines.push(`> 最后更新：${index.generated} · 共 **${records.length}** 条`);
lines.push('');
lines.push('## 统计');
lines.push('');
lines.push('| 类型 | 数量 |');
lines.push('|---|---:|');
for (const t of TYPE_ORDER) {
  lines.push(`| ${TYPE_LABEL[t]} \`${t}\` | ${byType.get(t).length} |`);
}
lines.push('');

for (const t of TYPE_ORDER) {
  const list = byType.get(t);
  if (list.length === 0) continue;
  lines.push(`## ${TYPE_LABEL[t]} \`${t}\`（${list.length}）`);
  lines.push('');
  lines.push('| 日期 | 标题 | 标签 | 状态 |');
  lines.push('|---|---|---|---|');
  for (const r of list) {
    const d = dateOnly(r.date);
    const link = `[${r.title.replace(/\|/g, '\\|')}](${encodeURI(r.relPath)})`;
    const tags = r.tags.length ? r.tags.join(', ') : '—';
    lines.push(`| ${d} | ${link} | ${tags} | ${r.status || 'active'} |`);
  }
  lines.push('');
}

// --- 项目视图 ---
const projects = new Map();
for (const r of records) {
  if (!r.project) continue;
  if (!projects.has(r.project)) projects.set(r.project, []);
  projects.get(r.project).push(r);
}
if (projects.size) {
  lines.push('## 按项目');
  lines.push('');
  for (const [p, list] of [...projects.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`- **${p}**（${list.length}）— ${list[0].title}`);
  }
  lines.push('');
}

// --- 标签云 ---
const tagCount = new Map();
for (const r of records) for (const tg of r.tags) tagCount.set(tg, (tagCount.get(tg) || 0) + 1);
if (tagCount.size) {
  lines.push('## 标签');
  lines.push('');
  const sorted = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);
  lines.push(sorted.map(([tg, n]) => `\`${tg}\`×${n}`).join(' · '));
  lines.push('');
}

writeFileSync(join(ROOT, 'INDEX.md'), lines.join('\n'), 'utf8');

console.log(`✓ 索引已重建：${records.length} 条记录`);
if (problems.length) {
  console.log(`  另有 ${problems.length} 个格式问题（运行 --check 查看）:`);
  for (const p of problems.slice(0, 5)) console.log(`   - ${p}`);
  if (problems.length > 5) console.log(`   ... 还有 ${problems.length - 5} 个`);
}
