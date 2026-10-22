import fs from "node:fs";
import path from "node:path";

/** 读取站点配置，并把 basePath 规范成以 / 开头、以 / 结尾。 */
export function loadConfig(projectRoot = process.cwd()) {
  const file = path.join(projectRoot, "site.config.json");
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  const directions = cfg.directions ?? [];
  const basePath = normalizeBase(process.env.BASE_PATH ?? cfg.basePath ?? "/");

  return {
    ...cfg,
    root: projectRoot,
    basePath,
    directions,
    directionByKey: new Map(directions.map((d) => [d.key, d])),
    alias: new Map(Object.entries(cfg.aliases ?? {})),
  };
}

function normalizeBase(value) {
  if (!value || value === "/") return "/";
  return `/${String(value).replace(/^\/+|\/+$/g, "")}/`;
}

/** 站内相对路径 -> 带 basePath 的绝对路径，适用于 GitHub Pages 项目页子路径。 */
export function withBase(cfg, pathname = "") {
  return cfg.basePath + String(pathname).replace(/^\/+/, "");
}

export function absoluteUrl(cfg, pathname = "") {
  return `${String(cfg.siteUrl).replace(/\/+$/, "")}${withBase(cfg, pathname)}`;
}
