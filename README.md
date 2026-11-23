# personal-archive

个人生活、工作、AI 使用记录与知识沉淀的单一归档仓库。

**这里不是笔记软件，是一个可移植、可版本化、跨 AI 通用的档案层。**

## 为什么存在

我用多个 AI（WorkBuddy / ChatGPT / Claude / DeepSeek）。它们的对话各自封闭，换个工具上下文就断。这个仓库把每次值得留下的东西落成一个文件，格式统一、存在我自己的 GitHub 私有仓库里——随时能读、能检索、能带走，不依赖任何一家的产品。

## 怎么用

在 WorkBuddy 里说一句话就行：

```
记一下：今天跟 DeepSeek 聊了档案系统的索引设计，结论是汇总文件必须脚本生成
```

会自动完成：判定类型 → 补全字段 → 写入文件 → 重建索引 → 提交推送。

查的时候也一样：

```
上次关于索引设计的讨论  /  这周做了什么  /  找关于 github 的记录
```

## 目录

| 目录 | 内容 |
|---|---|
| `inbox/` | 待分类暂存。拿不准就扔这 |
| `ai-log/` | AI 使用记录，按年月分 |
| `work/` | 项目、决策、复盘 |
| `life/` | 日常、健康、财务 |
| `knowledge/` | 结论、方法论、prompt 库 |
| `secret/` | 敏感记录，**不进 git** |

## 关键文件

- **`ARCHIVE-SPEC.md`** — 格式规范，唯一真相。任何 AI 写入前都要读它
- **`PORTABLE-PROMPT.md`** — 粘给其他 AI 的提示词
- **`INDEX.md`** — 自动生成的全局索引，**禁止手改**
- **`index.json`** — 机器索引，**禁止手改**

## 命令

```bash
# 新建一条记录
node .archive/new-entry.mjs --type work --title "标题" --slug some-slug --tags 工作,决策

# 重建索引
node .archive/rebuild-index.mjs

# 检索
node .archive/search.mjs 索引设计 --type ai-log

# 归化 inbox 里的外部内容
node .archive/ingest.mjs
```

## 规矩

1. 一条记录一个文件
2. 汇总层永不手写
3. 拿不准分类就进 `inbox/`
4. 敏感内容标 `sensitivity: secret`，物理隔离到 `secret/`
