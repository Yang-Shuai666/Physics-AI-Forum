const reportListEl = document.getElementById("report-list");
const recentEl = document.getElementById("recent-reports");
const directionSelect = document.getElementById("direction-select");
const searchInput = document.getElementById("search-input");
const resultCountEl = document.getElementById("result-count");

function cardTemplate(item) {
  const tags = item.directions
    .map((direction) => `<span class="tag">${direction}</span>`)
    .join("");
  const discussionHref = item.discussionUrl || item.issueFallbackUrl;
  const discussionText = item.discussionUrl
    ? "前往 GitHub Discussions 讨论"
    : "前往 GitHub Issue 讨论（fallback）";
  return `
    <article class="card">
      <h3>${item.title}</h3>
      <p class="meta">作者：${item.author} · 日期：${item.date || "待补充"} · 周次：${item.week || "待补充"}</p>
      ${item.goal ? `<p><strong>学习目标：</strong>${item.goal}</p>` : ""}
      ${item.summary ? `<p>${item.summary}</p>` : ""}
      <div class="tags">${tags}</div>
      <div class="link-group">
        <a href="./${item.reportPath}" target="_blank" rel="noopener noreferrer">查看周报原文</a>
        <a href="${discussionHref}" target="_blank" rel="noopener noreferrer">${discussionText}</a>
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
    report.directions.forEach((d) => set.add(d));
  }
  return Array.from(set);
}

function applyFilter(reports) {
  const direction = directionSelect.value;
  const keyword = searchInput.value.trim().toLowerCase();

  const filtered = reports.filter((item) => {
    const byDirection = !direction || item.directions.includes(direction);
    if (!byDirection) return false;

    if (!keyword) return true;
    const text = [
      item.title,
      item.author,
      item.summary,
      item.goal,
      item.week,
      item.date,
      item.directions.join(" ")
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(keyword);
  });

  renderReports(filtered);
}

async function init() {
  try {
    const response = await fetch("./reports/index.json");
    const reports = await response.json();

    const directions = getDirections(reports);
    directions.forEach((direction) => {
      const option = document.createElement("option");
      option.value = direction;
      option.textContent = direction;
      directionSelect.append(option);
    });

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

init();
