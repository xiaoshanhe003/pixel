# Aseprite 对标分析报告

日期：2026-04-17

## 目的

基于当前 `Pixel Forge` 代码库，对照 `Aseprite` 的产品能力、源码结构和交互设计，梳理：

- 我们已经具备的基础能力
- 还没有实现的重要功能
- 哪些结构设计值得借鉴
- 哪些交互细节最值得落地
- 下一阶段更合理的实现优先级

参考来源：

- 当前仓库代码：`src/*`、`docs/*`
- Aseprite GitHub 仓库：<https://github.com/aseprite/aseprite>
- Aseprite 文档：
  - <https://www.aseprite.org/docs/>
  - <https://www.aseprite.org/features/>
  - <https://www.aseprite.org/docs/animation/>
  - <https://www.aseprite.org/docs/onion-skinning/>
  - <https://www.aseprite.org/docs/selecting/>
  - <https://www.aseprite.org/docs/move-selection/>
  - <https://www.aseprite.org/docs/layers/>
  - <https://www.aseprite.org/docs/tags/>
  - <https://www.aseprite.org/docs/tilemap/>
  - <https://www.aseprite.org/docs/slices/>
  - <https://www.aseprite.org/docs/cli/>
  - <https://www.aseprite.org/docs/workspace/>
  - <https://www.aseprite.org/docs/preview-window/>
  - <https://www.aseprite.org/docs/customization/>

## 当前产品定位判断

当前 `Pixel Forge` 更接近“浏览器内的多场景像素图案工作台”，而不是完整意义上的 sprite editor。

从代码上看，现有核心已经包含：

- 单文档编辑模型
- 图层
- 帧
- 基础绘制工具
- 撤销 / 重做
- 像素模式播放预览
- 拼豆和钩织的领域化分析与打印输出

对应主干文件：

- `src/hooks/useStudioApp.ts`
- `src/utils/studio.ts`
- `src/utils/studioCommands.ts`
- `src/components/PixelGrid.tsx`
- `src/components/StudioCanvasStage.tsx`
- `src/components/StudioRightDock.tsx`

这说明我们已经不是单纯“图片转像素”的工具，而是有了编辑器雏形。

但和 Aseprite 相比，当前产品还缺少完整编辑器最关键的三层能力：

- 时间轴语义
- 选区与变换工作流
- 文件与自动化能力

## 已有能力 vs Aseprite

### 已有基础能力

当前仓库已经实现或部分实现：

- 图层基础操作：新建、复制、删除、合并、重命名、显示隐藏、锁定、不透明度、拖拽排序
- 帧基础操作：新建、复制、删除、选择、播放
- 直接网格编辑：画笔、橡皮、填充、直线、矩形、取色、移动视图
- 多尺寸笔刷预览
- 历史记录：撤销、重做、基础快捷键
- 图片导入并转成像素网格
- bead / crochet 的领域分析
- beads / crochet 的打印导出视图

### 与 Aseprite 的核心差距

Aseprite 的 README 和文档里强调的核心能力包括：

- layers + frames 作为独立概念
- 实时动画预览
- onion skinning
- indexed / RGBA / grayscale 颜色模式
- sprite sheet / GIF / image sequence 导入导出
- layer groups
- reference layers
- 选区、变换、移动内容
- tags
- tilemap / tileset
- slices / 9-slice / pivot
- scripting / extensions / CLI
- 可自定义快捷键和工作区

其中对我们最重要的不是“全都做”，而是先补齐那些能显著提升编辑器完成度的部分。

## 还没实现的重要功能

下面按“最值得补”的程度排序。

### 1. Onion Skin

这是当前像素动画模式最明显的缺口。

现状：

- 已有帧列表和播放
- 播放会通过切换 `activeFrameId` 推进
- 没有前后帧叠加预览

问题：

- 用户在做逐帧动画时，没有前后帧参照
- 播放行为直接切当前编辑帧，会打断编辑上下文

为什么值得做：

- 这是 Aseprite 动画体验的核心能力之一
- 比继续堆绘图工具，更能提升像素动画可用性

建议实现：

- 引入 onion skin 配置：
  - previous frame count
  - next frame count
  - tint mode / alpha mode
- 在 `composeFrame()` 基础上额外生成预览叠层
- 播放状态和当前编辑帧解耦

### 2. 帧级语义：单帧时长、Tags、播放方向

现状：

- 只有全局 `previewFps`
- 没有单帧时长
- 没有标签动画段
- 没有 ping-pong / reverse

而 Aseprite 的动画系统强调：

- 每帧可独立时长
- tag 可以表示一个动画片段
- tag 有播放方向

为什么值得做：

- 当前帧系统只是“帧列表”
- 做到 tag 后，像素模式才会从“草稿帧条”变成真正动画时间轴

建议实现：

- 给 `StudioFrame` 增加 `durationMs`
- 给 `StudioDocument` 增加 `tags`
- 支持：
  - forward
  - reverse
  - ping-pong
- 预览时可选择：
  - 全部帧播放
  - 指定 tag 播放

### 3. 选区与变换工作流

这是目前编辑器层最关键但完全缺失的一块。

现状：

- 没有 marquee selection
- 没有 add / subtract / intersect 选区模式
- 没有移动选区内容
- 没有 transform
- 没有 flip / rotate / scale

为什么重要：

- Aseprite 的很多高级操作不是靠“更多工具按钮”完成，而是靠“选区 + 变换”
- 没有选区，用户只能逐像素重画，效率上限很低

建议实现顺序：

1. 矩形选区
2. 移动选区内容
3. 水平 / 垂直翻转
4. 缩放
5. 旋转
6. 选区加减交

### 4. 像素模式的真实导出

现状：

- `SCENARIOS` 常量里写了像素模式支持 `PNG / GIF / Sprite Sheet`
- 实际右侧导出面板只覆盖 `beads / crochet`
- `pixel` 场景没有真正导出流程

这是当前产品定义和实现之间最明显的不一致。

建议至少先补齐：

- 导出当前帧 PNG
- 导出所有帧 PNG sequence
- 导出 GIF
- 导出 Sprite Sheet
- 导出 JSON metadata

### 5. 保存 / 打开 / 持久化 / Autosave / 恢复

现状：

- 主要是运行时内存态
- 没有正式工程文件格式
- 没有 autosave
- 没有 crash recovery

而 Aseprite 文档明确强调：

- 保存完整工作文件
- 导出发布格式
- 数据恢复

这对你们尤其重要，因为当前文档模型已经足够复杂，不持久化会限制后续所有能力。

建议实现：

- JSON 项目格式
- local storage autosave
- 最近项目
- 恢复未保存会话

## 中优先级但很值得借鉴的功能

### 图层组

现状只有平铺图层栈，没有 group layer。

价值：

- 用于管理复杂对象
- 是后续 reference layer、批量操作的前提

### Reference Layer

Aseprite 有 reference layer 用于描摹和辅助参考。

对你们的意义：

- 拼豆和钩织场景也能用
- 可以把原图、草稿轮廓、标尺放进非编辑图层

### Indexed Palette 语义

当前你们有 palette，但更多是“结果色板”，不是像 Aseprite 那种完整 indexed 模式语义。

后续如果要强化像素模式，应该逐步区分：

- RGBA 编辑
- Palette constrained editing
- Indexed remap

### 独立预览窗

Aseprite 有 preview window，编辑和播放解耦。

对你们的意义：

- 动画播放不会抢当前编辑帧
- 也更适合后续 tag 播放和 onion skin 共存

### 图像序列导入

Aseprite 可以把连续 PNG 打开为动画。

这对动画用户非常有价值，且实现成本相对可控。

## 低优先级或不建议近期对齐的能力

这些是 Aseprite 的完整编辑器能力，但未必适合当前产品近期路线。

### Tilemap / Tileset

Aseprite 把 tilemap 作为专门图层类型处理。

是否要做：

- 如果未来重点是游戏地图、重复图块场景，值得做
- 如果还是以像素图案 / 拼豆 / 钩织为主，优先级低

### Slices / 9-slice / Pivot

更偏游戏资源生产工具链。

是否要做：

- 如果未来要导出 UI 资源、角色锚点、切片数据，可以做
- 否则不是近期核心

### Lua Scripting / Extensions / Themes

这是 Aseprite 很强的一层生态能力，但前提是命令系统和数据模型非常稳定。

对当前阶段来说，做太早会放大维护成本。

### Pressure / Symmetry / Custom Brushes / Pixel Perfect / Shading Ink

这些属于绘图专业能力增强。

在当前阶段：

- 它们的价值低于选区 / 变换 / 导出 / 持久化
- 其中 `pixel perfect` 可以以后作为铅笔模式增强考虑

## 最值得借鉴的源码结构

Aseprite 的源码最值得学的是分层方式，而不是具体语言实现。

其 `src/README.md` 把结构拆成大致几层：

- `doc`：文档模型
- `render`：渲染
- `ui`：控件系统
- `view`：时间轴等视图层
- `undo`：历史命令
- `app`：应用编排

这个结构的核心价值是：

- 文档模型稳定
- 命令系统可复用
- 渲染和 UI 解耦
- 视图层不直接污染模型层

### 当前仓库的结构优点

你们已经有不错的基础分离：

- `utils/studio.ts` 承担大量纯文档变换
- `utils/studioCommands.ts` 提供命令与历史
- `hooks/useStudioApp.ts` 做编排
- `components/*` 基本承担界面显示和交互

### 当前仓库的结构风险

目前几个职责开始挤在一起：

- 文档模型
- 历史
- 派生状态
- 播放逻辑
- 场景切换
- 输出逻辑
- 文件输入副作用

主要集中在：

- `src/hooks/useStudioApp.ts`
- `src/utils/studio.ts`

这在现阶段可控，但如果继续加：

- 保存 / 打开
- 选区
- transform
- tag
- onion skin
- autosave

就容易变成一团。

### 建议的结构演进方向

建议逐步拆成下面这些模块：

#### 1. `doc`

只负责纯文档模型和不可变变换：

- document
- frame
- layer
- cel / grid
- selection
- tag

#### 2. `commands`

统一所有可撤销动作：

- paint
- erase
- fill
- line
- rectangle
- selection move
- transform
- frame ops
- layer ops

#### 3. `timeline`

独立处理：

- active frame
- frame duration
- tags
- playback range
- onion skin settings

#### 4. `render`

负责：

- frame compose
- onion skin compose
- export bitmap generation
- preview generation

#### 5. `exporters`

按场景拆：

- pixel exporter
- beads exporter
- crochet exporter

#### 6. `workspace/app`

处理：

- route / surface
- project open / save
- autosave
- recent files
- user preferences

## 最值得借鉴的交互细节

### 1. 时间轴是一等公民

Aseprite 的 frame / layer / cel 是统一在时间轴里理解的，而不是拆成几个分散面板。

当前你们的结构是：

- 底部帧条
- 右侧图层面板

这对轻量版本是成立的，但随着动画能力增强，会越来越不够。

建议：

- 短期保持现状
- 中期做统一 timeline 视图

### 2. Context-sensitive controls

Aseprite 很多参数不是固定塞在侧边栏，而是在工具激活后出现在 context bar。

当前左侧栏长期承载：

- 工具
- 上传
- 转换参数

问题：

- 编辑中可见信息过多
- 工具态和导入态混在一起

建议：

- 把“工具当前参数”上移到顶部 context strip
- 左侧栏逐步聚焦为工具选择和资产入口

### 3. Modifier 语法比新增工具更重要

Aseprite 大量交互依赖修饰键：

- selection add / subtract / intersect
- shape constrain
- move auto-select layer

值得借鉴的不是快捷键本身，而是交互哲学：

- 优先扩展已有工具语义
- 少造新按钮

### 4. 预览不能打断编辑

Aseprite 的 preview window、onion skin、timeline play 都是围绕这个原则。

当前像素模式播放会改 `activeFrameId`，意味着：

- 播放即切编辑上下文
- 未来加 onion skin 会更别扭

建议：

- 编辑帧状态和预览播放状态分离

### 5. 命令系统要覆盖所有动作

Aseprite 的快捷键自定义、脚本、CLI 之所以成立，是因为大多数动作都能抽象成命令。

当前你们已经有命令系统，但覆盖面还偏“基础绘制 + 图层 + 帧”。

建议后续新增功能都走命令层，不要绕开历史系统直接改文档。

## 与当前产品方向最匹配的实现优先级

这里按“投入产出比”排序。

### P0

- 像素模式真实导出：PNG / GIF / Sprite Sheet / JSON
- Onion skin
- 编辑帧与播放状态解耦

### P1

- 单帧时长
- Tags
- 选区
- 移动选区内容
- Flip / Resize

### P2

- 保存 / 打开 / autosave / 恢复
- 图层组
- reference layer
- 图像序列导入

### P3

- indexed palette 模式增强
- 独立预览窗
- 自定义快捷键

### P4

- slices / pivot
- tilemap / tileset
- 插件 / 脚本体系

## 建议的产品判断

不建议把目标定义成“做一个 Web 版 Aseprite”。

更合理的路线是：

- 在像素模式上吸收 Aseprite 最关键的编辑器能力
- 保持 beads / crochet 的领域特色
- 让产品成为“像素图案工作台 + 轻量像素动画编辑器”

这样能避免两类风险：

- 一味追全量 Aseprite，路线被拖入大而全编辑器
- 只保留当前 pattern studio 形态，像素模式又长期停留在半成品

## 建议的下一步

如果按本报告推进，下一阶段最合理的实施顺序是：

1. 先补齐 `pixel export`
2. 再做 `onion skin + preview state 解耦`
3. 然后做 `frame duration + tags`
4. 再上 `selection + move + transform`
5. 最后补 `save/open/autosave`

这个顺序的好处是：

- 每一步都能显著提升产品完成度
- 不会过早引入 tilemap、插件系统这类大工程
- 能保持当前多场景产品主线不失控

## 总结

当前 `Pixel Forge` 已经具备“编辑器雏形”，但距离 Aseprite 级别的完整 sprite editor 还差关键骨架。

最值得借鉴 Aseprite 的，不是某个具体工具，而是：

- 时间轴是一等公民
- 选区与变换是核心工作流
- 播放与编辑解耦
- 文档、命令、渲染、视图要分层
- 导出、保存、恢复是完整工作流的一部分

对当前项目最现实的路径不是照抄 Aseprite 全功能，而是优先吸收这些“高杠杆能力”，把像素模式补成真正可用的轻量编辑器，同时继续保持拼豆和钩织的领域优势。
