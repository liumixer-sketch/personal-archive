---
id: knowledge-20261123-1416-cross-ai-format-portability
type: knowledge
title: 跨 AI 档案统一的核心是让格式脱离产品
date: 2026-11-23T14:16:47+08:00
created: 2026-11-23T14:16:47+08:00
source_ai: WorkBuddy
model: 
project: personal-archive
tags: [方法论, ai, 架构]
status: active
sensitivity: normal
related: []
---

## 是什么
多 AI 协作时，一致性的关键不是选哪个工具，而是把数据格式从产品里剥离出来，变成一份任何模型都能读的纯文本约定。

## 为什么重要
产品会换、模型会迭代，格式一旦绑定某家产品的私有结构，迁移成本就不可控。

## 怎么用
1. 写一份 spec 文档，定义字段与命名
2. 所有写入方遵守它
3. 汇总层用脚本生成，避免手写冲突
