function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl, window.location.href);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function renderInline(text) {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const safeHref = safeUrl(href.trim());
    if (!safeHref) return label;
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  return linked
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function parseFrontMatter(markdown) {
  const source = markdown.replace(/\r\n/g, "\n");
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, content: source };

  const data = {};
  let currentListKey = null;

  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") && currentListKey) {
      if (!Array.isArray(data[currentListKey])) {
        data[currentListKey] = [];
      }
      data[currentListKey].push(trimmed.slice(2).trim());
      continue;
    }

    const splitIndex = line.indexOf(":");
    if (splitIndex === -1) continue;
    const key = line.slice(0, splitIndex).trim();
    const value = line.slice(splitIndex + 1).trim();
    if (value === "") {
      data[key] = "";
      currentListKey = key;
    } else {
      data[key] = value;
      currentListKey = null;
    }
  }

  return {
    data,
    content: source.slice(match[0].length)
  };
}

export function renderMarkdownSafe(markdownBody) {
  const lines = markdownBody.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listType = null;

  function closeList() {
    if (listType) {
      html.push(listType === "ul" ? "</ul>" : "</ol>");
      listType = null;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const ul = trimmed.match(/^-\s+(.+)$/);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
  return html.join("\n");
}

export function safeText(value, fallback = "") {
  if (value == null) return fallback;
  return escapeHtml(String(value));
}

export function safeExternalUrl(url) {
  return safeUrl(url);
}
