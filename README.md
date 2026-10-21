# AI 学习周报论坛（Physics-AI-Forum）

面向团队的学习交流站点：每周沉淀 agent、数字人、自动驾驶、具身智能等方向的学习成果，并通过 GitHub Discussions / Issues 进行文字讨论。

## 功能概览

- 首页展示周报列表、最近周报、学习方向卡片、协作流程
- 支持按方向筛选 + 关键词搜索（前端静态筛选）
- 周报以 Markdown 存储，构建时自动生成索引
- 每份周报包含讨论入口：
  - 优先：GitHub Discussions 链接
  - 兜底：对应 GitHub Issue 链接（或新建 Issue 链接）
- GitHub Pages 自动构建部署

## 目录结构

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── report-discussion.yml
│   └── workflows/
│       └── pages.yml
├── reports/
│   ├── _template.md
│   └── 2026-W42-team-learning.md
├── scripts/
│   └── build.mjs
├── web/
│   ├── index.html
│   ├── main.js
│   └── styles.css
├── CONTRIBUTING.md
└── package.json
```

## 本地运行

```bash
npm install
npm run build
```

构建结果输出到 `dist/`，可直接用于 GitHub Pages 部署。

## 周报写作与展示机制

1. 在 `reports/` 下复制 `reports/_template.md` 新建周报，命名建议 `YYYY-Www-主题.md`。
2. 填写 front matter（标题、作者、日期、周次、方向、讨论链接等）。
3. 提交 PR 后，构建脚本会读取周报 front matter 自动生成 `dist/reports/index.json`。
4. 首页读取该索引并渲染列表与筛选结果。

## Discussions 与 Issues 讨论说明

> GitHub Pages 静态站点本身不保存评论数据，评论依赖 GitHub Discussions 或 Issues。

### 推荐：启用 GitHub Discussions

仓库管理员操作：

1. 仓库 `Settings` → 勾选 `Discussions`
2. 创建分类（建议：`周报讨论`）
3. 在周报 front matter 的 `discussion_url` 填入该周 Discussion 链接

### 兜底方案：使用 GitHub Issues

- 若 Discussions 尚未启用，可在周报 `discussion_url` 填对应 Issue 链接
- 或使用 `issue_fallback_url` 提供“新建讨论 Issue”入口（可配合仓库 Issue 模板）

## 每周协作流程（建议）

1. 成员基于模板提交当周周报 PR
2. Reviewer 校验格式、链接与讨论入口
3. 合并后 GitHub Pages 自动更新
4. 团队在 Discussions/Issues 下继续讨论与跟进

## 部署

仓库已包含 `.github/workflows/pages.yml`，默认在 `main` 分支推送后自动部署到 GitHub Pages。

首次使用时请在仓库 `Settings -> Pages` 中确认：

- Source: `GitHub Actions`

## 已知限制与后续建议

- 当前首页为静态列表，不含全文检索（仅关键词匹配标题/摘要/方向/作者）
- Markdown 原文在仓库中查看，站点不做完整 Markdown 渲染页
- 后续可增加：
  - 周报详情页静态渲染
  - 自动校验周报 front matter 的 CI
  - 按方向统计与归档页