import test from "node:test";
import assert from "node:assert/strict";
import { validateReportFile } from "./validate-reports.mjs";

const validMarkdown = `---
title: 标题
author: 作者
date: 2026-10-21
week: 2026-W43
directions:
  - agent
goal: 学习目标
summary: 摘要
---

# 标题

正文内容\n`;

test("validateReportFile passes valid report", () => {
  const errors = validateReportFile("2026-W43-agent.md", validMarkdown);
  assert.equal(errors.length, 0);
});

test("validateReportFile reports filename and required fields", () => {
  const markdown = `---\ntitle:\nauthor:\ndate: 2026-99-99\nweek: 2026-W88\ndirections:\ngoal:\nsummary:\n---\n`;
  const errors = validateReportFile("bad_name.md", markdown);
  assert.ok(errors.some((item) => item.field === "filename"));
  assert.ok(errors.some((item) => item.field === "title"));
  assert.ok(errors.some((item) => item.field === "date"));
  assert.ok(errors.some((item) => item.field === "week"));
  assert.ok(errors.some((item) => item.field === "content"));
});
