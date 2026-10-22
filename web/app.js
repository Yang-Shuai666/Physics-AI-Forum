// 站点交互：阅读进度、目录高亮、复制链接、归档筛选。
// 全部是渐进增强，禁用 JS 后页面依然可读。

/* ---------- 阅读进度条 ---------- */
const bar = document.querySelector("#scroll-progress");
if (bar) {
  const update = () => {
    const root = document.documentElement;
    const max = root.scrollHeight - root.clientHeight;
    bar.style.width = max > 0 ? `${Math.min(100, (root.scrollTop / max) * 100)}%` : "0";
  };
  document.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* ---------- 目录跟随滚动高亮 ---------- */
const tocLinks = [...document.querySelectorAll("[data-toc]")];
if (tocLinks.length && "IntersectionObserver" in window) {
  const pair = new Map();
  for (const link of tocLinks) {
    const heading = document.getElementById(link.dataset.toc);
    if (heading) pair.set(heading, link);
  }

  const visible = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      if (!visible.size) return;
      let topmost = null;
      for (const heading of visible) {
        if (!topmost || heading.getBoundingClientRect().top < topmost.getBoundingClientRect().top) topmost = heading;
      }
      for (const link of tocLinks) link.classList.remove("is-active");
      pair.get(topmost)?.classList.add("is-active");
    },
    { rootMargin: "-84px 0px -68% 0px", threshold: 0 }
  );

  for (const heading of pair.keys()) observer.observe(heading);
}

/* ---------- 复制链接 ---------- */
const copyButton = document.querySelector("[data-copy-link]");
if (copyButton) {
  copyButton.addEventListener("click", async () => {
    const url = location.href.split("#")[0];
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = url;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.append(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    const label = copyButton.textContent;
    copyButton.textContent = "已复制 ✓";
    setTimeout(() => {
      copyButton.textContent = label;
    }, 1600);
  });
}

/* ---------- 归档筛选（关键词 + 方向） ---------- */
const filterInput = document.querySelector("#filter-input");
if (filterInput) {
  const rows = [...document.querySelectorAll(".archive-week .row")];
  const countEl = document.querySelector("#filter-count");
  const chips = [...document.querySelectorAll(".chip-btn")];
  let direction = "";

  const apply = () => {
    const keyword = filterInput.value.trim().toLowerCase();
    let shown = 0;

    for (const row of rows) {
      const directions = (row.dataset.direction || "").split(" ").filter(Boolean);
      const matchDirection = !direction || directions.includes(direction);
      const matchKeyword = !keyword || (row.dataset.search || "").includes(keyword);
      const show = matchDirection && matchKeyword;
      row.hidden = !show;
      if (show) shown += 1;
    }

    if (countEl) countEl.textContent = keyword || direction ? `显示 ${shown} / ${rows.length} 份` : "";

    for (const week of document.querySelectorAll(".archive-week")) {
      week.hidden = ![...week.querySelectorAll(".row")].some((row) => !row.hidden);
    }
    for (const year of document.querySelectorAll(".year-block")) {
      year.hidden = ![...year.querySelectorAll(".archive-week")].some((week) => !week.hidden);
    }
  };

  filterInput.addEventListener("input", apply);
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      for (const other of chips) other.classList.toggle("is-active", other === chip);
      direction = chip.dataset.filterDir || "";
      apply();
    });
  }
  apply();
}
