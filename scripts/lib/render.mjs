import { withBase, absoluteUrl } from "./config.mjs";
import { weekLabel } from "./weeks.mjs";

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const reportUrl = (cfg, report) => withBase(cfg, `reports/${report.slug}/`);
export const weekUrl = (cfg, week) => withBase(cfg, `week/${week}/`);
export const directionUrl = (cfg, key) => withBase(cfg, `direction/${key}/`);
export const sourceUrl = (cfg, report) =>
  `https://github.com/${cfg.repo}/blob/${cfg.branch}/reports/${encodeURIComponent(report.file)}`;

const NAV = [
  { href: "", label: "首页" },
  { href: "archive/", label: "归档" },
  { href: "search/", label: "搜索" },
];

function header(cfg, pathname = "") {
  const here = `/${pathname.replace(/^\/+|\/+$/g, "")}${pathname ? "/" : ""}`;
  const links = NAV.map((item) => {
    const target = withBase(cfg, item.href);
    const active = here === `/${item.href}` || (item.href === "" && here === "/") ? " aria-current=\"page\"" : "";
    return `<a href="${target}"${active}>${esc(item.label)}</a>`;
  }).join("");

  return `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${withBase(cfg, "")}">
      <span class="brand-mark">π</span>
      <span class="brand-text">${esc(cfg.title)}<small>${esc(cfg.tagline ?? "")}</small></span>
    </a>
    <nav class="site-nav" aria-label="站点导航">${links}<a href="https://github.com/${esc(cfg.repo)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></nav>
  </div>
</header>`;
}

function footer(cfg) {
  return `<footer class="site-footer">
  <div class="wrap footer-inner">
    <p>${esc(cfg.title)} · 内容以 Markdown 存在 <a href="https://github.com/${esc(cfg.repo)}/tree/${esc(cfg.branch)}/reports" target="_blank" rel="noopener noreferrer">reports/</a>，讨论存在 GitHub Discussions。</p>
    <p class="muted">由 GitHub Pages 静态构建 · 零服务器成本</p>
  </div>
</footer>`;
}

export function layout(cfg, { title, description, pathname = "", bodyClass = "", body, headExtra = "", scripts = "" }) {
  const fullTitle = title ? `${title} · ${cfg.title}` : `${cfg.title} · ${cfg.tagline ?? ""}`;
  const desc = description || cfg.description || "";
  const canonical = absoluteUrl(cfg, pathname);

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(cfg.title)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${withBase(cfg, "favicon.svg")}" type="image/svg+xml">
<link rel="stylesheet" href="${withBase(cfg, "styles.css")}">
${headExtra}</head>
<body class="${esc(bodyClass)}">
<a class="skip-link" href="#main">跳到主要内容</a>
${header(cfg, pathname)}
${body}
${footer(cfg)}
<script type="module" src="${withBase(cfg, "app.js")}"></script>
${scripts}</body>
</html>`;
}

export function chips(cfg, report) {
  return report.directions
    .map((key) => {
      const direction = cfg.directionByKey.get(key);
      return `<a class="chip" href="${directionUrl(cfg, key)}">${esc(direction?.name ?? key)}</a>`;
    })
    .join("");
}

export function reportCard(cfg, report) {
  const searchText = [report.title, report.author, report.summary, report.goal, report.week, report.tags.join(" "), report.directions.join(" ")].join(" ");
  return `<article class="card" data-search="${esc(searchText.toLowerCase())}">
  <a class="card-title" href="${reportUrl(cfg, report)}">${esc(report.title)}</a>
  <p class="card-summary">${esc(report.summary || report.goal)}</p>
  <p class="card-meta"><span>${esc(report.author)}</span><span>${esc(report.date)}</span><span>${esc(report.week)}</span></p>
  <div class="chips">${chips(cfg, report)}</div>
</article>`;
}

export function toc(cfg, headings) {
  if (!headings || headings.length === 0) return "";
  const items = headings
    .map((h) => `<li class="toc-${h.level}"><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`)
    .join("");
  return `<nav class="toc" aria-label="本页目录"><p class="toc-title">本页目录</p><ol>${items}</ol></nav>`;
}

export function giscusBlock(cfg, report) {
  const giscus = cfg.giscus ?? {};
  const configured = giscus.enabled && giscus.repoId && giscus.categoryId && !String(giscus.repoId).startsWith("REPLACE_");

  if (!configured) {
    return `<section class="comments comments-empty">
  <h2>讨论</h2>
  <p>评论组件还没配置（<code>site.config.json → giscus</code>）。先在 <a href="https://giscus.app" target="_blank" rel="noopener noreferrer">giscus.app</a> 生成配置，把 <code>repoId</code> 和 <code>categoryId</code> 填进配置文件即可在此页开启讨论。</p>
  <p><a class="button" href="${esc(report.discussionUrl || `https://github.com/${cfg.repo}/discussions`)}" target="_blank" rel="noopener noreferrer">先到 GitHub Discussions 讨论</a></p>
</section>`;
  }

  return `<section class="comments">
  <h2>讨论</h2>
  <p class="muted">用 GitHub 账号在下方直接评论；每条评论会同步成该周报的一条 Discussion。</p>
  <script src="https://giscus.app/client.js"
    data-repo="${esc(cfg.repo)}"
    data-repo-id="${esc(giscus.repoId)}"
    data-category="${esc(giscus.category)}"
    data-category-id="${esc(giscus.categoryId)}"
    data-mapping="${esc(giscus.mapping ?? "pathname")}"
    data-strict="1"
    data-reactions-enabled="${giscus.reactions === false ? 0 : 1}"
    data-emit-metadata="0"
    data-input-position="${esc(giscus.inputPosition ?? "top")}"
    data-theme="${esc(giscus.theme ?? "preferred_color_scheme")}"
    data-lang="${esc(giscus.lang ?? "zh-CN")}"
    data-loading="lazy"
    crossorigin="anonymous"
    async></script>
</section>`;
}

export function emptyState(cfg, text) {
  return `<p class="empty">${esc(text)}</p>`;
}

export function weekBadge(cfg, week) {
  return `<a class="week-badge" href="${weekUrl(cfg, week)}"><strong>${esc(week)}</strong><span>${esc(weekLabel(week))}</span></a>`;
}
