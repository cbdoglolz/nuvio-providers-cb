# 交接说明 (HANDOFF)

> 这份文档用于在 Codex / Cursor 之间来回交接，保证换人后能立刻接着做。
> **每次有进展都更新本文件**（尤其是「当前进度」「下一步」「待真机验证」三节）。

## 项目概况

- 这是 `nuvio-providers` 的 fork，本地路径：`C:\Users\cbdog\Documents\New project\nuvio-providers-cb`
- 远端：`origin` = `https://github.com/cbdoglolz/nuvio-providers-cb.git`（你的 fork）；`upstream` = `https://github.com/yoruix/nuvio-providers.git`
- 目标：修复 / 增强 Nuvio 各 provider，**重点参考 Cloudstream 插件** `https://github.com/phisher98/cloudstream-extensions-phisher`
- Nuvio app 通过 GitHub raw 拉取插件，**改动必须 push 到 fork 后才能在真机测试**

## 关键约定（每次更新都要做）

1. 升 `manifest.json` 顶层 `version`
2. 升对应 provider 的 `version`（fork 改动用 `-cbN` 后缀，例如 `1.0.6-cb4`）
3. 在 `CHANGELOG.md` 顶部追加本次改动条目
4. 提交信息用简短英文祈使句（对齐仓库历史风格，如 `Port Cloudstream 4KHDHub extraction flow`）

## 构建方式（重要，容易踩坑）

- `4khdhub.js`、`uhdmovies.js`、`vixsrc.js` 等**没有 `src/` 源目录，直接改 `providers/` 里的单文件**（虽然文件头写着 "Built from src/"，但 src 不存在）。保持已转译的 `__async`/`yield` 写法以兼容 Hermes。
- `hdhub4u`、`dooflix`、`animepahe`、`cinemacity`、`mycima`、`allmovieland`、`movieblast`、`netmirror` 有 `src/<name>/` 源目录，改完要 `node build.js <name>` 重新生成 `providers/<name>.js`。
- 本地校验（无网络也能跑）：
  - `node --check providers/<name>.js`
  - `node -e "require('./providers/<name>.js')"`
- 本地环境连不上 TMDB / GitHub / 目标站点，`fetch` 会失败，**端到端必须在真机 Nuvio 里测**。

## 当前进度（截至 2026-05-29，repo 版本 1.1.4）

已完成的 fork 改动（见 CHANGELOG）：

1. repo 名改为 `cbrepo`，manifest 顶层版本到 `1.1.4`
2. **4KHDHub `1.0.6-cb4`** — 移植 Cloudstream FourKHDHub 解析（HubDrive/HubCloud/HubCDN/Hblinks/Pixeldrain/BuzzServer），并**修复快进跳回开头（无法 seek）问题**：见下方「技术要点」
3. UHDMovies `1.2.2-cb2` — 标题搜索 fallback + 参照 Cloudstream 重写 TV 集解析
4. AnimePahe `1.0.1-cb1` — 日漫 TV 集 fallback
5. 首批版本号 bump：Vixsrc / Vidlink / StreamFlix / DooFlix / HDHub4u 等

## 技术要点：4KHDHub seek 修复（cb4）

- **根因**：HubCloud 下载页按钮（FSL / Download File / S3 等）指向的是**中间跳转端点** —— `gamerxyt.com/dl.php?link=`、`360news4u.net/dl.php?link=`、`*.workers.dev/?id=`、`*.fans/?id=`、pixeldrain `/u/<id>`。这些端点不支持 HTTP Range，播放器一 seek 就重拉、从头播放。
- **修复**：参照本仓库里能正常 seek 的 `providers/dvdplay.js` 的 `resolveHubCloudUrl`，在 `providers/4khdhub.js` 新增 `resolveFinalLink(rawUrl, depth)`，返回流之前把中间链接解析成**最终真实直链**：
  - `dl.php?link=` 包装 → 取出内嵌真实 URL（`decodeURIComponent`）
  - pixeldrain `/u/<id>` → `https://pixeldrain.net/api/file/<id>?download`
  - `*.workers.dev/?id=` / `*.fans/?id=` → `redirect:"manual"` 手动跟随 302（最多 5 跳）
  - 已是直链的 `googleusercontent` / `r2.cloudflarestorage.com` / `r2.dev` → 原样保留
  - BuzzServer / HUBCDN **不动**，仍走各自原有解析器（在 `extractHubCloud` 返回前按 source 跳过）
- **seek 评分** `getSeekScore`：已解析直链(googleusercontent/R2)=100，Pixeldrain=95，未解析的中间端点(`workers.dev/?id=`、`dl.php?link=`)=15（垫底并标 `No Seek?`）。

## 待真机验证（下一步第一件事）

- [ ] 在 Nuvio 里把 cbrepo 刷新到 `1.1.4`，播放 4KHDHub 源，**测试快进是否还会跳回开头**
- [ ] 若仍有不可 seek 的源：看它的 `name` 里是不是 `No Seek?`；如果可 seek 的源(googleusercontent/R2/Pixeldrain)排在前面但仍跳，需进一步抓该最终直链的响应头确认是否真支持 Range
- [ ] 若 `workers.dev/?id=` 解析失败（仍返回中间链接），需要在真机抓一次该端点的真实响应，补全 `resolveFinalLink` 的解析分支

## 下一步优先级（4KHDHub 通过后）

- 继续修 UHDMovies / HDHub4u / StreamFlix / DooFlix（都对照 Cloudstream phisher 对应 provider）
- HDHub4u 走 `src/hdhub4u/`，改完记得 `node build.js hdhub4u`
- 已知历史问题：早期批次 The Boys S1E1 播放不了（尚未确认修复）

## Cloudstream 参考路径（phisher98 repo, master 分支）

- 4KHDHub：`FourKHDHub/src/main/kotlin/com/fourKHDHub/{Extractor,Utils,FourKHDHubProvider}.kt`
- HDHub4u：`HDhub4u/src/main/kotlin/com/hdhub4u/{Extractors,HDhub4uProvider,Utils}.kt`
- 其它站点：仓库根下各有同名插件目录 + `Extractor.kt`

## 杂项

- `.npm-cache/` 是未提交的本地缓存，忽略即可（不要提交）。
