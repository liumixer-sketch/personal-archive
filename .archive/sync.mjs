#!/usr/bin/env node
// .archive/sync.mjs — 提交并推送，把 git 的琐碎细节收在一处
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-m' || a === '--message') out.message = argv[++i];
    else if (a === '--push-only') out.pushOnly = true;
    else if (!a.startsWith('-')) out.message = out.message || a;
  }
  return out;
}

const args = parseArgs(process.argv);
const message = args.message || 'archive: 更新';

function git(argv, { timeout = 45000, allowFail = false } = {}) {
  try {
    return {
      ok: true,
      out: execFileSync('git', argv, {
        cwd: ROOT, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'],
      }),
    };
  } catch (e) {
    const err = (e.stderr || e.message || '').toString().trim();
    if (!allowFail) throw new Error(`git ${argv.join(' ')} 失败: ${err}`);
    return { ok: false, out: '', err };
  }
}

function push() {
  const r = git(['push', 'origin', 'HEAD'], { timeout: 90000, allowFail: true });
  if (r.ok) {
    console.log('✓ 已推送');
    return true;
  }
  console.log('⚠ 提交成功，但推送失败（网络问题，本地记录已安全保存）');
  console.log(`  ${r.err.split('\n')[0]}`);
  console.log('  稍后重试: node .archive/sync.mjs --push-only');
  return false;
}

if (args.pushOnly) {
  push();
  process.exit(0);
}

git(['add', '-A']);

const status = git(['status', '--porcelain']).out.trim();
if (!status) {
  console.log('（无变更，跳过提交）');
  process.exit(0);
}

git(['commit', '-q', '-m', message]);
const hash = git(['rev-parse', '--short', 'HEAD']).out.trim();
console.log(`✓ 已提交 ${hash} · ${message}`);

push();
