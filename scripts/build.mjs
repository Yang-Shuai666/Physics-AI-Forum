import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig, withBase, absoluteUrl } from "./lib/config.mjs";
import { weekLabel, isoWeek } from "./lib/weeks.mjs";
import { loadReports } from "./lib/content.mjs";
import {
  esc,
  layout,
  reportCard,
  listRow,
  toc,
  giscusBlock,
  sectionHead,
  crumb,
  dirChip,
  avatar,
  authorUrl,
  tagUrl,
  authorKey,
  fsId,
  pathId,
  readingTime,
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

const stripTags = (html) =>
  html
    .replace(/<pre[\s\S]*?<\/pre>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function main() {
  const { reports, diagnostics } = await loadReports(cfg);
  for (const report of reports) report.charCount = stripTags(report.html).length;

  for (const item of diagnostics) console.log(`${item.level === "error" ? "✖" : "⚠"} ${item.file}: ${item.message}`);

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
  await copyDir(webDir, distDir);

  try {
    await fs.access(path.join(reportsDir, "assets"));
    await copyDir(path.join(reportsDir, "assets"), path.join(distDir, "reports", "assets"));
  } catch {
    /* 没有附件目录 */
  }

  /* ---------- 聚合 ---------- */
  const weeks = new Map();
  const byDirection = new Map(cfg.directions.map((d) => [d.key, []]));
  const byAuthor = new Map();
  const byTag = new Map();

  for (const report of reports) {
    if (report.week) {
      if (!weeks.has(report.week)) weeks.set(report.week, []);
      weeks.get(report.week).push(report);
    }
    for (const key of report.directions) byDirection.get(key)?.push(report);

    const aKey = authorKey(report);
    if (!byAuthor.has(aKey)) byAuthor.set(aKey, { key: aKey, name: report.author, github: report.github, reports: [] });
    byAuthor.get(aKey).reports.push(report);

    for (const tag of report.tags) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(report);
    }
  }

  const weekKeys = [...weeks.keys()].sort().reverse();
  const latestWeek = weekKeys[0] ?? isoWeek(today());
  const latest = reports.slice(0, cfg.homeLatest ?? 6);
  const total = reports.length;
  const lastDate = reports[0]?.date ?? today();

  /* ---------- 首页 ---------- */
  const weekReports = weeks.get(latestWeek) ?? [];
  const memberRows = membershipRows(weekReports);

  const homeBody = `<main id="main">
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow"><span class="pulse" aria-hidden="true"></span>${esc(latestWeek)} · ${esc(weekLabel(latestWeek))}</p>
        <h1>${esc(cfg.headline ?? cfg.tagline ?? "")}</h1>
        <p class="lead">${esc(cfg.description ?? "")}</p>
        <div class="hero-actions">
          <a class="button" href="${withBase(cfg, "archive/")}">浏览全部 ${total} 份周报</a>
          <a class="button ghost" href="${newReportUrl()}" target="_blank" rel="noopener noreferrer">＋ 提交本周周报</a>
        </div>
      </div>
      <aside class="week-card" aria-label="本周速览">
        <div class="week-card-head">
          <p>本周速览</p>
          <span class="pill">${esc(latestWeek)}</span>
        </div>
        <ul class="member-list">${memberRows}</ul>
        <div class="week-card-foot">
          <span>本周 ${weekReports.length} 份</span>
          <span>共 ${total} 份 · ${weekKeys.length} 周</span>
        </div>
        <a class="button block" href="${newReportUrl()}" target="_blank" rel="noopener noreferrer">＋ 写本周周报</a>
      </aside>
    </div>
  </section>

  <div class="wrap">
    <section class="section">
      ${sectionHead("最新周报", withBase(cfg, "archive/"))}
      ${latest.length ? `<div class="cards">${latest.map((r) => reportCard(cfg, r)).join("")}</div>` : `<p class="empty">还没有周报。点上面的「提交本周周报」写第一篇。</p>`}
    </section>

    <section class="section">
      ${sectionHead("学习方向", withBase(cfg, "archive/"), "全部")}
      <div class="directions">${cfg.directions
        .map((direction) => {
          const list = byDirection.get(direction.key) ?? [];
          return `<a class="direction" href="${directionUrl(cfg, direction.key)}" style="--dir:${esc(direction.color ?? "var(--accent)")}">
        <span class="direction-top"><i class="dot"></i>${esc(direction.name)}</span>
        <span class="direction-desc">${esc(direction.desc)}</span>
        <span class="direction-count">${list.length} 份周报</span>
      </a>`;
        })
        .join("")}</div>
    </section>

    <section class="section">
      ${sectionHead("按周浏览", withBase(cfg, "week/"), "全部周次")}
      <div class="rows">${weekKeys
        .slice(0, 8)
        .map((week) => {
          const authors = new Set(weeks.get(week).map((r) => r.author));
          return `<a class="row row-week" href="${weekUrl(cfg, week)}">
        <span class="row-week">${esc(week)}</span>
        <span class="row-title">${esc(weekLabel(week))}${week === latestWeek ? ' <em class="tag-now">本周</em>' : ""}</span>
        <span class="row-author">${weeks.get(week).length} 份</span>
        <span class="row-date">${authors.size} 位作者</span>
      </a>`;
        })
        .join("")}</div>
    </section>

    <section class="section howto">
      <h2>怎么参与</h2>
      <ol class="steps">
        <li><span class="step-no">01</span><div><strong>写</strong><p>点「写本周周报」，在 GitHub 网页里填标题、方向、摘要和正文，直接提交，不用装任何东西。</p></div></li>
        <li><span class="step-no">02</span><div><strong>看</strong><p>几分钟后 Actions 构建完成，你的周报会出现在首页和对应的方向页。</p></div></li>
        <li><span class="step-no">03</span><div><strong>聊</strong><p>打开别人的周报，在底部用 GitHub 账号回复；讨论会同时存进 Discussions。</p></div></li>
      </ol>
    </section>
  </div>
</main>`;

  await write("index.html", layout(cfg, { title: "", description: cfg.description, pathname: "", active: "home", body: homeBody }));

  /* ---------- 详情页 ---------- */
  for (const [index, report] of reports.entries()) {
    const newer = reports[index - 1];
    const older = reports[index + 1];
    const bodyHtml = report.html.replace(/(src|href)="(?:\.\/)?assets\//g, `$1="${withBase(cfg, "reports/assets/")}`);

    const body = `<main id="main" class="wrap">
  ${crumb([{ href: withBase(cfg, "archive/"), label: "归档" }, { href: weekUrl(cfg, report.week), label: report.week }, { label: report.title }])}
  <div class="report-layout">
    <aside class="report-side">
      ${toc(report.headings)}
      <div class="side-card">
        <p class="side-title">关于这篇</p>
        <dl class="meta-list">
          <div><dt>作者</dt><dd><a href="${authorUrl(cfg, report)}">${esc(report.author)}</a></dd></div>
          <div><dt>周次</dt><dd><a href="${weekUrl(cfg, report.week)}">${esc(report.week)}</a></dd></div>
          <div><dt>日期</dt><dd>${esc(report.date)}</dd></div>
          <div><dt>阅读</dt><dd>约 ${esc(readingTime(report))}</dd></div>
        </dl>
        <div class="side-actions">
          <button class="button ghost small" type="button" data-copy-link>复制链接</button>
          <a class="button ghost small" href="${sourceUrl(cfg, report)}" target="_blank" rel="noopener noreferrer">GitHub 原文</a>
        </div>
      </div>
    </aside>

    <article class="report">
      <header class="report-head">
        <div class="chips">${report.directions.map((key) => dirChip(cfg, key)).join("")}${report.tags.map((tag) => `<a class="tag" href="${tagUrl(cfg, tag)}">${esc(tag)}</a>`).join("")}</div>
        <h1>${esc(report.title)}</h1>
        <div class="report-meta">
          <a class="byline" href="${authorUrl(cfg, report)}">${avatar(cfg, report, 28)}<span>${esc(report.author)}</span></a>
          <span class="dot-sep" aria-hidden="true">·</span>
          <time datetime="${esc(report.date)}">${esc(report.date)}</time>
          <span class="dot-sep" aria-hidden="true">·</span>
          <a href="${weekUrl(cfg, report.week)}">${esc(weekLabel(report.week))}</a>
          ${report.status === "draft" ? '<span class="pill pill-warn">草稿</span>' : ""}
        </div>
        ${report.goal ? `<p class="goal"><span>本周目标</span>${esc(report.goal)}</p>` : ""}
      </header>

      <div class="prose">${bodyHtml}</div>

      <nav class="pager" aria-label="上一篇 / 下一篇">
        ${[
          older ? `<a class="pager-item" href="${reportUrl(cfg, older)}"><span>← 更早</span><strong>${esc(older.title)}</strong></a>` : "",
          newer ? `<a class="pager-item is-next" href="${reportUrl(cfg, newer)}"><span>更新 →</span><strong>${esc(newer.title)}</strong></a>` : "",
        ]
          .filter(Boolean)
          .join("")}
      </nav>

      ${giscusBlock(cfg)}
    </article>
  </div>
</main>`;

    await write(
      `reports/${report.slug}/index.html`,
      layout(cfg, {
        title: report.title,
        description: report.summary || report.goal,
        pathname: `reports/${report.slug}/`,
        active: "report",
        bodyClass: "page-report",
        body,
      })
    );
  }

  /* ---------- 周次 ---------- */
  await write(
    "week/index.html",
    layout(cfg, {
      title: "按周浏览",
      description: "按 ISO 周次浏览全部周报",
      pathname: "week/",
      active: "week",
      body: `<main id="main" class="wrap">
        ${pageHeadSimple("全部周次", `${weekKeys.length} 个周次 · ${total} 份周报`)}
        <div class="rows">${weekKeys
          .map(
            (week) => `<a class="row row-week" href="${weekUrl(cfg, week)}">
          <span class="row-week">${esc(week)}</span>
          <span class="row-title">${esc(weekLabel(week))}${week === latestWeek ? ' <em class="tag-now">本周</em>' : ""}</span>
          <span class="row-author">${weeks.get(week).length} 份</span>
          <span class="row-date">${new Set(weeks.get(week).map((r) => r.author)).size} 位作者</span>
        </a>`
          )
          .join("")}</div>
      </main>`,
    })
  );

  for (const [i, week] of weekKeys.entries()) {
    const list = weeks.get(week);
    const olderWeek = weekKeys[i + 1];
    const newerWeek = weekKeys[i - 1];
    const body = `<main id="main" class="wrap">
  ${crumb([{ href: withBase(cfg, "week/"), label: "按周" }, { label: week }])}
  ${pageHeadSimple(`${week}`, `${weekLabel(week)} · 本周 ${list.length} 份周报`, week === latestWeek)}
  <div class="cards">${list.map((r) => reportCard(cfg, r)).join("")}</div>
  <nav class="week-nav">
    ${olderWeek ? `<a class="button ghost" href="${weekUrl(cfg, olderWeek)}">← ${esc(olderWeek)}</a>` : "<span></span>"}
    ${newerWeek ? `<a class="button ghost" href="${weekUrl(cfg, newerWeek)}">${esc(newerWeek)} →</a>` : "<span></span>"}
  </nav>
</main>`;
    await write(`week/${week}/index.html`, layout(cfg, { title: week, description: `${week}（${weekLabel(week)}）的团队周报`, pathname: `week/${week}/`, active: "week", body }));
  }

  /* ---------- 方向 ---------- */
  for (const direction of cfg.directions) {
    const list = byDirection.get(direction.key) ?? [];
    const body = `<main id="main" class="wrap">
  ${crumb([{ href: withBase(cfg, ""), label: "首页" }, { label: direction.name }])}
  ${pageHeadSimple(direction.name, `${esc(direction.desc)} · 共 ${list.length} 份`)}
  ${list.length ? `<div class="cards">${list.map((r) => reportCard(cfg, r)).join("")}</div>` : '<p class="empty">这个方向还没有周报，来写第一篇。</p>'}
</main>`;
    await write(
      `direction/${direction.key}/index.html`,
      layout(cfg, { title: direction.name, description: direction.desc, pathname: `direction/${direction.key}/`, active: "direction", body })
    );
  }

  /* ---------- 作者 ---------- */
  for (const author of byAuthor.values()) {
    const list = author.reports;
    const body = `<main id="main" class="wrap">
  ${crumb([{ href: withBase(cfg, "archive/"), label: "归档" }, { label: author.name }])}
  <header class="author-head">
    ${avatar(cfg, { author: author.name, github: author.github }, 56)}
    <div>
      <h1>${esc(author.name)}</h1>
      <p class="page-meta">${list.length} 份周报${
        author.github
          ? ` · <a href="https://github.com/${esc(author.github)}" target="_blank" rel="noopener noreferrer">@${esc(author.github)}</a>`
          : ""
      }</p>
    </div>
  </header>
  <div class="rows">${list.map((r) => listRow(cfg, r)).join("")}</div>
</main>`;
    await write(
      `author/${fsId(author.key)}/index.html`,
      layout(cfg, { title: author.name, description: `${author.name} 的周报`, pathname: `author/${author.key}/`, active: "author", body })
    );
  }

  /* ---------- 标签 ---------- */
  for (const [tag, list] of byTag.entries()) {
    const body = `<main id="main" class="wrap">
  ${crumb([{ href: withBase(cfg, "archive/"), label: "归档" }, { label: `#${tag}` }])}
  ${pageHeadSimple(`#${tag}`, `共 ${list.length} 份周报`)}
  <div class="rows">${list.map((r) => listRow(cfg, r)).join("")}</div>
</main>`;
    await write(`tag/${fsId(tag)}/index.html`, layout(cfg, { title: `#${tag}`, description: `标签 ${tag} 的周报`, pathname: `tag/${tag}/`, active: "tag", body }));
  }

  /* ---------- 归档 ---------- */
  const byYear = new Map();
  for (const week of weekKeys) {
    const year = week.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(week);
  }

  const archiveBody = `<main id="main" class="wrap">
  ${pageHeadSimple("归档", `共 ${total} 份周报 · ${weekKeys.length} 个周次 · 最近更新 ${lastDate}`)}
  <div class="filter-bar">
    <input id="filter-input" type="search" placeholder="筛选标题 / 作者 / 标签…" aria-label="筛选周报">
    <div class="filter-chips" role="group" aria-label="按方向筛选">
      <button class="chip chip-btn is-active" type="button" data-filter-dir="">全部</button>
      ${cfg.directions
        .map((d) => `<button class="chip chip-btn" type="button" data-filter-dir="${esc(d.key)}" style="--chip:${esc(d.color ?? "var(--accent)")}"><i class="dot"></i>${esc(d.name)}</button>`)
        .join("")}
    </div>
  </div>
  <p class="filter-count muted" id="filter-count" aria-live="polite"></p>
  ${[...byYear.entries()]
    .map(
      ([year, list]) => `<section class="year-block">
    <h2 class="year-title">${esc(year)} <span class="muted">${list.reduce((sum, week) => sum + weeks.get(week).length, 0)} 份</span></h2>
    ${list
      .map(
        (week) => `<div class="archive-week">
      <div class="archive-week-head"><a href="${weekUrl(cfg, week)}">${esc(week)}</a><span class="muted">${esc(weekLabel(week))}</span></div>
      <div class="rows">${weeks.get(week).map((r) => listRow(cfg, r)).join("")}</div>
    </div>`
      )
      .join("")}
  </section>`
    )
    .join("")}
</main>`;

  await write("archive/index.html", layout(cfg, { title: "归档", description: "全部周报归档", pathname: "archive/", active: "archive", body: archiveBody }));

  /* ---------- 搜索 ---------- */
  const searchBody = `<main id="main" class="wrap">
  ${pageHeadSimple("搜索", "全站全文检索，索引在构建时生成")}
  <div id="search"></div>
  <noscript><p class="empty">需要启用 JavaScript 才能搜索，也可以直接浏览 <a href="${withBase(cfg, "archive/")}">归档</a>。</p></noscript>
</main>`;

  await write(
    "search/index.html",
    layout(cfg, {
      title: "搜索",
      pathname: "search/",
      active: "search",
      body: searchBody,
      headExtra: `<link rel="stylesheet" href="${withBase(cfg, "pagefind/pagefind-ui.css")}">\n`,
      scripts: `<script src="${withBase(cfg, "pagefind/pagefind-ui.js")}"></script>
<script>
window.addEventListener("DOMContentLoaded", function () {
  if (!window.PagefindUI) return;
  var ui = new window.PagefindUI({
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
  var q = new URLSearchParams(location.search).get("q");
  if (q) {
    try { ui.triggerSearch(q); }
    catch (e) {
      var field = document.querySelector("#search input");
      if (field) { field.value = q; field.dispatchEvent(new Event("input", { bubbles: true })); }
    }
  }
});
</script>
`,
    })
  );

  /* ---------- 404 ---------- */
  await write(
    "404.html",
    layout(cfg, {
      title: "页面不存在",
      pathname: "404.html",
      body: `<main id="main" class="wrap">
  <section class="notfound">
    <p class="eyebrow">404</p>
    <h1>这个页面不见了</h1>
    <p class="muted">可能是周报改名或移动了。改名会同时改变讨论串地址，所以周报文件要一次定好名字。</p>
    <div class="hero-actions">
      <a class="button" href="${withBase(cfg, "")}">回到首页</a>
      <a class="button ghost" href="${withBase(cfg, "archive/")}">去归档找找</a>
    </div>
  </section>
</main>`,
    })
  );

  /* ---------- 数据 / 订阅 ---------- */
  await write(
    "reports/index.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        count: total,
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
          words: r.charCount,
          url: reportUrl(cfg, r),
          sourceUrl: sourceUrl(cfg, r),
        })),
      },
      null,
      2
    )
  );

  await write("feed.xml", feed(cfg, reports.slice(0, 20)));

  /* ---------- sitemap / robots ---------- */
  const paths = [
    "",
    "archive/",
    "search/",
    "week/",
    ...weekKeys.map((w) => `week/${w}/`),
    ...cfg.directions.map((d) => `direction/${d.key}/`),
    ...[...byAuthor.values()].map((a) => `author/${pathId(a.key)}/`),
    ...[...byTag.keys()].map((tag) => `tag/${pathId(tag)}/`),
    ...reports.map((r) => `reports/${r.slug}/`),
  ];
  await write(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${esc(absoluteUrl(cfg, p))}</loc><lastmod>${lastDate}</lastmod></url>`).join("\n")}
</urlset>
`
  );
  await write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl(cfg, "sitemap.xml")}\n`);
  await write(".nojekyll", "");

  const errors = diagnostics.filter((d) => d.level === "error").length;
  const pageCount = 1 + 1 + 1 + 1 + weekKeys.length + cfg.directions.length + byAuthor.size + byTag.size + reports.length + 1;
  console.log(`\n✔ 构建完成：${total} 份周报 · ${weekKeys.length} 个周次 · 约 ${pageCount} 个页面`);
  if (errors) console.log(`  其中 ${errors} 个内容错误（不影响发布）`);
  console.log(`  最新周次：${latestWeek}（${weekLabel(latestWeek)}）`);
}

/* ---------- 小工具 ---------- */
function pageHeadSimple(title, meta, isCurrent = false) {
  return `<header class="page-head">
  <h1>${esc(title)}${isCurrent ? ' <em class="tag-now">本周</em>' : ""}</h1>
  <p class="page-meta">${meta}</p>
</header>`;
}

function membershipRows(weekReports) {
  const members = Array.isArray(cfg.members) ? cfg.members.filter((m) => m?.name) : [];
  const submitted = new Set();
  for (const report of weekReports) {
    submitted.add(authorKey(report));
    submitted.add(report.author);
  }

  if (members.length === 0) {
    if (weekReports.length === 0) return `<li class="member-empty">本周还没有周报，你可以是第一篇。</li>`;
    return weekReports
      .map((report) => {
        const names = report.directions.map((key) => cfg.directionByKey.get(key)?.name ?? key);
        const short = names.length > 1 ? `${names[0]} 等` : names[0] ?? "";
        return `<li class="member is-done">
      <span class="member-mark" aria-hidden="true">✓</span>
      <span class="member-name">${esc(report.author)}</span>
      <span class="member-note">${esc(short)}</span>
    </li>`;
      })
      .join("");
  }

  return members
    .map((member) => {
      const hit = submitted.has(member.github?.toLowerCase() ?? "") || submitted.has(member.name);
      return `<li class="member ${hit ? "is-done" : "is-todo"}">
      <span class="member-mark" aria-hidden="true">${hit ? "✓" : "○"}</span>
      <span class="member-name">${esc(member.name)}</span>
      <span class="member-note">${hit ? "已提交" : "待提交"}</span>
    </li>`;
    })
    .join("");
}

function feed(cfg, reports) {
  const items = reports
    .map(
      (report) => `    <item>
      <title>${esc(report.title)}</title>
      <link>${esc(absoluteUrl(cfg, `reports/${report.slug}/`))}</link>
      <guid isPermaLink="true">${esc(absoluteUrl(cfg, `reports/${report.slug}/`))}</guid>
      <pubDate>${new Date(`${report.date}T09:00:00Z`).toUTCString()}</pubDate>
      <dc:creator>${esc(report.author)}</dc:creator>
      <description>${esc(report.summary || report.goal)}</description>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(cfg.title)}</title>
    <link>${esc(absoluteUrl(cfg, ""))}</link>
    <description>${esc(cfg.description ?? "")}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
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
  const date = today();
  const week = weekOf(date);
  const template = `---
title: ${week} 我的学习周报
author: 你的名字
github: 你的 GitHub 用户名
date: ${date}
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
