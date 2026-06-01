# 交接说明 (HANDOFF) — 给 Codex / 下一任 Agent

> **最后更新：2026-06-01**  
> **仓库：** `https://github.com/cbdoglolz/nuvio-providers-cb`（fork，manifest 名 **cbrepo**）  
> **分支：** `main`（已与 `origin/main` 同步）  
> **最新版本：** manifest **1.3.8**，最新 commit **待 push 后确认**

---

## 0. 给 Codex 的一句话

用户在 Nuvio 用 **cbrepo** 插件；**HdHub 单独插件里的 4KHDHub 能搜到片，cbrepo 里 12 个源曾全部搜不到**。已修 CDN 订阅、MovieBox Hermes、整仓 Nuvio 兼容层（1.3.5–1.3.8）；**用户是否已在真机验证 1.3.8 尚不明确**。请读本文 + [NUVIO_SYNC.md](./NUVIO_SYNC.md)，默认 **push 到 main**（用户要求更新完就推送）。

---

## 1. 用户环境与诉求

| 项 | 内容 |
|----|------|
| App | Nuvio（Plugins + Stremio 类 addon） |
| 元数据 | 常用 **AIOMetadata**（中文） |
| 字幕 | OpenSubtitles V3、YaStream 等（与 provider 无关） |
| 参考 CS | CNCVerse **MovieBoxProvider**（`api3.aoneroom.com`）— 神探夏洛克中文字幕可用 |
| 对比插件 | **HdHub**（非本 repo）里 4KHDHub **能**出搏击俱乐部 |

**成功标准：** 搏击俱乐部、神探夏洛克 S1E1 等在 cbrepo 多源能出片；插件版本刷新后显示 **1.3.8**；日志有 `[cbrepo:providerId]`。

---

## 2. 订阅 URL（唯一推荐）

```
https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/manifest.json
```

**禁止**用户继续用：

- `raw.githubusercontent.com/.../main/manifest.json`（`@main` CDN 缓存，刷新无效）
- `cdn.jsdelivr.net/.../main/manifest.json`（更旧）

可选：GitHub Pages 开好后 `https://cbdoglolz.github.io/nuvio-providers-cb/manifest.json`（Settings → Pages → 分支 **gh-pages** / root，只需一次）。

**自检：** 浏览器打开  
`https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/providers/4khdhub.js`  
必须含字符串 **`__CB_REPO_NUVIO_PATCHED__`**（1.3.7 部署产物才有）。

---

## 3. 架构要点

```
manifest.json          ← 用户订阅入口
providers/*.js         ← 开发编辑的源码（未 patch）
scripts/patch-providers-for-nuvio.js  ← 部署时注入兼容层
.github/workflows/publish.yml         ← push main → purge jsDelivr + 部署 gh-pages
```

- **gh-pages 上的 `providers/*.js` ≠ 仓库里直接 copy 的文件**；CI 会先 `patch-providers-for-nuvio.js` 再发布。
- 本地 `node -e "require('./providers/moviebox')"` 测的是**未 patch** 版；测真机行为应 patch `_site/providers` 或等 gh-pages。

### Patch 层做什么（`__CB_REPO_NUVIO_PATCHED__`）

- `tt0137523` → TMDB `find` API → 数字 TMDB id  
- `series` / `show` → `tv`  
- `getStreams` 包 Promise，保证返回数组  
- 同时设置 `module.exports` 与 **`global.getStreams`**  
- 日志：`[cbrepo:4khdhub] getStreams id=…` / `returned N stream(s)`

---

## 4. 版本与 commit 时间线（近期）

| 版本 | Commit | 内容 |
|------|--------|------|
| 1.3.4 | `1fb2ebc` | MovieBox 对齐 CNCVerse API、TV play-info、字幕 |
| 1.3.5 | `515df9e` | MovieBox Hermes（去 getter/spread）、m3u8、日志 |
| 1.3.5–6 | `4657d4f`…`f06a22e` | CDN/gh-pages 发布流程、NUVIO_SYNC |
| 1.3.6 | `7f4ca79` | MovieBox 设备端 play-info + bearer |
| **1.3.8** | 待确认 | **Nuvio patch 加强：object-style 参数、Fight Club/Sherlock IMDb/TMDB 元数据兜底、全 scraper 版本 cache bust** |
| **1.3.7** | **`8c7aa28`** | **整仓 Nuvio patch + manifest formats + 4KHDHub type:direct** |

---

## 5. MovieBox（`providers/moviebox.js`）

- API：`https://api3.aoneroom.com`（与 CNCVerse 一致）  
- 电影/剧集：**优先 `play-info` + `x-user` Bearer**；失败再 resourceDetectors 兜底  
- 本地 Node：搏击俱乐部 ~1 条流，神探夏洛克 S1E1 ~2 条（play-info 路径）  
- 用户曾见 **fetching 但无片** → 1.3.6+ 针对 bearer；整仓 0 源 → 1.3.7 patch  

参考：`NivinCNC/CNCVerse-Cloud-Stream-Extension` → `MovieBoxProvider.kt`

---

## 6. 各 Provider 本地测搏击俱乐部（TMDB 550）— 2026-06-01

| Provider | 本地结果 | 备注 |
|----------|----------|------|
| streamflix | 4 | Promise 链，无 patch 也能跑 |
| moviebox | 1 | play-info |
| vidlink / vixsrc | 各 1 | `__async` 转译 |
| hdhub4u | 1 | 慢 ~23s |
| **4khdhub** | **0** | 能找到片页，Hub 链解析失败 |
| moviesmod | 0 | 403 CF |
| uhdmovies | 0 | Hrefli 失败 |

**结论：** 即使用户装上 1.3.7，**4KHDHub 仍可能 0 条**（需单独修 HubCloud/HubDrive）；但 **不应 12 个全空**。

---

## 7. 用户最新问题（待 Codex 验证）

1. 重装 Nuvio、重装插件后 **cbrepo 内 12 源仍全搜不到**（搏击俱乐部）。  
2. **HdHub 插件** 内 4KHDHub **能**搜到同一部片。  
3. 是否已装上 **1.3.8**、gh-pages JS 是否含 **`__CB_REPO_NUVIO_PATCHED__`** — **未确认**。

**Codex 下一步：**

1. 等 Actions 部署完成，确认 gh-pages manifest 为 **1.3.8**。
2. 让用户用 `@gh-pages` URL 重装；浏览器检查 patch 标记。  
3. 向用户索要 Nuvio 日志中的 `[cbrepo:*]` 行。  
4. 若 patch 生效仍全 0：查 Nuvio 传参（是否非标准 `mediaType`）、是否未启用 scraper。  
5. 若仅 4KHDHub 0：修 `providers/4khdhub.js` 或对照 Phisher/HdHub 上游差异。  
6. 更新 `subscribe.json` 的 version/commit（当前文件仍写 1.3.5，可顺手改）。  
7. 勿提交 `_site/`（本地测试目录）；可加 `.gitignore`。

---

## 8. 当前 manifest 内 12 个 scraper

`4khdhub`, `kickassanime`, `uhdmovies`, `moviesmod`, `streamflix`, `moviebox`, `vixsrc`, `yflix`, `mallumv`, `vidlink`, `hdhub4u`, `mycima` — 均 `enabled: true`。

---

## 9. 开发命令

```bash
npm install
npm start                    # 本地 http://IP:3000/manifest.json — Plugin Tester
node -e "require('./providers/moviebox').getStreams('550','movie').then(console.log)"

# 模拟 gh-pages 真机包：
mkdir -p _site/providers && cp manifest.json _site/ && cp providers/*.js _site/providers/
node scripts/patch-providers-for-nuvio.js _site/providers
node -e "require('./_site/providers/moviebox').getStreams('tt0137523','movie').then(s=>console.log(s.length))"
```

```bash
git push origin main   # 用户要求：改完默认 push；触发 publish.yml
```

---

## 10. 相关文档

- [NUVIO_SYNC.md](./NUVIO_SYNC.md) — CDN 缓存、重装步骤、HdHub vs cbrepo  
- [CHANGELOG.md](./CHANGELOG.md) — 版本明细  
- [subscribe.json](./subscribe.json) — 推荐 URL（需与 manifest 版本同步）

---

## 11. 未解决问题 / 非本 repo

- 字幕季集错位（OpenSubtitles / YaStream）— 未在 cbrepo 修  
- KissKH kkey — 见下文旧备忘，未接入  
- GitHub Pages **github.io** — 需用户在仓库 Settings 手动选 `gh-pages` 分支（Actions 无权限自动开 Pages）

---

## 12. KissKH（备忘，未做）

`kkey` 每集一次性 token；Phisher 用 `local.properties` 的 `KissKh=` / `KisskhSub=` URL 前缀。公开 repo 无稳定 key。
