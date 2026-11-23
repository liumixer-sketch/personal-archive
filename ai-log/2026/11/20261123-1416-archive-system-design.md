---
id: ai-log-20261123-1416-archive-system-design
type: ai-log
title: 与 WorkBuddy 设计个人档案系统
date: 2026-11-23T14:16:33+08:00
created: 2026-11-23T14:16:33+08:00
source_ai: WorkBuddy
model: deepseek-v4-flash
project: personal-archive
tags: [ai, skill, 架构]
status: active
sensitivity: normal
related: []
---

## 背景
需要一个跨 AI 通用的个人档案，解决不同模型之间上下文割裂。

## 结论
用单仓库 + 一份与 AI 无关的格式规范 ARCHIVE-SPEC.md，汇总层由脚本生成。

## 未决
远程仓库与认证方式待定。
