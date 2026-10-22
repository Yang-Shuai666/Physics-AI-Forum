import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig, withBase, absoluteUrl } from "./lib/config.mjs";
import { weekLabel } from "./lib/weeks.mjs";
import { loadReports } from "./lib/content.mjs";
import {
  esc,
  layout,
  reportCard,
  chips,
  toc,
  giscusBlock,
  reportUrl,
  weekUrl,
  directionUrl,
  sourceUrl,
} from "./lib/render.mjs";

const cfg = loadConfig(process.cwd());
const distDir = path.join(cfg.root, "dist");
const webDir = path.join(cfg.root, "web");
const reportsDir = path.join(cfg.root, "reports");

async function write(relPath, content) {
  const full = path.join(distDir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await fs.copyFile(from, to);
  }
}

async function main() {
  const { reports, diagnostics } = await loadReports(cfg);

  for (const item of diagnostics) {
    console.log(`${item.level === "error" ? "✖" : "⚠"} ${item.file}: ${item.message}`);
  }

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
  await copyDir(webDir, distDir);

  const assetsDir = path.join(reportsDir, "assets");
  try {
    await fs.access(assetsDir);
    await copyDir(assetsDir, path.join(distDir, "reports", "assets"));
  } catch {
    /* 没有附件目录就跳过 */
  }

  const weeks = new Map();
  const byDirection = new Map(cfg.directions.map((d) => [d.key, []]));
  for (const report of reports) {
    if (report.week) {
      if (!weeks.has(report.week)) weeks.set(report.week, []);
      weeks.get(report.week).push(report);
    }
    for (const key of report.directions) byDirection.get(key)?.push(report);
  }
  const weekKeys = [...weeks.keys()].sort().reverse();
  const latest = reports.slice(0, cfg.homeLatest ?? 6);
  const currentWeek = weekKeys[0] ?? "";
  const total = reports.length;

  // ---------- 首页 ----------
  const homeBody = `<main id="main" class="wrap">
  <section class="hero">
    <p class="eyebrow">每周一份学习成果</p>
    <h1>${esc(cfg.tagline ?? "团队周报")}</h1>
    <p class="lead">${esc(cfg.description ?? "")}</p>
    <div class="hero-actions">
      <a class="button" href="${withBase(cfg, "archive/")}">全部周报（${total}）</a>
      <a class="button ghost" href="${newReportUrl()}" target="_blank" rel="noopener noreferrer">＋ 提交本周周报</a>
    </div>
    <div class="stats">
      <div><strong>${total}</strong><span>周报</span></div>
      <div><strong>${weekKeys.length}</strong><span>周次</span></div>
      <div><strong>${cfg.directions.length}</strong><span>学习方向</span></div>
    </div>
  </section>

  <section>
    <div class="section-head">
      <h2>最新周报</h2>
      <a href="${withBase(cfg, "archive/")}">查看全部 →</a>
    </div>
    <div class="cards">${latest.map((r) => reportCard(cfg, r)).join("") || '<p class="empty">还没有周报，从 reports/_template.md 复制一份开始。</p>'}</div>
  </section>

  <section>
    <div class="section-head"><h2>学习方向</h2></div>
    <div class="directions">${cfg.directions
      .map((d) => {
        const list = byDirection.get(d.key) ?? [];
        return `<a class="direction" href="${directionUrl(cfg, d.key)}"><strong>${esc(d.name)}</strong><span>${esc(d.desc)}</span><em>${list.length} 份</em></a>`;
      })
      .join("")}</div>
  </section>

  <section>
    <div class="section-head"><h2>按周浏览</h2></div>
    <div class="weeks">${weekKeys
      .slice(0, 10)
      .map(
        (week) =>
          `<a class="week-row" href="${weekUrl(cfg, week)}"><span class="week-name">${esc(week)}</span><span class="week-range">${esc(weekLabel(week))}</span><span class="week-count">${weeks.get(week).length} 份</span></a>`
      )
      .join("")}</div>
  </section>

  <section class="howto">
    <h2>怎么参与</h2>
    <ol>
      <li><strong>写</strong>：点“提交本周周报”，在 GitHub 网页填好标题和内容直接提交，不需要本地环境。</li>
      <li><strong>看</strong>：提交后几分钟，这里会自动出现你的周报（GitHub Actions 自动构建）。</li>
      <li><strong>聊</strong>：打开任意周报，用 GitHub 账号在页面底部直接评论，讨论会同步到 Discussions。</li>
    </ol>
  </section>
</main>`;

  await write("index.html", layout(cfg, { title: "", description: cfg.description, pathname: "", body: homeBody }));

  // ---------- 详情页 ----------
  for (const [index, report] of reports.entries()) {
    const newer = reports[index - 1];
    const older = reports[index + 1];
    const bodyHtml = report.html.replace(/(src|href)="assets\//g, `$1="${withBase(cfg, "reports/assets/")}`);

    const body = `<main id="main" class="wrap">
  <article class="report">
    <header class="report-head">
      <p class="crumbs"><a href="${withBase(cfg, "archive/")}">归档</a> / <a href="${weekUrl(cfg, report.week)}">${esc(report.week)}</a></p>
      <h1>${esc(report.title)}</h1>
      <p class="report-meta"><span>${esc(report.author)}</span><span>${esc(report.date)}</span><span>${esc(weekLabel(report.week))}</span>${
        report.status === "draft" ? '<span class="badge">草稿</span>' : ""
      }</p>
      <div class="chips">${chips(cfg, report)}</div>
      ${report.goal ? `<p class="goal"><strong>本周目标</strong>${esc(report.goal)}</p>` : ""}
    </header>
    <div class="report-body">
      ${toc(cfg, report.headings)}
      <div class="prose">${bodyHtml}</div>
    </div>
    <nav class="report-nav">
      ${older ? `<a href="${reportUrl(cfg, older)}">← ${esc(older.title)}</a>` : "<span></span>"}
      ${newer ? `<a href="${reportUrl(cfg, newer)}">${esc(newer.title)} →</a>` : "<span></span>"}
    </nav>
    <p class="source">原文：<a href="${sourceUrl(cfg, report)}" target="_blank" rel="noopener noreferrer">reports/${esc(report.file)}</a>（欢迎在 GitHub 上直接修改）</p>
    ${giscusBlock(cfg, report)}
  </article>
</main>`;

    await write(
      `reports/${report.slug}/index.html`,
      layout(cfg, {
        title: report.title,
        description: report.summary || report.goal,
        pathname: `reports/${report.slug}/`,
        bodyClass: "page-report",
        body,
      })
    );
  }

  // ---------- 周页 ----------
  await write(
    "week/index.html",
    layout(cfg, {
      title: "按周浏览",
      pathname: "week/",
      body: `<main id="main" class="wrap"><h1>按周浏览</h1><div class="weeks">${weekKeys
        .map(
          (week) =>
            `<a class="week-row" href="${weekUrl(cfg, week)}"><span class="week-name">${esc(week)}</span><span class="week-range">${esc(weekLabel(week))}</span><span class="week-count">${weeks.get(week).length} 份</span></a>`
        )
        .join("")}</div></main>`,
    })
  );

  for (const week of weekKeys) {
    const list = weeks.get(week);
    const body = `<main id="main" class="wrap">
  <p class="crumbs"><a href="${withBase(cfg, "archive/")}">归档</a> / ${esc(week)}</p>
  <h1>${esc(week)} <small>${esc(weekLabel(week))}</small></h1>
  <p class="muted">本周共 ${list.length} 份周报</p>
  <div class="cards">${list.map((r) => reportCard(cfg, r)).join("")}</div>
</main>`;
    await write(`week/${week}/index.html`, layout(cfg, { title: week, pathname: `week/${week}/`, description: `${week} 的团队周报`, body }));
  }

  // ---------- 方向页 ----------
  for (const direction of cfg.directions) {
    const list = byDirection.get(direction.key) ?? [];
    const body = `<main id="main" class="wrap">
  <p class="crumbs"><a href="${withBase(cfg, "")}">首页</a> / ${esc(direction.name)}</p>
  <h1>${esc(direction.name)}</h1>
  <p class="muted">${esc(direction.desc)} · 共 ${list.length} 份周报</p>
  <div class="cards">${list.map((r) => reportCard(cfg, r)).join("") || '<p class="empty">这个方向还没有周报。</p>'}</div>
</main>`;
    await write(
      `direction/${direction.key}/index.html`,
      layout(cfg, { title: direction.name, pathname: `direction/${direction.key}/`, description: direction.desc, body })
    );
  }

  // ---------- 归档 ----------
  const byYear = new Map();
  for (const week of weekKeys) {
    const year = week.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(week);
  }
  const archiveBody = `<main id="main" class="wrap">
  <h1>归档</h1>
  <p class="muted">共 ${total} 份周报 · ${weekKeys.length} 个周次</p>
  <div class="filter-bar">
    <input id="filter-input" type="search" placeholder="筛选标题 / 作者 / 方向…" aria-label="筛选周报">
    <span id="filter-count" class="muted"></span>
  </div>
  ${[...byYear.entries()]
    .map(
      ([year, list]) => `<section class="year-block">
    <h2>${esc(year)} <small class="muted">${list.reduce((sum, week) => sum + weeks.get(week).length, 0)} 份</small></h2>
    ${list
      .map(
        (week) => `<div class="archive-week">
      <div class="archive-week-head"><a href="${weekUrl(cfg, week)}">${esc(week)}</a><span class="muted">${esc(weekLabel(week))}</span></div>
      <ul class="archive-list">${weeks
        .get(week)
        .map(
          (r) =>
            `<li data-search="${esc([r.title, r.author, r.week, r.tags.join(" "), r.directions.join(" ")].join(" ").toLowerCase())}"><a href="${reportUrl(cfg, r)}">${esc(r.title)}</a><span class="muted">${esc(r.author)}</span></li>`
        )
        .join("")}</ul>
    </div>`
      )
      .join("")}
  </section>`
    )
    .join("")}
</main>`;

  await write("archive/index.html", layout(cfg, { title: "归档", pathname: "archive/", description: "全部周报归档", body: archiveBody }));

  // ---------- 搜索页 ----------
  const searchBody = `<main id="main" class="wrap">
  <h1>搜索</h1>
  <p class="muted">全站全文检索，索引在构建时生成，不需要任何服务器。</p>
  <div id="search"></div>
  <noscript><p>需要启用 JavaScript 才能搜索，也可以直接浏览<a href="${withBase(cfg, "archive/")}">归档</a>。</p></noscript>
</main>`;

  await write(
    "search/index.html",
    layout(cfg, {
      title: "搜索",
      pathname: "search/",
      body: searchBody,
      headExtra: `<link rel="stylesheet" href="${withBase(cfg, "pagefind/pagefind-ui.css")}">\n`,
      scripts: `<script src="${withBase(cfg, "pagefind/pagefind-ui.js")}"></script>
<script>
window.addEventListener("DOMContentLoaded", function () {
  if (!window.PagefindUI) return;
  new window.PagefindUI({
    element: "#search",
    showSubResults: true,
    resetStyles: false,
    bundlePath: ${JSON.stringify(withBase(cfg, "pagefind/"))},
    translations: {
      placeholder: "搜索标题、作者、正文…",
      zero_results: "没有找到 “{query}”，换个词试试",
      many_results: "找到 {count} 条结果",
      one_result: "找到 1 条结果",
      searching: "搜索中…"
    }
  });
});
</script>
`,
    })
  );

  // ---------- 404 ----------
  await write(
    "404.html",
    layout(cfg, {
      title: "页面不存在",
      pathname: "404.html",
      body: `<main id="main" class="wrap"><h1>404</h1><p>这个页面不存在，可能周报被改名或移动了。</p><p><a class="button" href="${withBase(cfg, "")}">回到首页</a></p></main>`,
    })
  );

  // ---------- 数据接口 ----------
  await write(
    "reports/index.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        count: reports.length,
        reports: reports.map((r) => ({
          slug: r.slug,
          title: r.title,
          author: r.author,
          github: r.github,
          date: r.date,
          week: r.week,
          directions: r.directions,
          tags: r.tags,
          goal: r.goal,
          summary: r.summary,
          status: r.status,
          url: reportUrl(cfg, r),
          sourceUrl: sourceUrl(cfg, r),
        })),
      },
      null,
      2
    )
  );

  // ---------- sitemap / robots / nojekyll ----------
  const paths = [
    "",
    "archive/",
    "search/",
    ...weekKeys.map((w) => `week/${w}/`),
    ...cfg.directions.map((d) => `direction/${d.key}/`),
    ...reports.map((r) => `reports/${r.slug}/`),
  ];
  const lastmod = reports[0]?.date ?? new Date().toISOString().slice(0, 10);
  await write(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${esc(absoluteUrl(cfg, p))}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}
</urlset>
`
  );
  await write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl(cfg, "sitemap.xml")}\n`);
  await write(".nojekyll", "");

  const errors = diagnostics.filter((d) => d.level === "error").length;
  console.log(`\n✔ 构建完成：${reports.length} 份周报 → ${path.relative(cfg.root, distDir)}`);
  if (errors) console.log(`  其中 ${errors} 个内容错误（不影响发布，但请尽快修）`);
  if (currentWeek) console.log(`  最新周次：${currentWeek}（${weekLabel(currentWeek)}）`);
}

function weekOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function newReportUrl() {
  const today = new Date().toISOString().slice(0, 10);
  const week = weekOf(today);
  const template = `---
title: ${week} 我的学习周报
author: 你的名字
github: 你的 GitHub 用户名
date: ${today}
week: ${week}
directions:
  - agent
goal: 一句话说明本周目标
summary: 两三句话说明本周做了什么、结论是什么
tags: []
---

## 本周目标

## 做了什么

## 结论与数据

## 卡住的地方

## 下周计划
`;
  return `https://github.com/${cfg.repo}/new/${cfg.branch}/reports?filename=${encodeURIComponent(`${week}-topic.md`)}&value=${encodeURIComponent(template)}`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
