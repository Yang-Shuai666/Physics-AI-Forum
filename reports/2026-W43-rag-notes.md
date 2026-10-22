---
title: 2026-W43 Advanced RAG 与向量数据库学习小记
author: 大大帅
date: 2026-10-21
week: 2026-W43
directions:
  - agent
goal: 完成 Advanced RAG 与生产级向量数据库的学习
summary: 用 LangChain 跑通了最小 RAG 流程（切分 → 向量化 → 检索 → 生成），下一步补 Advanced RAG 与向量库选型。
tags:
  - RAG
  - LangChain
---

## 本周目标

- 跑通一条最小的 RAG 链路，理解各环节的输入输出

## 做了什么

- 用 LangChain 实现文档切分 → embedding → 向量检索 → 生成
- 对照 [AgentGuide 学习路线](https://github.com/adongwanai/AgentGuide/blob/main/docs/05-roadmaps/learning-roadmap-development.md) 划出后续要补的模块

## 结论与数据

- 召回质量对最终答案的影响远大于 prompt 微调
- 切分策略（chunk size / overlap）需要按文档类型分别调

## 问题与讨论点

1. RAG 方向还有哪些值得读的论文？
2. 生产环境里向量库选型更看重什么：召回率、延迟还是运维成本？

## 下周计划

- 学习 Advanced RAG（查询改写、重排、混合检索）
- 调研生产级向量数据库的选型
