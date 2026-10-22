import { loadConfig } from "./lib/config.mjs";
import { loadReports } from "./lib/content.mjs";

const cfg = loadConfig(process.cwd());
const { reports, diagnostics } = await loadReports(cfg);

const errors = diagnostics.filter((d) => d.level === "error");
const warnings = diagnostics.filter((d) => d.level === "warn");

for (const item of diagnostics) {
  console.log(`${item.level === "error" ? "::error file=reports/" + item.file + "::" : "::warning file=reports/" + item.file + "::"}${item.message}`);
}

if (!cfg.giscus?.repoId || String(cfg.giscus.repoId).startsWith("REPLACE_")) {
  warnings.push({ file: "site.config.json", message: "giscus 未配置，周报页的评论区只会显示占位提示" });
}

console.log(`\n检查 ${reports.length} 份周报：${errors.length} 个错误，${warnings.length} 个警告`);

if (errors.length > 0) {
  console.log("\n常见修法：");
  console.log("  1. front matter 字段名用英文：title / author / date / week / directions / goal / summary");
  console.log("  2. 文件名用 2026-W43-英文slug.md，前缀周次和 date 必须一致");
  console.log("  3. 缺 direction 时先到 site.config.json 的 directions 里登记");
  process.exit(1);
}
