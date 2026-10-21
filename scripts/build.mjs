import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const webDir = path.join(root, "web");
const reportsDir = path.join(root, "reports");
const distDir = path.join(root, "dist");

const repoSlug = "Yang-Shuai666/Physics-AI-Forum";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyDir(src, dest) {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, content: markdown };
  const raw = match[1];
  const content = markdown.slice(match[0].length);
  const data = {};
  let currentListKey = null;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") && currentListKey) {
      if (!Array.isArray(data[currentListKey])) {
        data[currentListKey] = [];
      }
      data[currentListKey].push(trimmed.slice(2).trim());
      continue;
    }
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (value === "") {
      data[key] = "";
      currentListKey = key;
    } else {
      currentListKey = null;
      data[key] = value;
    }
  }
  return { data, content };
}

function normalizeDirections(directions) {
  if (Array.isArray(directions)) return directions.filter(Boolean);
  if (typeof directions === "string" && directions.trim()) {
    return directions
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toSummary(content) {
  const text = content
    .replace(/\r/g, "")
    .replace(/^#+\s?/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
  return text.slice(0, 140);
}

function defaultIssueFallback(title) {
  const issueTitle = encodeURIComponent(`[周报讨论] ${title}`);
  return `https://github.com/${repoSlug}/issues/new?title=${issueTitle}`;
}

async function build() {
  await fs.rm(distDir, { recursive: true, force: true });
  await ensureDir(distDir);

  await copyDir(webDir, distDir);
  await copyDir(reportsDir, path.join(distDir, "reports"));

  const files = await fs.readdir(reportsDir);
  const reportFiles = files.filter(
    (name) => name.endsWith(".md") && !name.startsWith("_")
  );

  const reports = [];

  for (const fileName of reportFiles) {
    const fullPath = path.join(reportsDir, fileName);
    const markdown = await fs.readFile(fullPath, "utf8");
    const { data, content } = parseFrontMatter(markdown);

    const title = data.title || fileName.replace(".md", "");
    const directions = normalizeDirections(data.directions);
    const discussionUrl = data.discussion_url || "";
    const issueFallbackUrl = data.issue_fallback_url || defaultIssueFallback(title);

    reports.push({
      title,
      author: data.author || "未署名",
      date: data.date || "",
      week: data.week || "",
      directions,
      goal: data.goal || "",
      reportPath: `reports/${fileName}`,
      summary: data.summary || toSummary(content),
      discussionUrl,
      issueFallbackUrl
    });
  }

  reports.sort((a, b) => (a.date < b.date ? 1 : -1));

  await fs.writeFile(
    path.join(distDir, "reports", "index.json"),
    JSON.stringify(reports, null, 2),
    "utf8"
  );
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
