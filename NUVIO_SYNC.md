# Nuvio 插件版本刷不出来 — 原因与一劳永逸的订阅地址

> 2026-06-01 更新：当前 cbrepo 版本为 **1.3.15**。订阅 URL 仍只推荐：
> `https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/manifest.json`
> 1.3.12 将 CNCVerse 播放提取切到 CloudStream 当前 `/newtv/player.php` 的 `video_link` 路线；1.3.10 修复 `@gh-pages` CDN purge；1.3.9 新增 CNCVerse / NetflixMirror provider，并加强 MovieBox 字幕映射；1.3.8 在 gh-pages provider patch 层加入了 Fight Club / Sherlock 的 IMDb→TMDB 与元数据兜底。

## 结论（请先读）

**代码已经 push 到 GitHub，`main` 上就是最新版。**  
你在 App 里点「刷新」仍显示 **1.3.4 / 1.3.3**，是因为 **订阅 URL 背后的 CDN 还在返回旧的 `manifest.json`**，不是没更新成功。

| 你用的 URL | 实测 manifest 版本（push 1.3.5 后） |
|------------|-------------------------------------|
| `raw.githubusercontent.com/.../main/manifest.json` | **1.3.4（旧）** |
| `cdn.jsdelivr.net/gh/.../main/manifest.json` | **1.3.3（更旧）** |
| `raw.githubusercontent.com/.../515df9e/manifest.json` | **1.3.5（新）** |
| **`cdn.jsdelivr.net/gh/.../gh-pages/manifest.json`（推荐）** | **1.3.5，每次 push 自动更新** |
| `cbdoglolz.github.io/.../manifest.json` | 需在 Settings→Pages 选 `gh-pages` 分支后可用 |

所以：**不是让你「瞎折腾」**，而是必须把订阅地址从 **`@main` 的 raw/jsdelivr** 换成 **GitHub Pages**（只需改一次），之后点刷新才会像从前一样跟着变。

---

## 为什么「以前点刷新就行，现在不行」

1. **`raw.githubusercontent.com/.../main` 有 CDN 缓存**（常见几分钟到更久），`@main` 不会立刻变成新文件。
2. **`jsdelivr ...@main` 缓存更重**，我们实测比 raw 还旧。
3. Nuvio 刷新 = **再次请求你当初填的那个 URL**。URL 不变、CDN 仍返回旧 JSON → 界面版本号永远不变。
4. 你本地删插件、清缓存也没用：**只要重新添加的还是同一个 `@main` 链接，拿到的还是旧 manifest。**

GitHub 网页上能看到最新 commit，和 raw `@main` 不是同一条缓存链路。

---

## 正确订阅地址（复制这一条）

```
https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/manifest.json
```

（`gh-pages` 分支由 CI 在每次 push 后更新；**不是** `@main`。）

可选（在 GitHub 开 Pages 后）：

```
https://cbdoglolz.github.io/nuvio-providers-cb/manifest.json
```

每次我们 push 到 `main`，GitHub Actions 会 **purge jsDelivr 缓存**，并把文件推到 **`gh-pages` 分支**。

### 首次使用 github.io（只需做一次）

在浏览器打开仓库 **Settings → Pages**：

1. **Build and deployment → Source** 选 **Deploy from a branch**
2. **Branch** 选 **`gh-pages`**，文件夹 **`/ (root)`**，保存
3. 等 1–2 分钟，再打开上面的 `github.io/manifest.json` 自检

（Actions 没有权限替你自动开 Pages，所以要手动选一次分支。）

自检（手机浏览器打开，看 `"version"`）：

- Pages：`https://cbdoglolz.github.io/nuvio-providers-cb/manifest.json`
- 或查看：`https://cbdoglolz.github.io/nuvio-providers-cb/subscribe.json`

---

## 一次性操作（之后刷新即可）

1. **设置 → 插件 → 删除 cbrepo**（整仓删除）。
2. **重新添加**，URL 用上面的 **github.io** 地址（不要用 raw、不要用 `@main` 的 jsdelivr）。
3. 确认列表里 **cbrepo 版本** 与浏览器里 JSON 一致（当前应为 **1.3.5**）。
4. 以后更新：**只点刷新** 即可（Pages 部署约 1–2 分钟）。

### 若用过 Nuvio 官网账号

打开 https://nuvioapp.space/account → **Plugins**，把旧 URL 改成 **github.io** 那条并保存，否则云端会把旧地址同步回手机。

### 紧急：Pages 还没开好时

可暂时用 **commit 钉死**（每次大版本可把 commit 换掉）：

```
https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@515df9e/manifest.json
```

---

## HdHub 能搜到、cbrepo 全挂？

说明 **不是 4KHDHub 网站坏了**，而是 **cbrepo 插件在手机上没把片源交给 Nuvio**。

| 现象 | 含义 |
|------|------|
| 单独 **HdHub** 插件能出 4KHDHub | 上游/别的仓库的脚本或订阅方式可用 |
| **cbrepo** 里 12 个源全空 | 常见：传了 **IMDb id（tt…）** 而脚本只认数字 TMDB、或 **没挂 `global.getStreams`**、或 **manifest `formats` 把 mp4/m3u8 滤掉** |

**1.3.7+** 起，gh-pages 部署的每个 provider 会自动包一层兼容（日志里搜 `[cbrepo:4khdhub]`、`[cbrepo:moviebox]`）：

- `tt0137523` → TMDB `find` API 再搜
- `series` / `show` → `tv`
- 保证 `global.getStreams` 与 `module.exports`

自检：浏览器打开（应能下载一大段 JS，且文件里含 `__CB_REPO_NUVIO_PATCHED__`）：

```
https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@gh-pages/providers/4khdhub.js
```

若 **没有** 这行字符串 → 订阅的仍是旧包，请删 cbrepo 后用下面 URL 重装。

---

## 不要用的 URL

- `https://raw.githubusercontent.com/cbdoglolz/nuvio-providers-cb/main/manifest.json`（`@main` 易缓存，**刷新无效**）
- `https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@main/manifest.json`（`@main` 更慢，**不推荐**）
- 上游 `yoruix/nuvio-providers`、旧 `tapframe` 地址
- 同时添加两个 cbrepo（不知道哪个在生效）

---

## Nuvio 怎么判断要不要更新

1. 第一次添加：下载 `manifest.json`，按 `scrapers[].id` + `version` 缓存各 `.js`。
2. 之后刷新：只有 **新 manifest 里的版本号变了**，才会重新下载改过的 provider。
3. 若 manifest 本身拉不到新的，界面会一直停在**第一次安装时**看到的数字。

改 `providers/xxx.js` 时须同时升该 scraper 的 `"version"`，否则仓库号变了，单个源仍跑旧 JS。

---

## 开发者本地测试（不经过 CDN）

```bash
npm start
```

手机 **Developer → Plugin Tester**：

```
http://你的电脑局域网IP:3000/manifest.json
```

---

## 仓库里的版本号

| 字段 | 含义 |
|------|------|
| `manifest.json` 顶层 `"version"` | 插件列表里的 **cbrepo 仓库版本** |
| 各 scraper 的 `"version"` | 单个源（如 MovieBox `1.1.5-cb5`） |
