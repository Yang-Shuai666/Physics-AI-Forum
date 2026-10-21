import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FILE_NAME_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])-[A-Za-z0-9_\-\u4e00-\u9fa5]+\.md$/u;
const WEEK_RE = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const REQUIRED_FIELDS = ["title", "author", "date", "week", "directions", "goal", "summary"];

function parseFrontMatter(markdown) {
  const source = markdown.replace(/\r\n/g, "\n");
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { data: {}, body: source, hasFrontMatter: false, lineMap: {} };
  }

  const data = {};
  const lineMap = {};
  let currentListKey = null;
  const lines = match[1].split("\n");

  lines.forEach((line, index) => {
    const lineNo = index + 2;
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") && currentListKey) {
      if (!Array.isArray(data[currentListKey])) {
        data[currentListKey] = [];
      }
      data[currentListKey].push(trimmed.slice(2).trim());
      return;
    }

    const splitIndex = line.indexOf(":");
    if (splitIndex === -1) return;

    const key = line.slice(0, splitIndex).trim();
    const value = line.slice(splitIndex + 1).trim();
    lineMap[key] = lineNo;

    if (value === "") {
      data[key] = "";
      currentListKey = key;
    } else {
      data[key] = value;
      currentListKey = null;
    }
  });

  return {
    data,
    lineMap,
    hasFrontMatter: true,
    body: source.slice(match[0].length)
  };
}

function isValidDate(date) {
  const match = date.match(DATE_RE);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isValidWeek(week) {
  return WEEK_RE.test(week);
}

export function validateReportFile(fileName, markdown) {
  const errors = [];

  if (!FILE_NAME_RE.test(fileName)) {
    errors.push({
      file: fileName,
      field: "filename",
      message:
        "文件名必须符合 YYYY-Www-主题.md，主题仅允许中文、英文、数字、下划线和连字符。"
    });
  }

  const parsed = parseFrontMatter(markdown);

  if (!parsed.hasFrontMatter) {
    errors.push({
      file: fileName,
      field: "front matter",
      message: "缺少 front matter（--- 包裹的元数据块）。"
    });
    return errors;
  }

  for (const field of REQUIRED_FIELDS) {
    const value = parsed.data[field];
    const line = parsed.lineMap[field];

    if (Array.isArray(value)) {
      if (value.length === 0 || value.every((item) => !item.trim())) {
        errors.push({
          file: fileName,
          line,
          field,
          message: `${field} 不能为空。`
        });
      }
      continue;
    }

    if (typeof value !== "string" || !value.trim()) {
      errors.push({
        file: fileName,
        line,
        field,
        message: `${field} 为必填字段。`
      });
    }
  }

  const date = parsed.data.date;
  if (typeof date === "string" && date.trim() && !isValidDate(date.trim())) {
    errors.push({
      file: fileName,
      line: parsed.lineMap.date,
      field: "date",
      message: "date 格式必须为 YYYY-MM-DD 且为有效日期。"
    });
  }

  const week = parsed.data.week;
  if (typeof week === "string" && week.trim() && !isValidWeek(week.trim())) {
    errors.push({
      file: fileName,
      line: parsed.lineMap.week,
      field: "week",
      message: "week 格式必须为 YYYY-Www，周次范围 01-53。"
    });
  }

  const directions = parsed.data.directions;
  if (
    typeof directions === "string" &&
    directions.trim() &&
    !directions
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean).length
  ) {
    errors.push({
      file: fileName,
      line: parsed.lineMap.directions,
      field: "directions",
      message: "directions 不能为空。"
    });
  }

  if (!parsed.body.trim()) {
    errors.push({
      file: fileName,
      field: "content",
      message: "报告正文不能为空。"
    });
  }

  return errors;
}

export async function validateReportsDir(reportsDir) {
  const fileNames = await fs.readdir(reportsDir);
  const targets = fileNames.filter(
    (name) => name.endsWith(".md") && !name.startsWith("_")
  );

  const errors = [];

  for (const fileName of targets) {
    const fullPath = path.join(reportsDir, fileName);
    const markdown = await fs.readFile(fullPath, "utf8");
    errors.push(...validateReportFile(fileName, markdown));
  }

  return { files: targets.length, errors };
}

function formatError(error) {
  const linePart = error.line ? `:${error.line}` : "";
  return `${error.file}${linePart} [${error.field}] ${error.message}`;
}

async function run() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const reportsDir = path.join(repoRoot, "reports");
  const result = await validateReportsDir(reportsDir);

  if (result.errors.length > 0) {
    console.error(`❌ 周报校验失败，共 ${result.errors.length} 个问题：`);
    for (const error of result.errors) {
      console.error(`- ${formatError(error)}`);
    }
    process.exit(1);
  }

  console.log(`✅ 周报校验通过，共检查 ${result.files} 个文件。`);
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (scriptPath === modulePath) {
  run().catch((error) => {
    console.error("周报校验执行失败：", error);
    process.exit(1);
  });
}
