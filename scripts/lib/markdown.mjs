import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import hljs from "highlight.js";

/**
 * 统一的 Markdown 渲染器。
 * html:false 关闭原始 HTML，避免任何投稿人往站点里塞 <script>。
 */
export function createMarkdown() {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false,
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          const html = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
          return `<pre class="hljs"><code class="language-${escapeAttr(lang)}">${html}</code></pre>`;
        } catch {
          /* fall through */
        }
      }
      return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
    },
  });

  md.use(anchor, {
    level: [2, 3],
    // 默认会把中文标题编码成 %E5%AD%A6...，这里保留中文，链接更好复制
    slugify: (value) =>
      String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}\-_]+/gu, ""),
    permalink: anchor.permalink.linkInsideHeader({ symbol: "#", placement: "before", ariaHidden: true }),
  });

  // 站外链接一律新窗口打开，并补上 rel。
  const defaultLink = md.renderer.rules.link_open ?? ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet("href") ?? "";
    if (/^https?:\/\//i.test(href)) {
      tokens[idx].attrSet("target", "_blank");
      tokens[idx].attrSet("rel", "noopener noreferrer");
    }
    return defaultLink(tokens, idx, options, env, self);
  };

  return md;
}

/** 渲染正文，同时抽出 h2/h3 生成目录。 */
export function renderDocument(md, markdown) {
  const env = {};
  const tokens = md.parse(markdown, env);
  const headings = [];

  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].type === "heading_open") {
      const level = Number.parseInt(tokens[i].tag.slice(1), 10);
      if (level === 2 || level === 3) {
        headings.push({
          level,
          text: tokens[i + 1]?.content?.trim() ?? "",
          id: tokens[i].attrGet("id") ?? "",
        });
      }
    }
  }

  return { html: md.renderer.render(tokens, md.options, env), headings };
}

function escapeAttr(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
