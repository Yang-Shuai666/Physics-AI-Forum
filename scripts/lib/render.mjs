import { withBase, absoluteUrl } from "./config.mjs";

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- 路径 ---------- */
export const reportUrl = (cfg, report) => withBase(cfg, `reports/${report.slug}/`);
export const weekUrl = (cfg, week) => withBase(cfg, `week/${week}/`);
export const directionUrl = (cfg, key) => withBase(cfg, `direction/${key}/`);
export const authorUrl = (cfg, report) => withBase(cfg, `author/${pathId(authorKey(report))}/`);
export const tagUrl = (cfg, tag) => withBase(cfg, `tag/${pathId(tag)}/`);
export const sourceUrl = (cfg, report) =>
  `https://github.com/${cfg.repo}/blob/${cfg.branch}/reports/${encodeURIComponent(report.file)}`;

export const authorKey = (report) => (report.github ? report.github.toLowerCase() : report.author);
/** 落盘用的目录名（保留中文，只去掉路径分隔符） */
export const fsId = (value) => String(value).trim().replace(/[/\\?#%]+/g, "-");
/** 链接用的 URL 段（把中文等编码掉） */
export const pathId = (value) => encodeURIComponent(fsId(value));

export function avatarUrl(report) {
  return report.github ? `https://github.com/${encodeURIComponent(report.github)}.png?size=96` : "";
}

/* ---------- 小组件 ---------- */
export function avatar(cfg, report, size = 24) {
  const src = avatarUrl(report);
  if (src) {
    return `<img class="avatar" src="${esc(src)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  }
  return `<span class="avatar avatar-fallback" aria-hidden="true" style="--size:${size}px">${esc([...report.author][0] ?? "?")}</span>`;
}

export function dirChip(cfg, key, { link = true } = {}) {
  const direction = cfg.directionByKey.get(key);
  const name = direction?.name ?? key;
  const color = direction?.color ?? "var(--accent)";
  const inner = `<i class="dot"></i>${esc(name)}`;
  return link
    ? `<a class="chip" href="${directionUrl(cfg, key)}" style="--chip:${esc(color)}">${inner}</a>`
    : `<span class="chip" style="--chip:${esc(color)}">${inner}</span>`;
}

export function readingTime(report) {
  return `${Math.max(1, Math.round((report.charCount ?? 0) / 400))} 分钟`;
}

/* ---------- 页头 ---------- */
function header(cfg, active) {
  const nav = [
    { href: "", key: "home", label: "首页" },
    { href: "archive/", key: "archive", label: "归档" },
    { href: "week/", key: "week", label: "按周" },
    { href: "search/", key: "search", label: "搜索" },
  ]
    .map((item) => `<a href="${withBase(cfg, item.href)}"${active === item.key ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`)
    .join("");

  return `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${withBase(cfg, "")}" aria-label="${esc(cfg.title)} 首页">
      <span class="brand-mark">π</span>
      <span class="brand-text"><strong>${esc(cfg.title)}</strong><small>${esc(cfg.tagline ?? "")}</small></span>
    </a>
    <nav class="site-nav" aria-label="站点导航">${nav}</nav>
    <div class="header-tools">
      <form class="nav-search" action="${withBase(cfg, "search/")}" method="get" role="search">
        <svg viewBox="0 0 16 16" aria-hidden="true" width="14" height="14"><path fill="currentColor" d="M11.5 10.2a5.5 5.5 0 1 0-1.3 1.3l3 3 1.3-1.3-3-3ZM2.5 6.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"/></svg>
        <input type="search" name="q" placeholder="搜索周报…" aria-label="搜索周报">
      </form>
      <a class="header-github" href="https://github.com/${esc(cfg.repo)}" target="_blank" rel="noopener noreferrer" aria-label="在 GitHub 上查看仓库">
        <svg viewBox="0 0 16 16" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
      </a>
    </div>
  </div>
</header>`;
}

function footer(cfg) {
  return `<footer class="site-footer">
  <div class="wrap footer-inner">
    <div class="footer-brand">
      <p><strong>${esc(cfg.title)}</strong><span>${esc(cfg.tagline ?? "")}</span></p>
      <p class="muted">内容以 Markdown 存放在
        <a href="https://github.com/${esc(cfg.repo)}/tree/${esc(cfg.branch)}/reports" target="_blank" rel="noopener noreferrer">reports/</a>，
        讨论沉淀在 <a href="https://github.com/${esc(cfg.repo)}/discussions" target="_blank" rel="noopener noreferrer">Discussions</a>。
      </p>
    </div>
    <div class="footer-links">
      <a href="${withBase(cfg, "feed.xml")}">RSS</a>
      <a href="${withBase(cfg, "sitemap.xml")}">Sitemap</a>
      <a href="${withBase(cfg, "archive/")}">归档</a>
    </div>
  </div>
  <p class="footer-meta wrap">GitHub Pages 静态构建 · 零服务器成本</p>
</footer>`;
}

export function layout(cfg, { title, description, pathname = "", active = "", bodyClass = "", body, headExtra = "", scripts = "" }) {
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
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.title)}" href="${withBase(cfg, "feed.xml")}">
<link rel="icon" href="${withBase(cfg, "favicon.svg")}" type="image/svg+xml">
<link rel="stylesheet" href="${withBase(cfg, "styles.css")}">
${headExtra}</head>
<body class="${esc(bodyClass)}">
<a class="skip-link" href="#main">跳到主要内容</a>
<div class="progress" id="scroll-progress" aria-hidden="true"></div>
${header(cfg, active)}
${body}
${footer(cfg)}
<script type="module" src="${withBase(cfg, "app.js")}"></script>
${scripts}</body>
</html>`;
}

/* ---------- 卡片 ---------- */
export function reportCard(cfg, report) {
  const key = report.directions[0] ?? "";
  const color = cfg.directionByKey.get(key)?.color ?? "var(--accent)";
  const haystack = [report.title, report.author, report.summary, report.week, report.tags.join(" "), report.directions.join(" "), report.date].join(" ").toLowerCase();
  return `<article class="card" style="--dir:${esc(color)}" data-search="${esc(haystack)}" data-direction="${esc(report.directions.join(" "))}">
  <div class="card-head">
    ${key ? dirChip(cfg, key) : ""}
    <time class="card-date" datetime="${esc(report.date)}">${esc((report.date ?? "").slice(5).replace("-", "/"))}</time>
  </div>
  <a class="card-title" href="${reportUrl(cfg, report)}">${esc(report.title)}</a>
  <p class="card-summary">${esc(report.summary || report.goal)}</p>
  <div class="card-foot">
    <a class="card-author" href="${authorUrl(cfg, report)}">${avatar(cfg, report, 22)}<span>${esc(report.author)}</span></a>
    <span class="card-week">${esc(report.week)}</span>
  </div>
</article>`;
}

export function listRow(cfg, report) {
  const key = report.directions[0] ?? "";
  const color = cfg.directionByKey.get(key)?.color ?? "var(--accent)";
  return `<a class="row" href="${reportUrl(cfg, report)}" style="--dir:${esc(color)}" data-search="${esc([report.title, report.author, report.week, report.tags.join(" "), report.directions.join(" ")].join(" ").toLowerCase())}" data-direction="${esc(report.directions.join(" "))}">
  <span class="row-week">${esc(report.week)}</span>
  <span class="row-title">${esc(report.title)}</span>
  <span class="row-author">${esc(report.author)}</span>
  <span class="row-date">${esc(report.date)}</span>
</a>`;
}

/* ---------- 详情页 ---------- */
export function toc(headings) {
  if (!headings || headings.length === 0) return "";
  const items = headings.map((h) => `<li class="toc-${h.level}"><a href="#${esc(h.id)}" data-toc="${esc(h.id)}">${esc(h.text)}</a></li>`).join("");
  return `<nav class="side-card toc" aria-label="本页目录">
    <p class="side-title">本页目录</p>
    <ol class="toc-list">${items}</ol>
  </nav>`;
}

export function giscusBlock(cfg) {
  const giscus = cfg.giscus ?? {};
  const configured = giscus.enabled && giscus.repoId && giscus.categoryId && !String(giscus.repoId).startsWith("REPLACE_");

  if (!configured) {
    return `<section class="comments">
  <h2 class="comments-title">讨论</h2>
  <div class="comments-empty">
    <p>评论组件还没配置（<code>site.config.json → giscus</code>）。先在 <a href="https://giscus.app" target="_blank" rel="noopener noreferrer">giscus.app</a> 生成配置并安装 giscus App。</p>
    <p><a class="button ghost" href="https://github.com/${esc(cfg.repo)}/discussions" target="_blank" rel="noopener noreferrer">先到 Discussions 讨论</a></p>
  </div>
</section>`;
  }

  return `<section class="comments" id="comments">
  <h2 class="comments-title">讨论 <span class="muted">用 GitHub 账号评论，会同步成一条 Discussion</span></h2>
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

/* ---------- 通用 ---------- */
export function sectionHead(title, href, linkText = "查看全部") {
  return `<div class="section-head"><h2>${esc(title)}</h2>${href ? `<a class="section-link" href="${href}">${esc(linkText)} <span aria-hidden="true">→</span></a>` : ""}</div>`;
}

export function crumb(parts) {
  return `<nav class="crumbs" aria-label="面包屑">${parts
    .map((part, index) =>
      index === parts.length - 1 ? `<span aria-current="page">${esc(part.label)}</span>` : `<a href="${part.href}">${esc(part.label)}</a>`
    )
    .join('<span class="crumb-sep">/</span>')}</nav>`;
}

export function pageHead({ eyebrow, title, meta, children }) {
  return `<header class="page-head">
  ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
  <h1>${esc(title)}</h1>
  ${meta ? `<p class="page-meta">${meta}</p>` : ""}
  ${children ?? ""}
</header>`;
}
