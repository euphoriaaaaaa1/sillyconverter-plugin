# sillyconverter-plugin 修复清单

SillyTavern EPUB 导出器插件（聊天记录 + 图片 → EPUB）。备份仓库：https://github.com/euphoriaaaaaa1/sillyconverter-plugin

## 状态

- 备份：改动前已存 `index.js.bak`，可回退。
- **根因（2026-07-06 补）**：此目录原本只有 `index.js`、**缺 `manifest.json`**，所以 SillyTavern 从不加载它，扩展列表里也看不到——一直是死的。已补上 `manifest.json`（display_name「EPUB 导出器」），刷新后应出现在列表。
- 版本头写的是 2.0.0，`index.js` 原有致命 bug（导出即崩溃），已修，见下。

## 已修（2026-07-06，语法检查通过，待 SillyTavern 内实测）

- [x] **P0-1 导出即崩溃**：`onExportClick` 读的 checkbox ID `include-user-messages` 等改为面板实际的 `epub-include-user` 等。
- [x] **P0-2 EPUB 图片 manifest 错乱**：`generateContentOpf` 改为遍历 `imageMap.values()`（真实文件名），过滤下载失败的 null，media-type 由扩展名正确推断。
- [x] **P1-1 未转义的 `&` 破坏 XML**：`extractTextContent` 删掉 `&lt;/&gt;/&amp;` 等手动反转义，只保留 `&nbsp;→空格`，实体保持转义。
- [x] **P2-1 unwantedSelectors 过度激进**：移除 `.container/.box/.card/.item/.wrapper` 等超通用类名，避免误删正文。

- [x] **悬浮球点击无反应**：①拖拽逻辑把普通点击误判为拖拽结束（加 5px 阈值区分）②面板 CSS `display:none !important` 压住开面板的 `display=block`（改用 `setProperty(...,'important')` + computed style 判可见性）。
- [x] **所见即所得**：`getChatMessages` 改为优先读页面可见 DOM（`#chat .mes` 的 `.mes_text` 渲染后 innerHTML）——即正则切除+markdown 渲染后、你眼睛看到的文字和图片；拿不到才回退 window.chat 原文。新增 `htmlToXhtml()` 用 DOMParser+XMLSerializer 把渲染 HTML 规整成合法 XHTML。

> 改动共约 134 行 diff，回退：`cp index.js.bak index.js`
> 已知边界：只导出「消息正文 `.mes_text`」里的内容与内联图片；若某图是作为「附件图 `.mes_img`」挂在正文外，当前不含。实测若发现缺这类图再补。

## 验证方式

修完在 SillyTavern 里点悬浮球 → 导出 EPUB → 用阅读器打开，确认：聊天文字完整、图片在原文字位置、无解析报错。

## 后续

- 测通过后 `git init` 推到备份仓库。
- server.js（9876 端口那个老项目）功能已被本插件取代，可退役。
