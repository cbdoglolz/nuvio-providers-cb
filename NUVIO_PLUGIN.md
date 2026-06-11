# cbrepo — Nuvio 插件说明（不是 CloudStream）

本仓库是 **Nuvio 插件（Plugin）**，格式与 [yoruix/nuvio-providers](https://github.com/yoruix/nuvio-providers) 官方模板一致，**不是** CloudStream 的 `repo.json` / `.cs3` 扩展。

开发规范见官方文档：[Nuvio Provider Development Guide](https://github.com/yoruix/nuvio-providers/blob/template/DOCUMENTATION.md)

---

## 1. 在 Nuvio 里怎么添加（唯一正确方式）

1. 打开 **Nuvio → 设置 → Plugins（插件）**
2. **添加插件 URL**（不要用 `@main`，不要用 CloudStream 仓库地址）：

```
https://cbdoglolz.github.io/nuvio-providers-cb/manifest.json
```

3. 保存后 **删除旧 cbrepo 再添加一次**（避免缓存旧 manifest）
4. 在插件里 **启用** 需要的源（Provider）
5. 确认 manifest 版本号与仓库一致（当前见 `manifest.json` 顶层 `version`）

自检：浏览器打开  
`https://cbdoglolz.github.io/nuvio-providers-cb/providers/moviebox.js`
应包含字符串 **`__CB_REPO_NUVIO_PATCHED__`**（真机用的就是这份 JS，不是 GitHub `main` 上未 patch 的源码）。

---

## 2. 和 CloudStream 的区别

| | **Nuvio cbrepo** | **CloudStream Phisher 等** |
|---|------------------|----------------------------|
| 订阅文件 | `manifest.json` | `repo.json` |
| 代码 | JavaScript `providers/*.js` | Kotlin 编译插件 |
| 添加位置 | Nuvio → Plugins | CloudStream → 扩展仓库 |
| 能否直接互用 | **不能** | **不能** |

没有「把 CS 仓库 URL 贴进 Nuvio」的一键方案；只能使用已移植好的 **Nuvio 版** `providers/*.js`（本仓库）。

---

## 3. 本仓库相对官方 yoruix 的源

fork 自官方结构，保留 `build.js`、`src/` 多文件构建、Hermes 下 **禁止直接写 async**（需 `node build.js` 打包）。

| 源 | 建议 | 说明 |
|----|------|------|
| **StreamFlix** | 开 | 稳定 API，多清晰度 |
| **MovieBox** | 开 | 对齐 CNC `api3.aoneroom.com`，中文字幕优先 |
| **HDHub4u** | 开 | 印度区片源，可能较慢 |
| **4KHDHub** | 开 | 直链 MKV；Hub 走 `hubcloud.one` 镜像 |
| **Vidlink / Vixsrc** | 开 | 在线 m3u8 |
| **CineStream** | 开 | CSX 聚合：Vidflix / Playsrc / Hexa / Xpass / Videasy API（不是完整 CS 版 50+ 源） |
| **CNCVerse** | 默认关 | 镜像限流，易出现约 10 分钟提示片 |
| **UHDMovies** | 默认关 | 下载页仅 Hrefli 链，服务器侧常被 CF 挡 |
| **MoviesMod** | 视网络 | 易 403 |
| KickassAnime / YFlix 等 | 按需 | 见 manifest `limited` |

---

## 4. 真机仍「全部搜不到」时

1. 确认订阅的是 **GitHub Pages `manifest.json`**（见上文）
2. 看 Nuvio 日志是否有 **`[cbrepo:源名]`**：
   - `getStreams id=tt…` → 已收到 IMDb，正在转 TMDB
   - `returned N stream(s)` → 该源有结果
   - `No valid TMDB id` → 元数据/ID 问题
3. 用 **Plugin Tester**（需 debug 版 Nuvio）：
   - 电脑在本仓库执行 `npm start`
   - 手机同 WiFi，填入 `http://你的电脑IP:3000/manifest.json`
   - 详见官方 DOCUMENTATION §7.2

---

## 5. 开发者：构建与发布

```bash
npm install
node build.js hdhub4u          # 从 src/hdhub4u 打到 providers/hdhub4u.js
node build.js --transpile foo   # 单文件 async 转译
npm start                     # 本地 HTTP 给 Plugin Tester
```

推送 `main` 后 CI 会：复制 `providers/*.js` → **patch**（Nuvio 兼容层）→ 发布到 **`gh-pages`** → 刷新 jsDelivr。

本地测「真机行为」：

```bash
npm run test:patched
```

（会复制到 `_site/providers` 并打 patch，模拟 App 加载。）

---

## 6. 参考链接

- 官方插件仓库：https://github.com/yoruix/nuvio-providers  
- 你的 fork：https://github.com/cbdoglolz/nuvio-providers-cb  
- 版本与 CDN 说明：[NUVIO_SYNC.md](./NUVIO_SYNC.md)
