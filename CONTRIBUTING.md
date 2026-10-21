# CONTRIBUTING

感谢参与 AI 学习周报论坛！

## 1. 提交周报

1. 从 `reports/_template.md` 复制出新文件到 `reports/` 目录  
   命名：`YYYY-Www-主题.md`（示例：`2026-W42-agent-eval.md`）
2. 填写 front matter（必填推荐）：
   - `title`
   - `author`
   - `date`（YYYY-MM-DD）
   - `week`（YYYY-Www）
   - `directions`（列表）
   - `goal`
   - `summary`
   - `discussion_url`（优先）
   - `issue_fallback_url`（兜底）
3. 在正文补全：
   - 学习目标
   - 成果总结
   - 关键资料
   - 代码/演示链接
   - 问题与讨论点
   - 下周计划

## 2. 发起 PR

1. 新建分支并提交改动
2. PR 标题建议：`docs: add 2026-Wxx weekly report`
3. PR 描述至少包含：
   - 本周新增周报
   - 讨论入口（Discussions 或 Issues）
   - 需要 reviewer 重点关注的问题

## 3. 讨论与互评

- 优先在 `discussion_url` 对应 Discussion 下讨论
- 若未启用 Discussions，使用 `issue_fallback_url` 对应 Issue
- 评论建议聚焦：
  - 结论是否清晰
  - 关键资料是否可复现
  - 下周计划是否可执行

## 4. 按周归档建议

- 每周至少一份团队总览周报
- 个人可按方向补充子周报
- 避免重名文件，保持 `YYYY-Www-*` 前缀

## 5. 站点构建与发布

- 本地验证：`npm install && npm run build`
- 合并到默认分支后，GitHub Actions 自动部署到 Pages
