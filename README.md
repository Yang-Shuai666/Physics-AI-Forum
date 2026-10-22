# 团队学习周报门户（Physics-AI-Forum）

每周每人写一份学习成果，自动汇总成一个站点；每份周报下面都能直接评论。
全流程 **零服务器、零费用**：内容存在 `reports/*.md`，站点用 GitHub Pages 静态构建，评论用 giscus 存在 GitHub Discussions。

- 站点：https://yang-shuai666.github.io/Physics-AI-Forum/
- 内容源：`reports/` 目录（Markdown + front matter）
- 讨论：每份周报页面底部的评论区（对应一条 GitHub Discussion）

## 参与者：3 步搞定

1. **新建**：打开站点首页点「＋ 提交本周周报」，会跳到 GitHub 预填好模板的新建文件页；也可以复制 `reports/_template.md`。
2. **填写**：改标题、作者、方向、目标、摘要，然后写正文。文件名保持 `2026-W44-agent-eval.md` 这种格式（周次-英文短横线主题）。
3. **提交**：直接提交到 `main` 即可（个人可直接 commit，团队想留痕就走 PR）。提交后 Actions 会自动构建，几分钟后站点上就有你的周报。

讨论不用另外建 Issue：打开周报详情页，滚到底部用 GitHub 账号评论即可，评论会同步到 Discussions 的「周报讨论」分类。

> 详细字段和写作要求见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 周报长什么样

```md
---
title: 2026-W44 Agent 评测与成本
author: 你的名字
github: your-github-id
date: 2026-10-26
week: 2026-W44
directions: [agent]
goal: 一句话说清本周目标
summary: 两三句话：做了什么、结论是什么、下一步做什么
tags: [评测, benchmark]
---

## 本周目标
...
```

`week` 可以省略，构建时会由 `date` 自动推导；`directions` 里写 `site.config.json` 登记过的方向 key（agent / avatar / autodrive / embodied）。

## 站点能力

- 首页：最新周报、方向入口、按周浏览、参与方式
- 周报详情页：Markdown 渲染、代码高亮、目录、上/下一篇、giscus 评论
- 归档页：按年/周分组，支持关键词筛选
- 方向页：`/direction/agent/` 等，按方向聚合
- 搜索页：Pagefind 静态全文检索（构建时生成索引）
- 数据接口：`/reports/index.json`（给机器读或做看板用）
- SEO：每页独立 title/description/canonical、sitemap.xml、robots.txt、404 页

## 目录结构

```text
.
├── reports/                    # 周报正文（唯一内容源）
│   ├── _template.md            # 模板，以下划线开头不会被发布
│   ├── 2026-W43-team-learning.md
│   ├── 2026-W43-rag-notes.md
│   └── assets/                 # 可选：图片等附件（按周次分目录）
├── scripts/
│   ├── build.mjs               # 生成静态站点
│   ├── validate.mjs            # 校验 front matter / 文件名（CI 用）
│   ├── serve.mjs               # 本地预览
│   └── lib/                    # config / content / markdown / render / weeks
├── web/                        # 静态资源（样式、脚本、favicon）
├── site.config.json            # 站点配置：仓库、方向、giscus
└── .github/workflows/
    ├── pages.yml               # 构建 + 发布到 Pages
    └── ci.yml                  # PR 内容校验
```

## 管理员：一次性配置

1. **Pages**：`Settings → Pages → Source = GitHub Actions`。
2. **Discussions**：`Settings → Features → Discussions` 打开；在 Discussions 里新建分类 `周报讨论`，类型选 **Announcements**（这样只有 giscus 机器人能新建讨论，别人只能评论）。
3. **giscus**：打开 [giscus.app](https://giscus.app)，填仓库 `Yang-Shuai666/Physics-AI-Forum`、映射选 `pathname`、分类选 `周报讨论`，把生成的 `data-repo-id` 和 `data-category-id` 填进 `site.config.json → giscus`，同时安装 giscus App。
4. 改 `site.config.json` 里的 `siteUrl` / `basePath`（项目页要带仓库名）。

## 本地开发

```bash
npm install
npm run build        # 生成 dist/
npm run preview      # http://localhost:4173
npm run validate     # 校验所有周报
npm run build:all    # 构建 + 生成搜索索引（和 CI 一致）
```

本地预览要先把 `BASE_PATH` 设成 `/`（默认是 `/Physics-AI-Forum/`，对应 Pages 项目页路径）：

```bash
BASE_PATH=/ npm run build:all && npm run preview
```

## 为什么是这个方案

- **零成本**：GitHub Pages（静态托管）+ Actions（公开仓库免费）+ giscus（免费）＋ Pagefind（开源本地索引），没有服务器、没有数据库、没有需要续费的域名。
- **零锁定**：内容就是 Markdown 文件，站点是构建产物，随时可以换任何静态托管。
- **零维护**：没有需要打补丁的后端服务，也没有 OAuth 密钥要轮换。
