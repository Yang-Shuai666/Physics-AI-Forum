import { initAuthUI } from "./auth.js";

const formEl = document.getElementById("new-report-form");
const statusEl = document.getElementById("submit-status");

function collectPayload(formData) {
  const get = (key) => (formData.get(key) || "").toString().trim();
  return {
    title: get("title"),
    author: get("author"),
    date: get("date"),
    week: get("week"),
    directions: get("directions")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    goal: get("goal"),
    summary: get("summary"),
    achievements: get("achievements"),
    resources: get("resources"),
    demoLinks: get("demoLinks"),
    questions: get("questions"),
    nextPlan: get("nextPlan"),
    discussionUrl: get("discussionUrl")
  };
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

async function init() {
  const { apiBaseUrl, user } = await initAuthUI({
    statusEl: document.getElementById("auth-status"),
    loginLink: document.getElementById("login-link"),
    logoutLink: document.getElementById("logout-link"),
    userOnlyEls: [formEl],
    guestOnlyEls: [document.getElementById("guest-tip")]
  });

  if (!apiBaseUrl) {
    formEl.hidden = true;
    setStatus(
      "未配置后端 API：请在 web/app-config.js 中设置 window.APP_CONFIG.apiBaseUrl。",
      true
    );
    return;
  }

  if (!user) {
    formEl.hidden = true;
    setStatus("请先登录 GitHub，再提交周报。", true);
    return;
  }

  formEl.hidden = false;
  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = collectPayload(new FormData(formEl));

    try {
      setStatus("提交中...");
      const response = await fetch(`${apiBaseUrl}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || `提交失败（${response.status}）`);
      }

      setStatus(`提交成功：已创建 PR ${result.prUrl || ""}`);
      formEl.reset();
    } catch (error) {
      console.error(error);
      setStatus(error.message || "提交失败，请稍后重试。", true);
    }
  });
}

init();
