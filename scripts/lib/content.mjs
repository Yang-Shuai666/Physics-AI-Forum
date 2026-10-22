import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { isoWeek } from "./weeks.mjs";
import { createMarkdown, renderDocument } from "./markdown.mjs";

/** 允许的历史字段名（中文 -> 规范字段），命中即给出迁移提示。 */
const ALIASES = {
  标题: "title",
  作者: "author",
  日期: "date",
  周次: "week",
  方向: "directions",
  学习方向: "directions",
  标签: "tags",
  目标: "goal",
  近期目标: "goal",
  摘要: "summary",
  阶段总结: "summary",
  总结: "summary",
  讨论链接: "discussion_url",
  原文链接: "source_url",
};

const REQUIRED = ["title", "author", "date", "directions", "goal", "summary"];
const FILE_RE = /^(\d{4}-W\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export async function loadReports(cfg) {
  const dir = path.join(cfg.root, "reports");
  const files = (await fs.readdir(dir))
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .sort();

  const md = createMarkdown();
  const reports = [];
  const diagnostics = [];
  const seen = new Map();
  const titleSeen = new Map();

  for (const file of files) {
    const slug = file.slice(0, -3);
    const raw = await fs.readFile(path.join(dir, file), "utf8");

    let parsed;
    try {
      parsed = matter(raw);
    } catch (error) {
      diagnostics.push({ level: "error", file, message: `front matter 无法解析：${error.message}` });
      continue;
    }

    const fm = normalizeKeys(parsed.data, file, diagnostics);
    // 注意：YAML 会把未加引号的 2026-10-21 解析成 Date 对象，这里统一转回 YYYY-MM-DD
    const date = isoDate(fm.date);
    const derivedWeek = date ? isoWeek(date) : "";
    const week = String(fm.week ?? "") || derivedWeek;

    const report = {
      slug,
      file,
      title: text(fm.title) || slug,
      author: text(fm.author) || "未署名",
      github: text(fm.github).replace(/^@/, ""),
      date,
      week,
      derivedWeek,
      directions: normalizeDirections(toArray(fm.directions), cfg, file, diagnostics),
      tags: toArray(fm.tags),
      goal: text(fm.goal),
      summary: text(fm.summary),
      status: text(fm.status) || "done",
      discussionUrl: text(fm.discussion_url),
      links: normalizeLinks(fm.links),
    };

    validate(report, parsed.content, file, diagnostics, cfg);

    if (week) {
      if (seen.has(week)) {
        diagnostics.push({ level: "warn", file, message: `本周还有 ${seen.get(week)}，同一周多份周报是允许的` });
      }
      seen.set(week, file);
    }

    // 多人同时提交时最常见的事故：复制模板没改标题
    const titleKey = report.title.trim().toLowerCase();
    if (titleSeen.has(titleKey)) {
      diagnostics.push({
        level: "error",
        file,
        message: `标题 “${report.title}” 和 ${titleSeen.get(titleKey)} 完全一样，请改成能区分的标题（例如加上方向或主题）`,
      });
    } else {
      titleSeen.set(titleKey, file);
    }

    const { html, headings } = renderDocument(md, parsed.content);
    report.html = html;
    report.headings = headings;
    reports.push(report);
  }

  reports.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));
  return { reports, diagnostics };
}

function normalizeKeys(data, file, diagnostics) {
  const out = {};
  for (const [rawKey, value] of Object.entries(data ?? {})) {
    const key = ALIASES[rawKey] ?? rawKey;
    out[key] = value;
    if (ALIASES[rawKey]) {
      diagnostics.push({ level: "warn", file, message: `字段 “${rawKey}” 是旧写法，请改成 “${key}”` });
    }
  }
  return out;
}

function validate(report, body, file, diagnostics, cfg) {
  const add = (level, message) => diagnostics.push({ level, file, message });

  for (const key of REQUIRED) {
    const value = report[key];
    if (!value || (Array.isArray(value) && value.length === 0)) add("error", `缺少必填字段 “${key}”`);
  }

  if (report.date && !/^\d{4}-\d{2}-\d{2}$/.test(report.date)) {
    add("error", `date 必须是 YYYY-MM-DD，当前是 “${report.date}”`);
  }
  if (report.date && report.week && report.week !== report.derivedWeek) {
    add("error", `week “${report.week}” 与 date “${report.date}” 不一致，正确值应为 ${report.derivedWeek}`);
  }

  const m = FILE_RE.exec(report.slug);
  if (!m) {
    add("error", `文件名必须是 “YYYY-Www-英文短横线 slug.md”，例如 2026-W43-agent-eval.md（当前 “${file}”）`);
  } else if (report.week && m[1] !== report.week) {
    add("error", `文件名前缀 “${m[1]}” 与周次 “${report.week}” 不一致`);
  }

  if (report.summary && [...report.summary].length > 160) add("warn", "summary 超过 160 字，列表卡片会被截断");
  if (report.status === "draft") add("warn", "status: draft —— 站点会标成草稿，仍会公开显示");
  if (!body.trim()) add("error", "正文为空");

  // 图片 / 附件：必须放在 reports/assets/ 下，且文件要真实存在
  const referenced = new Set();
  for (const match of body.matchAll(/!?\[[^\]]*\]\(\s*(?:\.\/)?assets\/([^)\s]+)/g)) {
    const ref = decodeURIComponent(match[1].replace(/["'<>]/g, ""));
    referenced.add(ref);
    if (!existsSync(path.join(cfg.root, "reports", "assets", ref))) {
      add("error", `引用的附件不存在：reports/assets/${ref}`);
    }
  }
  for (const match of body.matchAll(/!\[[^\]]*\]\(\s*((?!https?:|data:|\/|\.?\/?assets\/)[^)\s]+)/g)) {
    add("error", `图片必须放在 reports/assets/ 下，并用 “assets/…/<文件名>” 引用（当前是 “${match[1]}”）`);
  }
  for (const ref of referenced) {
    if (/\.(md|markdown)$/i.test(ref)) add("warn", `附件里引用了 Markdown 文件 “${ref}”，它不会被发布`);
  }
}

function text(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function isoDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value).trim().slice(0, 10);
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,，、;；\s]+/).map((v) => v.trim()).filter(Boolean);
  return [];
}

function normalizeDirections(list, cfg, file, diagnostics) {
  const keys = [];
  for (const item of list) {
    const key = cfg.alias.get(item) ?? item;
    if (!cfg.directionByKey.has(key)) {
      diagnostics.push({ level: "warn", file, message: `未知方向 “${item}”，请先在 site.config.json 的 directions 里登记` });
      continue;
    }
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

function normalizeLinks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? { label: "链接", url: item } : { label: text(item?.label) || "链接", url: text(item?.url) }))
    .filter((item) => /^https?:\/\//i.test(item.url));
}
