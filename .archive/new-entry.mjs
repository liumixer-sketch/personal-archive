#!/usr/bin/env node
// .archive/new-entry.mjs — 新建一条档案记录
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  localISO, stamp, parseArgs, toList, slugify, deriveSlug, resolveDir, writeRecord, ROOT,
} from './lib.mjs';

const args = parseArgs(process.argv);

if (args.help || args.h) {
  console.log(`用法: node .archive/new-entry.mjs --type <type> --title "标题" [选项]

必填:
  --type       ai-log | work | life | knowledge | inbox
  --title      标题（可用中文）

选填:
  --slug       英文短标识（2-4 词，kebab-case）。不给则从标题推导
  --sub        work: projects|decisions|reviews
               life: journal|health|finance
               knowledge: notes|prompts
  --tags       逗号分隔，如 "工作,决策"
  --project    项目标识
  --source-ai  WorkBuddy | ChatGPT | Claude | DeepSeek | Gemini | Human
  --model      模型标识
  --date       事件发生时间（ISO 8601），默认现在
  --status     active | done | archived，默认 active
  --sensitivity normal | private | secret，默认 normal
  --related    逗号分隔的 id 列表
  --body       正文（短文本）
  --body-file  从文件读正文（长文本/多行用这个）
  --quiet      不打印冗余信息
`);
  process.exit(0);
}

const type = String(args.type || '').trim();
const title = String(args.title || '').trim();

if (!type || !title) {
  console.error('错误: --type 和 --title 必填。用 --help 查看用法。');
  process.exit(1);
}

const VALID = ['ai-log', 'work', 'life', 'knowledge', 'inbox'];
if (!VALID.includes(type)) {
  console.error(`错误: type 必须是 ${VALID.join(' / ')} 之一，收到 "${type}"`);
  process.exit(1);
}

const now = new Date();
const dateISO = args.date ? String(args.date) : localISO(now);
const sensitivity = ['normal', 'private', 'secret'].includes(args.sensitivity)
  ? args.sensitivity
  : 'normal';

const slug = args.slug ? slugify(args.slug) : deriveSlug(title);

// 正文
let body = '';
if (args['body-file']) {
  const p = String(args['body-file']);
  body = existsSync(p) ? readFileSync(p, 'utf8') : '';
  if (!body) console.error(`警告: body-file 不存在或为空: ${p}`);
} else if (args.body && args.body !== true) {
  body = String(args.body);
}

const id = `${type}-${stamp(new Date(dateISO))}-${slug}`;
const dir = resolveDir({ type, sub: args.sub, sensitivity, date: dateISO });
let file = join(dir, `${stamp(new Date(dateISO))}-${slug}.md`);

// 同名防撞
if (existsSync(file)) {
  let n = 2;
  while (existsSync(join(dir, `${stamp(new Date(dateISO))}-${slug}-${n}.md`))) n++;
  file = join(dir, `${stamp(new Date(dateISO))}-${slug}-${n}.md`);
}

const data = {
  id,
  type,
  title,
  date: dateISO,
  created: localISO(now),
  source_ai: args['source-ai'] ? String(args['source-ai']) : 'Human',
  model: args.model ? String(args.model) : '',
  project: args.project ? String(args.project) : '',
  tags: toList(args.tags),
  status: ['active', 'done', 'archived'].includes(args.status) ? args.status : 'active',
  sensitivity,
  related: toList(args.related),
};

writeRecord(file, data, body);

if (!args.quiet) {
  console.log(`ID=${id}`);
  console.log(`PATH=${file.replace(/\\/g, '/')}`);
  console.log(`SENSITIVITY=${sensitivity}`);
  if (sensitivity === 'secret') console.log('注意: 已写入 secret/，该目录被 .gitignore 排除，不会推送。');
}
