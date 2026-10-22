import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./lib/config.mjs";
import { loadReports } from "./lib/content.mjs";

const cfg = loadConfig(process.cwd());
const { reports, diagnostics } = await loadReports(cfg);

const errors = diagnostics.filter((d) => d.level === "error");
const warnings = diagnostics.filter((d) => d.level === "warn");

/* ---------- 附件体积 ---------- */
const limits = {
  assetWarnKB: 300,
  assetErrorKB: 1024,
  assetsTotalWarnMB: 200,
  ...(cfg.limits ?? {}),
};

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const assetsDir = path.join(cfg.root, "reports", "assets");
const assetFiles = (await walk(assetsDir)).filter((file) => !/\.(md|markdown|gitkeep)$/i.test(file) && !path.basename(file).startsWith("."));
let totalBytes = 0;
let biggest = null;

for (const file of assetFiles) {
  const stat = await fs.stat(file);
  totalBytes += stat.size;
  const kb = Math.round(stat.size / 1024);
  const rel = path.relative(cfg.root, file).replace(/\\/g, "/");

  if (kb > limits.assetErrorKB) {
    const item = { level: "error", file: rel, message: `附件 ${kb}KB，超过 ${limits.assetErrorKB}KB 上限，请压缩或换 WebP 后再提交` };
    diagnostics.push(item);
    errors.push(item);
  } else if (kb > limits.assetWarnKB) {
    const item = { level: "warn", file: rel, message: `附件 ${kb}KB，超过建议值 ${limits.assetWarnKB}KB，建议压缩（网页上的图 300KB 足够清晰）` };
    diagnostics.push(item);
    warnings.push(item);
  }

  if (!biggest || stat.size > biggest.bytes) biggest = { rel, bytes: stat.size };
}

const totalMB = totalBytes / (1024 * 1024);
if (totalMB > limits.assetsTotalWarnMB) {
  const item = {
    level: "warn",
    file: "reports/assets",
    message: `附件总计 ${totalMB.toFixed(1)}MB，超过 ${limits.assetsTotalWarnMB}MB。Pages 站点上限是 1GB，建议把大文件放网盘`,
  };
  diagnostics.push(item);
  warnings.push(item);
}

/* ---------- 输出 ---------- */
for (const item of diagnostics) {
  const level = item.level === "error" ? "::error" : "::warning";
  const file = item.file.includes("/") ? item.file : `reports/${item.file}`;
  console.log(`${level} file=${file}::${item.message}`);
}

if (!cfg.giscus?.repoId || String(cfg.giscus.repoId).startsWith("REPLACE_")) {
  const item = { level: "warn", file: "site.config.json", message: "giscus 未配置，周报页的评论区只会显示占位提示" };
  diagnostics.push(item);
  warnings.push(item);
  console.log(`::warning file=site.config.json::${item.message}`);
}

console.log(`\n检查 ${reports.length} 份周报：${errors.length} 个错误，${warnings.length} 个警告`);
console.log(`附件 ${assetFiles.length} 个，共 ${totalMB.toFixed(2)}MB${biggest ? `，最大 ${path.basename(biggest.rel)} ${Math.round(biggest.bytes / 1024)}KB` : ""}`);

if (errors.length > 0) {
  console.log("\n常见修法：");
  console.log("  1. front matter 字段名用英文：title / author / date / week / directions / goal / summary");
  console.log("  2. 文件名用 2026-W43-英文slug.md，前缀周次和 date 必须一致");
  console.log("  3. 缺 direction 时先到 site.config.json 的 directions 里登记");
  console.log("  4. 标题重复就去改标题；图片要在 reports/assets/ 下真实存在");
  process.exit(1);
}
