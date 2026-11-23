---
id: work-20261123-1416-archive-arch-decision
type: work
title: 档案系统架构决策：单仓库 + 规范外置 + 索引自动生成
date: 2026-11-23T14:16:47+08:00
created: 2026-11-23T14:16:47+08:00
source_ai: WorkBuddy
model: 
project: personal-archive
tags: [工作, 决策, 架构]
status: active
sensitivity: normal
related: []
---

## 背景
需要让多个 AI 产出的记录不产生混乱。

## 选项
1. 单仓库按领域分目录
2. 多仓库拆分
3. 单仓库 + 结构化数据库

## 决定
方案 1，并外置 ARCHIVE-SPEC.md 作为唯一格式真相。

## 理由
跨 AI 一致性的瓶颈是格式定义，不是存储位置。索引由脚本重建可消除并发写入冲突。

## 影响
任何 AI 只要遵循 spec 就能写入；INDEX.md 禁止手改。
