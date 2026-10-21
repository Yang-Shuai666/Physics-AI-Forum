import { initAuthUI } from "./auth.js";
import {
  parseFrontMatter,
  renderMarkdownSafe,
  safeExternalUrl,
  safeText
} from "./markdown.js";

const contentEl = document.getElementById("report-content");
const metaEl = document.getElementById("report-meta");
const titleEl = document.getElementById("report-title");

function getFileFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const file = params.get("file") || "";
  if (!/^reports\/[\w\u4e00-\u9fa5-]+\.md$/u.test(file)) {
    return "";
  }
  return file;
}

function frontMatterHtml(data) {
  const directions = Array.isArray(data.directions)
    ? data.directions
    : typeof data.directions === "string"
      ? data.directions
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const discussionUrl = safeExternalUrl(data.discussion_url || data.issue_fallback_url || "");

  return `
    <ul class="meta-list">
      <li><strong>标题：</strong>${safeText(data.title || "未命名")}</li>
      <li><strong>作者：</strong>${safeText(data.author || "未署名")}</li>
      <li><strong>日期：</strong>${safeText(data.date || "")}</li>
      <li><strong>周次：</strong>${safeText(data.week || "")}</li>
      <li><strong>方向：</strong>${safeText(directions.join("、") || "未填写")}</li>
      <li><strong>学习目标：</strong>${safeText(data.goal || "")}</li>
      <li><strong>摘要：</strong>${safeText(data.summary || "")}</li>
      <li>
        <strong>讨论：</strong>
        ${discussionUrl ? `<a href="${discussionUrl}" target="_blank" rel="noopener noreferrer">GitHub Discussions / Issue</a>` : "未填写"}
      </li>
    </ul>
  `;
}

async function initReport() {
  const file = getFileFromQuery();
  if (!file) {
    titleEl.textContent = "参数错误";
    metaEl.innerHTML = "<p>请通过首页卡片进入详情页。</p>";
    contentEl.innerHTML = "";
    return;
  }

  const reportUrl = new URL(`./${file}`, import.meta.url);

  try {
    const response = await fetch(reportUrl);
    if (!response.ok) {
      throw new Error(`周报加载失败：${response.status}`);
    }

    const markdown = await response.text();
    const { data, content } = parseFrontMatter(markdown);

    titleEl.textContent = data.title || file.replace(/^reports\//, "");
    metaEl.innerHTML = frontMatterHtml(data);
    contentEl.innerHTML = renderMarkdownSafe(content);
  } catch (error) {
    titleEl.textContent = "加载失败";
    metaEl.innerHTML = "<p>无法读取周报内容，请稍后重试。</p>";
    contentEl.innerHTML = "";
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

  await initReport();
}

init();
