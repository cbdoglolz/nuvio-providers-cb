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

## 当前进度（截至 2026-05-30，repo 版本 1.1.7）

### 多 provider 修复批次（进行中，按推荐顺序：动画/中文优先）

进度表见 Canvas：`~/.cursor/projects/c-Users-cbdog-Documents-New-project-nuvio-providers-cb/canvases/providers-fix-plan.canvas.tsx`

- [x] **animepahe `1.0.2-cb2`**：后端探活全部正常；修电影标题匹配（原来要求完全相等→改 normalize+子串+优先Movie+回退原名搜索）、TV 验证失败回退首结果。**kwik 提取未能本地验证**（shell 直连这些域名会卡、WebFetch 会把 HTML 转 markdown 丢 data-src），若真机不能播需专查 kwik。
- [ ] moviebox（中文）/ vidnest-anime / vixsrc / dooflix / animekai / moviesmod —— 待办

排查工具备忘：动画后端探活可用 WebFetch 打这些（已确认活）：
- 搜索: `https://animepaheproxy.phisheranimepahe.workers.dev/?url=https://animepahe.pw/api?m=search&l=8&q=<名>`（注意 & 要按需转义）
- 映射: `https://id-mapping-api-malid.hf.space/api/resolve?id=<imdb>&s=<S>&e=<E>`

---

## 历史进度（4KHDHub 等，repo ≤ 1.1.6）

已完成的 fork 改动（见 CHANGELOG）：

1. repo 名改为 `cbrepo`，manifest 顶层版本到 `1.1.4`
2. **4KHDHub `1.0.8-cb6`** — 移植 Cloudstream FourKHDHub 解析（HubDrive/HubCloud/HubCDN/Hblinks/Pixeldrain/BuzzServer）+ HubDrive 直链。**seek 问题仍未完全解决**（见下方「技术要点」与「seek 现状」）。
3. UHDMovies `1.2.2-cb2` — 标题搜索 fallback + 参照 Cloudstream 重写 TV 集解析
4. AnimePahe `1.0.1-cb1` — 日漫 TV 集 fallback
5. 首批版本号 bump：Vixsrc / Vidlink / StreamFlix / DooFlix / HDHub4u 等

## 技术要点：4KHDHub seek 修复

### cb5（真正的修复，2026-05-29）—— 走 HubDrive 直链，绕开 Cloudflare

用浏览器对真实片源（鬼灭之刃 无限城 / Demon Slayer Infinity Castle）实测得出：

- **HubCloud 域名 `hubcloud.foo` 挂在 Cloudflare Turnstile 后面**，Nuvio 的普通 `fetch` 过不去 → 旧的 HubDrive→HubCloud 路由拿到的是非可 seek 链接，所以 cb4 没解决问题。
- **HubDrive 有一条纯 fetch 可用、且终点可 seek 的路径**：
  1. HubDrive 链接形如 `https://hubdrive.space/file/<id>`；`<id>` 从路径取（或页面 `<div id="down-id">` 取）。
  2. `POST https://hubdrive.space/ajax.php?ajax=direct-download`，header 含 `Content-Type: application/x-www-form-urlencoded` + `X-Requested-With: XMLHttpRequest` + `Referer`=file 页，body `id=<id>`。
  3. 返回 JSON：`data.gd` = `https://pub-xxxx.r2.dev/<hash>`（Cloudflare R2 直链 `.mkv`，**支持 Range、可 seek**，实测 HTML5 video `canSeek=true`）；`data.n`=文件名、`data.s`=字节数。
  4. 已确认：无需 cookie/token，连续请求 `gd` 稳定。
- 实现见 `providers/4khdhub.js` 的 `extractHubDrive()`；`extractResolvedLink` 里 HubDrive 优先走它，失败才回退 HubCloud。

### cb4（保留，作为 HubCloud 那条路的兜底）

`resolveFinalLink(rawUrl, depth)`：把 HubCloud 按钮的中间跳转端点解析成最终直链——
- `gamerxyt.com/360news4u.net 的 dl.php?link=` → `decodeURIComponent` 取内嵌 URL
- pixeldrain `/u/<id>` → `api/file/<id>?download`
- `*.workers.dev/?id=` / `*.fans/?id=` → `redirect:"manual"` 跟随 302（≤5 跳）
- `googleusercontent` / `r2.cloudflarestorage.com` / `r2.dev` → 原样
- BuzzServer / HUBCDN 不动

`getSeekScore`：R2/googleusercontent=100、Pixeldrain=95、未解析中间端点=15（垫底标 `No Seek?`）。

## seek 现状（重要，cb6 更新）

真机测试结论，**和最初假设不同**：

- ✅ 缓存机制没问题：升 provider version + repo version 后，Nuvio 能正确重新拉到新代码（真机已看到 `HubDrive` 源出现，说明 cb5 已生效）。
- ❌ seek 仍未解决，但**不是「Nuvio 拖不动 MKV」**：真机上「KPop Demon Hunters」里一个 **DownloadFile** 源**可以正常快进**，证明 Nuvio 能 seek，**能不能 seek 取决于具体源/主机，且无法从 URL 预测**。
- 「鬼灭之刃 无限城」上出现的 FSL + HubDrive(r2.dev) 两个源都不能 seek，拖动回片头、还会闪 1 秒；但同一逻辑下别的片的 DownloadFile 能 seek。
- 之前 cb4/cb5 加的 `Seek OK/No Seek?` 标签被证明不准（DownloadFile 被错标 No Seek 却能拖），cb6 已移除，改为按清晰度排序、清楚标主机名，让用户自己试。
- 旁证：Cloudstream 播这些源时开头要「点一下跳过」且能拖，说明它的播放器/流程对 MKV seek 处理更完整。

**下一步排查方向（给接手者）**：
- 需要真机抓到「鬼灭之刃」各源**实际播放的最终 URL**（看 Nuvio 日志），确认 r2.dev/FSL 到底解析成了什么、Content-Type、是否 200 vs 206。
- 对比「能 seek 的 DownloadFile 源」最终 URL 主机 vs「不能 seek 的源」，找出可 seek 主机的规律（疑似 googleusercontent/Google Drive 可 seek、某些 r2.dev 在 Nuvio 里不行）。
- 研究 Cloudstream 播放器为何能 seek（是否播放前读取 MKV 末尾 Cues / 用了特定 ExoPlayer flag），看 Nuvio 端是否有对应设置。
- ⚠️ 不要再用浏览器在后台自动播放整部 3GB 视频做 seek 测试（之前误开 pixelsee.app 播放器标签页，吵且重复下载）。要测 Range 用 `fetch(url,{headers:{Range:'bytes=0-100'}})` 看 status/headers 即可，别真播。

## 待真机验证（下一步第一件事）

- [ ] 在 Nuvio 里把 cbrepo 刷新到 `1.1.5`，播放 4KHDHub 的「鬼灭之刃 无限城」等片源，**测试快进是否还跳回开头**（预期：HubDrive 那条 R2 直链可正常 seek）
- [ ] 如果 Nuvio 里看到的源名是 `4KHDHub - HubDrive ...`、URL 是 `*.r2.dev/...` 就对了
- [ ] 若仍不行：抓 Nuvio 日志看实际播放的 URL；如果不是 r2.dev，说明详情页那条 HubDrive 链接没被正确识别/解析，需要看详情页 HTML 里 HubDrive 按钮的真实 href
- [ ] 注意 r2.dev 的 `gd` 可能有时效（响应里有 `t` 时间戳）；getStreams 每次重新生成，正常播放无碍，但若「加入列表后过很久再播」失效属预期

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
