import { initAuthUI } from "./auth.js";
import { safeExternalUrl, safeText } from "./markdown.js";

const reportListEl = document.getElementById("report-list");
const recentEl = document.getElementById("recent-reports");
const directionSelect = document.getElementById("direction-select");
const searchInput = document.getElementById("search-input");
const resultCountEl = document.getElementById("result-count");

function reportDetailHref(reportPath) {
  return `./report.html?file=${encodeURIComponent(reportPath)}`;
}

function cardTemplate(item) {
  const tags = (item.directions || [])
    .map((direction) => `<span class="tag">${safeText(direction)}</span>`)
    .join("");
  const discussionHref = safeExternalUrl(item.discussionUrl || item.issueFallbackUrl);
  const discussionText = item.discussionUrl
    ? "前往 GitHub Discussions 讨论"
    : "前往 GitHub Issue 讨论（fallback）";

  return `
    <article class="card">
      <h3>${safeText(item.title || "未命名周报")}</h3>
      <p class="meta">作者：${safeText(item.author || "未署名")} · 日期：${safeText(item.date || "待补充")} · 周次：${safeText(item.week || "待补充")}</p>
      ${item.goal ? `<p><strong>学习目标：</strong>${safeText(item.goal)}</p>` : ""}
      ${item.summary ? `<p>${safeText(item.summary)}</p>` : ""}
      <div class="tags">${tags}</div>
      <div class="link-group">
        <a href="${reportDetailHref(item.reportPath)}">查看详情</a>
        ${discussionHref ? `<a href="${discussionHref}" target="_blank" rel="noopener noreferrer">${discussionText}</a>` : ""}
      </div>
    </article>
  `;
}

function renderReports(list) {
  reportListEl.innerHTML = list.map(cardTemplate).join("");
  resultCountEl.textContent = `共 ${list.length} 份周报`;
}

function getDirections(reports) {
  const set = new Set();
  for (const report of reports) {
    (report.directions || []).forEach((direction) => set.add(direction));
  }
  return Array.from(set);
}

function applyFilter(reports) {
  const direction = directionSelect.value;
  const keyword = searchInput.value.trim().toLowerCase();

  const filtered = reports.filter((item) => {
    const byDirection = !direction || (item.directions || []).includes(direction);
    if (!byDirection) return false;

    if (!keyword) return true;
    const text = [
      item.title,
      item.author,
      item.summary,
      item.goal,
      item.week,
      item.date,
      (item.directions || []).join(" ")
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(keyword);
  });

  renderReports(filtered);
}

async function initReports() {
  try {
    const response = await fetch(new URL("./reports/index.json", import.meta.url));
    if (!response.ok) {
      throw new Error(`索引加载失败：${response.status}`);
    }
    const reports = await response.json();

    for (const direction of getDirections(reports)) {
      const option = document.createElement("option");
      option.value = direction;
      option.textContent = direction;
      directionSelect.append(option);
    }

    recentEl.innerHTML = reports.slice(0, 3).map(cardTemplate).join("");
    renderReports(reports);

    directionSelect.addEventListener("change", () => applyFilter(reports));
    searchInput.addEventListener("input", () => applyFilter(reports));
  } catch (error) {
    reportListEl.innerHTML = `<p>周报索引加载失败，请检查构建产物是否完整。</p>`;
    recentEl.innerHTML = "";
    resultCountEl.textContent = "";
    console.error(error);
  }
}

async function init() {
  await initAuthUI({
    statusEl: document.getElementById("auth-status"),
    loginLink: document.getElementById("login-link"),
    logoutLink: document.getElementById("logout-link"),
    userOnlyEls: [document.getElementById("new-report-link")],
    guestOnlyEls: [document.getElementById("guest-tip")]
  });

  await initReports();
}

init();
