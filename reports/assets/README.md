# 周报图片放这里

```text
reports/assets/<周次>/<文件名>
例：reports/assets/2026-W43/directions.png
```

正文里这样写（**相对 `assets/` 的路径**，不要写 `reports/assets/...`）：

```md
![四个方向每周汇总](assets/2026-W43/directions.png)
```

构建时会自动改写成 `/Physics-AI-Forum/reports/assets/2026-W43/directions.png`，
所以详情页、周次页、搜索结果的图片都能正常显示。

## 规则

1. **按周次建子目录**，避免几百个文件堆在一个文件夹里。
2. **文件名用英文小写 + 短横线**（`rag-pipeline.png`），中文和空格会被 URL 编码。
3. **压缩后再提交**：截图/示意图控制在 300KB 以内，优先 WebP 或优化过的 PNG。
4. 单文件不要超过 100MB（GitHub 限制）；整个仓库建议 <1GB（Pages 限制）。
5. 图片找不到时 CI 会报错并指出是哪一行引用，别慌，按提示改路径即可。

## 想控制显示宽度

在图片标题里写像素宽度（第二对引号里）：

```md
![架构图](assets/2026-W43/arch.png "640")
![对比图](assets/2026-W43/compare.png "640x360")
```

点击图片可以放大查看。
