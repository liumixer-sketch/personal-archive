# ARCHIVE-SPEC — 个人档案格式规范 v1

> **这份文件是唯一真相。** 无论记录由 WorkBuddy、ChatGPT、Claude、DeepSeek 还是人手动撰写，只要遵循本规范，就能被本仓库直接接收、索引、检索。
>
> 给 AI 的指令：在向本仓库写入任何内容前，先读完本文件。不要发明新字段，不要改动 `INDEX.md` / `index.json`。

---

## 1. 一条记录 = 一个文件

- 格式：Markdown，以 YAML frontmatter 开头
- 放置：按 `type` 落到对应目录（见第 4 节）
- 命名：`{YYYYMMDD-HHmm}-{slug}.md`
  - `slug`：2–4 个英文单词，kebab-case，全小写，仅含 `a-z0-9-`
  - **禁止中文文件名**（CLI / URL / 跨工具同步易出编码问题）。可读性由 `title` 承担
  - 示例：`20261123-1415-archive-arch-review.md`

## 2. Frontmatter 字段

```yaml
---
id: ai-20261123-1415-archive-arch-review
type: ai-log
title: 与 DeepSeek 讨论档案架构
date: 2026-11-23T14:15:00+08:00
created: 2026-11-23T15:02:11+08:00
source_ai: DeepSeek
model: deepseek-v4
project: personal-archive
tags: [skill, 架构, github]
status: active
sensitivity: normal
related: []
---
```

| 字段 | 必填 | 取值 | 说明 |
|---|---|---|---|
| `id` | ✅ | `{type}-{YYYYMMDD-HHmm}-{slug}` | 全局唯一。与文件名的关系：id 前缀是 type |
| `type` | ✅ | `ai-log` `work` `life` `knowledge` `inbox` | 决定落盘目录 |
| `title` | ✅ | 任意语言 | 一句话说清这条是什么。允许中文 |
| `date` | ✅ | ISO 8601 带时区 | 事件**发生**时间 |
| `created` | ✅ | ISO 8601 带时区 | 记录**写入**时间（补录时二者不同） |
| `source_ai` | ✅ | `WorkBuddy` `ChatGPT` `Claude` `DeepSeek` `Gemini` `Human` `Other` | 谁产出的 |
| `model` | ⬜ | 模型标识 | 如 `deepseek-v4`、`gpt-5`、`claude-sonnet-4` |
| `project` | ⬜ | 短标识 | 归属项目，便于聚合 |
| `tags` | ✅ | 数组，2–5 个 | 见第 5 节标签体系 |
| `status` | ✅ | `active` `done` `archived` | `active`=进行中，`done`=已完成，`archived`=不再相关 |
| `sensitivity` | ✅ | `normal` `private` `secret` | 见第 3 节 |
| `related` | ⬜ | id 数组 | 关联记录，形成知识网络 |

**缺字段时的默认值**：`date`/`created` = 当前时间，`source_ai` = `Human`，`status` = `active`，`sensitivity` = `normal`，`tags` = `[]`。
宁可字段不全也不要不写——索引脚本对缺失字段容错，但缺 `id`/`type`/`title` 的记录会被跳过。

## 3. 敏感度分级

| 级别 | 含义 | 落盘位置 | 是否进 git |
|---|---|---|---|
| `normal` | 可入库 | 按 type 常规目录 | ✅ |
| `private` | 不想公开但可上私有云 | 按 type 常规目录 | ✅（仓库本身私有） |
| `secret` | 密码、账号、健康细节等 | `secret/{type}/` | ❌ **被 .gitignore 排除** |

判断标准：**如果这个仓库哪天不小心变成公开的，这条内容会不会让你难受？** 会 → `secret`。

## 4. type → 目录映射

| type | 目录 | 子类 |
|---|---|---|
| `ai-log` | `ai-log/{YYYY}/{MM}/` | — |
| `work` | `work/projects/` | `work/decisions/`（决策记录）、`work/reviews/`（周月复盘） |
| `life` | `life/journal/` | `life/health/`、`life/finance/` |
| `knowledge` | `knowledge/notes/` | `knowledge/prompts/`（prompt 库） |
| `inbox` | `inbox/` | — |

**拿不准就写 `inbox/`。** 分类可以延后，不记录才是损失。

## 5. 标签体系

标签是跨目录串联的主线索。每次选 2–5 个，优先复用已有标签。

- **领域**：`工作` `生活` `健康` `财务` `学习` `技术`
- **性质**：`决策` `复盘` `灵感` `结论` `踩坑` `方法论` `prompt`
- **技术**：`skill` `github` `架构` `ai` `自动化`
- **自定义**：允许，但先看 `INDEX.md` 里有没有近义的

## 6. 正文结构（建议，不强求）

不同 type 有不同骨架。**宁可短，不要空**。

**ai-log**
```markdown
## 背景
为什么开这个对话

## 结论
这次聊出了什么可用的东西

## 未决
还有什么没解决
```

**work / decisions**
```markdown
## 背景
## 选项
## 决定
## 理由
## 影响
```

**life / journal**
```markdown
自由书写，无需小标题。
```

**knowledge**
```markdown
## 是什么
## 为什么重要
## 怎么用
## 来源
```

## 7. 禁止事项

1. **不要手改 `INDEX.md` / `index.json`** —— 由 `rebuild-index.mjs` 生成，手改会被覆盖
2. **不要修改已有记录的 `id`** —— `related` 靠它引用
3. **不要覆盖他人已写入的文件** —— 追加新记录即可，历史靠 git 保证
4. **不要在一个文件里塞多条记录** —— 一条一个文件，否则索引和 diff 都会失效

## 8. 如何校验

```bash
node .archive/rebuild-index.mjs --check
```

输出缺字段、id 重复、文件名不合规的记录清单。
