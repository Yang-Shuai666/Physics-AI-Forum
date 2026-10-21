# AI 学习周报论坛（Physics-AI-Forum）

这是一个**零成本、无需部署**就能直接使用的 GitHub 学习讨论区：  
普通参与者只需要 GitHub 网页就可以发布周报和参与 Issues 讨论。

## 最简单用法（只用 GitHub 网页，必需）

1. 打开仓库 `reports/` → `Add file` → `Create new file`
2. 新建 `reports/YYYY-Www-主题.md`，可复制 `reports/_template.md`
3. 提交后到仓库 `Issues` → `New issue` → 选择“周报讨论”模板
4. 填写周报链接、讨论问题、期望反馈并发布，其他成员直接在该 Issue 回复

> 完成以上流程**不需要**安装 Node.js、不需要运行 npm、不需要配置 GitHub Pages。

## 功能概览

- 首页展示周报列表、最近周报、学习方向卡片、协作流程
- 支持按方向筛选 + 关键词搜索（前端静态筛选）
- 周报以 Markdown 存储，构建时自动生成索引
- 每份周报包含讨论入口：
  - 优先：GitHub Discussions 链接
  - 兜底：对应 GitHub Issue 链接（或新建 Issue 链接）
- GitHub Pages 自动构建部署（可选浏览界面）

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

## 可选：本地构建静态站点（开发者）

```bash
npm install
npm run build
```

构建结果输出到 `dist/`，可用于本地预览或 GitHub Pages 展示。  
这一步是可选能力，不是参与周报讨论的必需步骤。

## 周报写作与讨论机制

1. 在 `reports/` 下复制 `reports/_template.md` 新建周报，命名建议 `YYYY-Www-主题.md`（可直接在 GitHub 网页完成）。
2. 填写 front matter（标题、作者、日期、周次、方向、讨论链接等）。
3. 为该周报创建一个“周报讨论” Issue，并在 Issue 中持续讨论。
4. （可选）提交 PR 后，构建脚本会读取 front matter 生成 `dist/reports/index.json`，供静态首页展示。

## Discussions 与 Issues 讨论说明（Issues 即可直接使用）

> 仓库本身即可作为讨论区使用；GitHub Pages 只是可选的内容浏览界面。

### 可选：启用 GitHub Discussions

仓库管理员操作：

1. 仓库 `Settings` → 勾选 `Discussions`
2. 创建分类（建议：`周报讨论`）
3. 在周报 front matter 的 `discussion_url` 填入该周 Discussion 链接

### 默认方案：使用 GitHub Issues

- 在周报 `discussion_url` 填对应 Issue 链接
- 或使用 `issue_fallback_url` 提供“新建讨论 Issue”入口（配合仓库 Issue 模板）

## 可复制周报示例（最简版）

```markdown
# 2026-W43 Agent 学习周报

## 学习目标
- 比较 ReAct 与 Plan-and-Execute 的任务成功率与成本

## 本周完成
- 阅读 2 篇论文并整理评估指标
- 设计了 1 组可复现实验

## 问题与讨论点
1. 团队是否需要统一 benchmark 数据集？
2. 成本和质量如何加权更合理？

## 下周计划
- 复现实验并补充失败案例
```

## 每周协作流程（建议）

1. 成员在 `reports/` 发布当周周报（可直接网页提交）
2. 创建“周报讨论” Issue 并关联周报链接
3. 团队在 Issue 下继续讨论与跟进
4. （可选）通过 PR 审核与 Pages 展示沉淀内容

## 可选部署（GitHub Pages）

仓库已包含 `.github/workflows/pages.yml`，在 `main` 分支推送后可自动部署到 GitHub Pages。  
不启用 Pages 也不影响周报发布与 Issues 讨论。

首次使用时请在仓库 `Settings -> Pages` 中确认：

- Source: `GitHub Actions`

## 已知限制与后续建议

- 当前首页为静态列表，不含全文检索（仅关键词匹配标题/摘要/方向/作者）
- Markdown 原文在仓库中查看，站点不做完整 Markdown 渲染页
- 后续可增加：
  - 周报详情页静态渲染
  - 自动校验周报 front matter 的 CI
  - 按方向统计与归档页