---
title: "2026-W45 miniMaxH3本地测试"
author: "losto"
github: "your-github-id"
date: 2026-11-02
week: 2026-W45
directions: [avatar]
tags: []
---

# MiniMax H3 + ComfyUI R2V 本地测试


-   Linux 服务器本地运行 ComfyUI；
-   加载 MiniMax H3 R2V 所需模型；
-   使用参考图片和 Prompt；
-   输入 Blender 白模参考视频；
-   将视频解码为 IMAGE 帧序列并连接至 `ref_video_0`；
-   使用约 8 秒白模视频完成 H3 R2V 测试。

## MiniMax H3 R2V工作流

> 1. 点击左侧工具栏的「模板」图标（不是模型库）。
> 2. 进入 Video（视频）分类。
> 3. 在搜索框输入：MiniMax H3 R2V
> 4. 找到 MiniMax H3 Reference to Video。
> 5. 点击打开。

![](https://i-blog.csdnimg.cn/direct/b030fe2e48314fb79483d18a047ef3b8.png)

- 问题报错
    - 缺失模型
    - 缺少输入

## 网络与模型下载

服务器整体无法访问外网时，Hugging Face镜像也无法解决根本问题。

``` text
Windows 本地下载模型
        ↓
VS Code Remote SSH 文件管理器
        ↓
拖拽上传到 Linux 服务器
        ↓
放入对应 models 子目录
```

网络检查命令：

``` bash
curl -I --connect-timeout 10 https://huggingface.co
```

如果显示
`Connection timed out`，可再测试其他网站判断是否整个服务器无外网。

> 模型是否传输完成？可以查看文件大小和原文件大小是否一致

## Model Links

[🤗 Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3)

**vae**
- [minimax_h3_video_vae_int8_convrot.safetensors](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_int8_convrot.safetensors) (2.62 GB)
- [minimax_h3_audio_vae_fp32.safetensors](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_audio_vae_fp32.safetensors) (577.2 MB)

**diffusion_models**
- [minimax_h3_ref2va_pruned_int8_convrot.safetensors](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors) (19.53 GB)

**text_encoders**

- [qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors) (14.61 GB)

**loras**

- 4 steps: [minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors) (1.82 GB)

**embeddings**

- [10 style embeddings](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main/embeddings) (`minimaxh3_*.safetensors`), for example `minimaxh3_art_is_explosion`

### Model Storage Location

```
📂 ComfyUI/
├── 📂 models/
│   ├── 📂 vae/
│   │   ├── minimax_h3_video_vae_int8_convrot.safetensors
│   │   └── minimax_h3_audio_vae_fp32.safetensors
│   ├── 📂 diffusion_models/
│   │   └── minimax_h3_ref2va_pruned_int8_convrot.safetensors
│   ├── 📂 text_encoders/
│   │   └── qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors
│   ├── 📂 loras/
│   │   └── minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors
│   └── 📂 embeddings/
│       └── minimaxh3_art_is_explosion.safetensors
```

![](https://i-blog.csdnimg.cn/direct/4a610eba110840288ad01456b7847fe2.png)

## H3 R2V 的白膜视频输入

核心节点为：

``` text
MiniMax H3 Reference to Video
```

其中重要输入包括：

``` text
ref_image_0
ref_image_1
ref_image_2
...

ref_video_0
ref_video_1
...

ref_video_audio_0
ref_audio_0
...
```
![](https://i-blog.csdnimg.cn/direct/b5eb37766a054ddb9049bf9506df132d.png)

![](https://i-blog.csdnimg.cn/direct/7c8bfb013e6a45229d73122d66281202.png)
### 参考图片

例如：

``` text
人物/主体参考图 → ref_image_0
第二视角或场景图 → ref_image_1
```

### 参考视频

Blender 白模参考视频最终接入：

``` text
ref_video_0
```

- 从ref_video_0拉出节点，搜索获取视频
- 获取视频节点拉出，搜索加载视频，上传
### Prompt 
工作流中的：

``` text
Input Text (Prompt)
```

就是提示词输入位置。

### Blender 白模视频如何输入 H3

`.mp4` 不能直接当作 IMAGE 接入
`ref_video_0`。需要先读取视频，再提取视频帧。


最终结构：

``` text
Blender 白模 MP4
        ↓
    【加载视频】
        │ VIDEO
        ↓
  【获取视频元素】
        │
        ├── images ─────────→ H3 `ref_video_0`
        ├── audio
        ├── fps
        ├── bit_depth
        └── color_space
```


## 8. 本次最终工作流逻辑

``` text
参考图1 ─────────────────→ ref_image_0
参考图2 ─────────────────→ ref_image_1

Blender 白模 MP4
       ↓
    加载视频
       ↓ VIDEO
   获取视频元素
       ↓ images
       └──────────────────→ ref_video_0

Prompt
       └──────────────────→ H3 Conditioning

                         ↓
                  MiniMax H3 R2V
                         ↓
                      Sampling
                         ↓
                     VAE Decode
                         ↓
                     创建视频
```

### 视频时长

工作流中的：

``` text
Float (Duration)
```

控制目标生成时长。

## 反思

当前 H3 R2V 可以作为后续研究的基础 Baseline。

### Baseline 1

``` text
Prompt + Reference Image
        ↓
      H3 R2V
```





### Baseline 2

``` text
Prompt + Reference Image + Blender RGB Reference Video
        ↓
      H3 R2V
```





### 后续结构化控制

``` text
Blender
├── RGB
├── Depth
├── Mask
├── Pose
└── Camera Trajectory
        ↓
结构化条件融合/注入
        ↓
视频生成模型
```

真正值得研究的问题不是"怎样把 Blender 视频输入 H3"，而是：

> **怎样让视频生成模型更加精确地遵循 Blender
> 预演提供的空间、动作、时间和相机约束，同时保持人物身份、时序一致性和视觉质量？**

后续可重点研究：

-   RGB 条件编码；
-   Depth 注入；
-   Mask/Segmentation 注入；
-   Pose/Skeleton 注入；
-   Camera Trajectory 显式表示；
-   多条件融合；
-   条件强度调节；
-   时序一致性；
-   长视频分段连续生成；
-   人物身份保持。



