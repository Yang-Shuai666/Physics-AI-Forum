
const API_BASE = "https://physics-ai-forum-api.dadashuai686.workers.dev";

const authStatusEl = document.getElementById("auth-status");
const authActionsEl = document.getElementById("auth-actions");

async function initAuth() {
  try {
    const response = await fetch(`${API_BASE}/api/me`, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.authenticated) {
      authStatusEl.textContent =
        `已登录：${data.user.login}`;

      authActionsEl.replaceChildren();

      const logoutButton = document.createElement("button");
      logoutButton.type = "button";
      logoutButton.className = "button-link secondary";
      logoutButton.textContent = "退出登录";

      logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
          const result = await fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            credentials: "include"
          });

          if (!result.ok) {
            throw new Error(`HTTP ${result.status}`);
          }

          await initAuth();
        } catch (error) {
          authStatusEl.textContent = "退出失败，请稍后重试";
          console.error(error);
        } finally {
          logoutButton.disabled = false;
        }
      });

      authActionsEl.append(logoutButton);
    } else {
      authStatusEl.textContent = "你尚未登录";

      const loginLink = document.createElement("a");
      loginLink.className = "button-link";
      loginLink.href = `${API_BASE}/auth/login`;
      loginLink.textContent = "使用 GitHub 登录";

      authActionsEl.replaceChildren(loginLink);
    }
  } catch (error) {
    authStatusEl.textContent = "暂时无法获取登录状态";
    console.error("Auth error:", error);
  }
}

initAuth();


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
