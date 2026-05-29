# 交接说明 (HANDOFF) — 给 Codex

> 最后更新：**2026-05-30**，repo **`1.1.25`**，分支 **`main`**
> 远端：`https://github.com/cbdoglolz/nuvio-providers-cb`（Nuvio 添加 cbrepo 用此地址，**不是** README 里的 tapframe 上游）

---

## 1. 项目目标与用户偏好

- Fork `nuvio-providers`，参考 Cloudstream phisher：`https://github.com/phisher98/cloudstream-extensions-phisher`
- 用户优先：**动画**、**中文内容**；AnimeKai 是当前唯一能搜到最新新番的来源，必须保留并继续修
- 电影侧：**HDHub4u / UHDMovies / Vidlink** 是当前最靠谱组合
- 用户真机反馈（Project Hail Mary / TMDB `687163`）：
  - ✅ **HDHub4u** 能用
  - ❓ **UHDMovies** 曾报搜不到 → `1.2.2-cb4` 已加 `Project …` → 短标题回退；本地能出 8 条流，待用户再测
  - ❌ **MovieBlast** 有源不能播 → `1.0.1-cb1` 已修 headers + 去掉 m3u8 只留 mkv，待用户再测
  - ✅ **Vidlink** 能播；`Unknown` 标签 → `1.0.2-cb1` 已去掉
  - ❌ **NetMirror** 限流（10 分钟「访问过多」），**代码无解**；1.1.21 已按用户确认删除

---

## 2. 关键约定（每次改 provider 必做）

1. 升 `manifest.json` 顶层 `version`
2. 升对应 provider 的 `version`（fork 用 `-cbN` 后缀）
3. `CHANGELOG.md` 顶部追加条目
4. **push 到 origin/main** — Nuvio 从 GitHub raw 拉 manifest，不 push 用户看不到
5. 用户刷新 cbrepo：若一直旧版本，**删掉插件重新添加**（缓存 manifest）

### 构建方式

| 类型 | 改哪里 | 构建 |
|------|--------|------|
| 单文件 | `providers/4khdhub.js`, `uhdmovies.js`, `vixsrc.js`, `animekai.js`, `vidlink.js` 等 | 直接改，保持 `__async`/`yield`（Hermes） |
| 多文件 | `src/animepahe/`, `src/hdhub4u/`, `src/movieblast/` 等 | 改 `src/` 后 `node build.js <name>` |

本地自检：
```bash
node --check providers/<name>.js
node -e "require('./providers/<name>.js').getStreams('872585','movie',1,1).then(r=>console.log(r.length))"
```
加 `full_network` 权限；**不要用浏览器播大文件测 seek**，用 `Range: bytes=0-100` 看 206/headers。

---

## 3. Provider 状态总表（截至 1.1.24）

| Provider | 版本 | 状态 | 说明 |
|----------|------|------|------|
| **HDHub4u** | 1.1.2-cb1 | ✅ 已修 | 搜索 API 改为 `search.hdhub4u.glass`（原 pingora 403）。用户真机 Hail Mary OK |
| **UHDMovies** | 1.2.2-cb4 | ✅ 已修 | Instant Download：follow redirect 取 `url=` 直链；`Project X` 短标题搜索回退。本地 Oppenheimer 13 流、Hail Mary 8 流 |
| **MovieBox** | 1.1.3-cb3 | ✅ 电影 / ⚠️ TV | `resourceDetectors[].downloadUrl`；1.1.16 加 TMDB/original/Season aliases 聚合搜索。1.1.18 对 TV 空 `downloadUrl` 尝试抓 `resourceLink` 外页里的真实 mp4/mkv/m3u8 |
| **Vidlink** | 1.0.2-cb1 | ✅ 可用 | m3u8 多清晰度；去掉 size/quality 的 `Unknown` 显示 |
| **StreamFlix** | 1.0.1-cb1 | ✅ 本地 OK | Oppenheimer 4 流，待真机 |
| **MovieBlast** | 1.0.1-cb1 | ⚠️ 待验证 | 补 CDN headers、有 mkv 时跳过 m3u8；Hail Mary 本地 4 条 mkv 200 |
| **YFlix** | 1.1.2 | ⚠️ 待验证 | 本地有流，enc-dec 路线 |
| **4KHDHub** | 1.0.8-cb6 | ⚠️ seek 未解 | HubDrive→R2 直链已做；用户放弃继续追 seek；按清晰度排序 |
| **AnimePahe** | 1.0.2-cb5 | ⚠️ 待真机复测 | 搜索/MAL 映射加强：TMDB title aliases、Season/Nth Season 回退、验证 8 个 MAL 候选；Kwik 直连失败后走 AnimePahe proxy |
| **AnimeKai** | 1.1.3-cb5 | ⚠️ 待真机复测 | **能搜到新番、有源**；必须继续修。1.1.15 保留 MegaUp master playlist 作为 Auto fallback，同时保留解析出的清晰度 variant |
| **Vixsrc / MoviesMod** | Vixsrc 1.0.2-cb2 / MoviesMod 1.0.2-cb1 | ❓ 真机 | 1.1.20 加 `Cloudflare.solve()` 403/503 retry；数据中心 IP 仍可能 403，需真机验证 |
| **Dooflix** | removed in 1.1.21 | ❌ 已删除 | API key 轮换 401；用户确认后从 manifest/provider/src 删除 |
| **VidnestAnime** | removed in 1.1.21 | ❌ 已删除 | 旧 `backend.vidnest.fun` 后端失效；用户确认后从 manifest/provider 删除 |
| **NetMirror** | removed in 1.1.21 | ❌ 已删除 | 源站限流，10 分钟占位视频；用户确认后从 manifest/provider/src 删除 |
| **DVDPlay** | 1.0.3-cb1 | ⚠️ 匹配更安全 | 印度站；1.1.17 加年份硬过滤/惩罚，避免 Oppenheimer → Kara 2026 这类错片 |
| **Cinemacity** | removed in 1.1.21 | ❌ 已删除 | 依赖 stale site cookies，本地 0 流；用户确认后从 manifest/provider/src 删除 |
| **AllMovieLand** | 1.0.1-cb1 | ⚠️ 待真机 | 1.1.22 加 TMDB/original/Season aliases 聚合搜索，并给 search/doc/embed/file/playlist 请求加 Cloudflare.solve 403/503 retry |
| **DahmerMovies** | 1.0.2-cb1 | ⚠️ 待真机 | 1.1.23 加 TMDB original title / 标点归一化标题 fallback，并给 request helper 加 Cloudflare.solve 403/503 retry |
| **Cinevibe** | 1.0.1-cb1 | ⚠️ 待真机 | 1.1.24 电影源；加 original title / 标点归一化 fallback，并给 TMDB/API/HEAD 请求加 Cloudflare.solve 403/503 retry |

### 已评估、未 port 的来源

- **Consumet** 公网 API 已关；Gogo/HiAnime 封装也坏 → 不做
- **GogoAnime / HiAnime** 需从零 scraper + CF → 性价比低
- **KissKH** 需 kkey + 私有 BuildConfig → 不可 port
- **中文专用源**：repo 内仍无可靠 C 剧/国漫 provider

---

## 4. 主要 commit（从新到旧，1.1.12–1.1.24 为 Codex；1.1.25 为 Cursor 接续）

```
c6d3805 Improve Cinevibe title fallback and retry                       → 1.1.24
6b933e8 Improve DahmerMovies title fallback and retry                   → 1.1.23
2f61c1d Improve AllMovieLand search and retry                           → 1.1.22
aa86759 Remove disabled dead providers                                  → 1.1.21
e9fb000 Add Cloudflare retry for Vixsrc and MoviesMod                   → 1.1.20
a0e17c9 Add MovieBox TV resource page fallback                          → 1.1.18
7bcc938 Make DVDPlay matching year aware                                → 1.1.17
f2bcdab Re-enable AnimeKai and improve MegaUp HLS handling              → 1.1.13
61918c8 Fix MovieBlast, UHDMovies, Vidlink                              → 1.1.11
```

**Push 规则：** Codex 云端无法 `git push`（443 被拦）且 GitHub 连接器只读。改完 commit 后由 **Cursor 在本机**执行 `git push origin main`。

---

## 5. 真机测试清单（Codex 接手后优先问用户）

- [ ] cbrepo 版本是否 **1.1.25**（删插件重加）
- [ ] **Project Hail Mary**（687163）：UHDMovies / MovieBlast 修复是否生效
- [ ] **Vidlink** 分辨率旁是否还有 Unknown
- [ ] **Vixsrc** 住宅 IP 能否出流（本地 403）
- [ ] 动画：AnimeKai / AnimePahe 测 *Re:ZERO* S4 是否能搜到并播放

---

## 6. 技术备忘

### AnimeKai 不能播的根因（勿再盲目加 Referer）

1. 流来自 **MegaUp CDN**（`rrr.megaup.cc` 等），非 AnimeKai 直链
2. **每个 HLS 分片**都要 `Referer: https://megaup.cc/`；Nuvio 可能只对 manifest 带 headers
3. m3u8 路径含 **逗号**：`.../list,xxx.m3u8`，ExoPlayer 易解析失败
4. 链接 **短时效** token
5. 1.1.14 已尝试：直接解密 AnimeKai 返回的 MegaUp iframe，失败才抓中间 iframe；不再把 `list,*.m3u8` 的逗号编码为 `%2C`
6. 1.1.15 已尝试：返回 parsed variants 的同时保留 raw master playlist `Auto` fallback
7. 若仍失败，下一步才考虑 m3u8 proxy（类似 Vidnest proxy），或在真机日志里确认 Nuvio 是否给 HLS 分片带 headers

### AnimePahe

- Proxy 搜索正常：`animepaheproxy.phisheranimepahe.workers.dev`
- MAL 映射：`id-mapping-api-malid.hf.space`
- 1.1.15：`src/animepahe/` 已加入 TMDB title aliases + Kwik direct→proxy fallback，并手动同步到 `providers/animepahe.js`
- **Cursor 可正常** `node build.js animepahe` / `allmovieland`；Codex 沙箱常会 esbuild 路径权限失败，改 `src/` 后应用 Cursor rebuild 并提交 `providers/*.js`

### UHDMovies Instant Download（phisher 对齐）

- `GET cdn.video-gen.xyz/...` → redirect → `video-seed.pro/?url=<googleusercontent>`
- 从 **最终 response.url** 取 `url=` 参数，不要 POST 到 video-gen `/api`
- 代码：`providers/uhdmovies.js` → `extractInstantLink()`

### HDHub4u 搜索

- 用 **`https://search.hdhub4u.glass/collections/post/documents/search`**
- 不要用 `search.pingora.fyi`（403）
- 代码：`src/hdhub4u/index.js` → rebuild `node build.js hdhub4u`

### MovieBox

- 电影：`data.resourceDetectors[].downloadUrl`（206 MP4）
- TV：`downloadUrl` 经常为空，只有外部 `resourceLink` page
- 1.1.16：搜索侧已增强（TMDB title/original/no-space/punctuation/Season aliases），但 TV 播放仍取决于 API 是否给当前集 `downloadUrl`
- 1.1.18：TV 无 `downloadUrl` 时会抓 `resourceLink` 外页，只提取真实 `mp4/mkv/m3u8`；若页面是 JS 二次跳转或需交互，仍可能 0 流

### VidnestAnime

- 1.1.21：用户确认后已删除 `providers/vidnest-anime.js` 和 manifest entry
- 旧 provider 使用 `https://backend.vidnest.fun/...` JSON API，已失效
- 当前公开 Vidnest 文档是 iframe embed：`https://vidnest.fun/anime/[ANILIST_ID]/[EPISODE]/[SUB_OR_DUB]`
- Nuvio provider 需要直链，不应把 iframe URL 伪装成视频流；因此 1.1.16 默认关闭，后续要么抓 Next/chunk API，要么放弃

### 已删除 Provider（1.1.21）

- 删除 manifest entry + `providers/*.js`：`netmirror`, `vidnest-anime`, `dooflix`, `cinemacity`, `videasy`
- 额外删除源码目录：`src/netmirror/`, `src/dooflix/`, `src/cinemacity/`
- 空目录如果仍存在只是本地文件系统残留，Git 不跟踪

### Nuvio 缓存

- 缓存 key：**provider id + version + filename**
- manifest 顶层 version + provider version 必须一起 bump

### 本地测试边界

- node fetch + full_network：可测非 CF 站点
- CF WAF（vixsrc/moviesmod/animekai.to）：数据中心 403，真机可能正常
- 1.1.20：Vixsrc / MoviesMod 只有 `providers/*.js` 生成文件，没有 `src/` 源码目录；已直接给单文件 request helper 加 `Cloudflare.solve()` retry

---

## 7. 4KHDHub seek（历史，低优先级）

- HubDrive `POST hubdrive.space/ajax.php?ajax=direct-download` → R2 `.r2.dev` 直链（浏览器可 seek）
- 用户真机：部分片源仍不能 seek；**不能从 URL 预测**；已去掉误导性 Seek 标签
- **不要**后台浏览器播整片测 seek

---

## 8. Codex 建议下一步（按优先级）

1. **等用户反馈** 1.1.16：AnimeKai / AnimePahe 新番、尤其 *Re:ZERO* S4 是否能搜到并播放；若 AnimeKai 仍不能播，考虑 m3u8 proxy
2. **等用户反馈**：UHDMovies Hail Mary、MovieBlast、Vidlink 标签
3. **Vixsrc / MoviesMod**：仅真机失败时再改；要日志
4. **MovieBox TV**：若仍 0 流，需要针对具体 `resourceLink` 域名写站点 extractor
5. **VidnestAnime**：只有在愿意重写 embed/API 提取时再启用
6. **中文源**：调研纯 API、无 CF/kkey 的新 provider（KissKH 不可 port）
7. **Dooflix / CinemaCity / NetMirror / VidnestAnime / VIDEASY**：已从仓库删除；需要时从 Git 历史恢复并重写
8. **4KHDHub seek**：用户已放弃，除非主动回来

---

## 9. Cloudstream 参考路径

- 4KHDHub：`FourKHDHub/src/main/kotlin/com/fourKHDHub/`
- HDHub4u：`HDhub4u/src/main/kotlin/com/hdhub4u/HDhub4uProvider.kt`（搜索 glass 域名）
- UHDMovies：`UHDmoviesProvider/.../Extractors.kt` → `Driveseed.instantLink()` = GET + follow redirect
- MovieBlast：`MovieBlast/.../MovieBlast.kt` → loadLinks headers

---

## 10. 杂项

- `.npm-cache/` 勿提交
- README Quick Start 已改为用户 fork raw manifest URL（1.1.12）
- Canvas 计划：`canvases/providers-fix-plan.canvas.tsx`（若存在）
- 不要用 Consumet 公网 API；不要 port HiAnime/Gogo 除非动画源全灭

---

*本文件由 Cursor 会话写入，供 Codex 接续。有新进展请更新 §3、§5、§8 并 bump CHANGELOG。*
