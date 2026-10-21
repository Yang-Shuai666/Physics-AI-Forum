function normalizeApiBaseUrl(raw) {
  if (typeof raw !== "string") return "";
  const value = raw.trim();
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  return normalizeApiBaseUrl(
    window.APP_CONFIG?.apiBaseUrl || window.PUBLIC_API_BASE_URL || ""
  );
}

export async function fetchCurrentUser(apiBaseUrl) {
  if (!apiBaseUrl) return null;
  const response = await fetch(`${apiBaseUrl}/api/me`, {
    credentials: "include"
  });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`获取用户信息失败（${response.status}）`);
  }
  return response.json();
}

export function authUrls(apiBaseUrl) {
  if (!apiBaseUrl) return { loginUrl: "", logoutUrl: "" };
  return {
    loginUrl: `${apiBaseUrl}/auth/login`,
    logoutUrl: `${apiBaseUrl}/auth/logout`
  };
}

export async function initAuthUI({
  statusEl,
  loginLink,
  logoutLink,
  userOnlyEls = [],
  guestOnlyEls = []
}) {
  const apiBaseUrl = getApiBaseUrl();
  const { loginUrl, logoutUrl } = authUrls(apiBaseUrl);

  if (loginLink) {
    loginLink.href = loginUrl || "#";
    loginLink.setAttribute("aria-disabled", apiBaseUrl ? "false" : "true");
  }
  if (logoutLink) {
    logoutLink.href = logoutUrl || "#";
    logoutLink.setAttribute("aria-disabled", apiBaseUrl ? "false" : "true");
  }

  if (!apiBaseUrl) {
    if (statusEl) {
      statusEl.textContent =
        "未配置后端 API（window.APP_CONFIG.apiBaseUrl），仅可浏览周报。";
    }
    guestOnlyEls.forEach((el) => {
      el.hidden = false;
    });
    userOnlyEls.forEach((el) => {
      el.hidden = true;
    });
    return { apiBaseUrl, user: null };
  }

  try {
    const user = await fetchCurrentUser(apiBaseUrl);
    if (user) {
      if (statusEl) statusEl.textContent = `已登录：${user.login}`;
      guestOnlyEls.forEach((el) => {
        el.hidden = true;
      });
      userOnlyEls.forEach((el) => {
        el.hidden = false;
      });
      return { apiBaseUrl, user };
    }
  } catch (error) {
    console.error(error);
    if (statusEl) statusEl.textContent = "登录状态获取失败，请稍后重试。";
    return { apiBaseUrl, user: null, error };
  }

  if (statusEl) statusEl.textContent = "未登录，请先使用 GitHub 登录后提交周报。";
  guestOnlyEls.forEach((el) => {
    el.hidden = false;
  });
  userOnlyEls.forEach((el) => {
    el.hidden = true;
  });
  return { apiBaseUrl, user: null };
}
