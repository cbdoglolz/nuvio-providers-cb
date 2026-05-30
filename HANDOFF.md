# 交接说明 (HANDOFF)

> 最后更新：**2026-05-30**，repo **`1.2.1`**，分支 **`main`**
> 远端：`https://github.com/cbdoglolz/nuvio-providers-cb`

---

## 1. 用户真机反馈（2026-05-30）

| Provider | 结果 |
|----------|------|
| **HDHub4u** | ✅ 能用 |
| **Vidlink** | ✅ 能播；Unknown 标签已消失 |
| **UHDMovies** | 待再测 |
| **MovieBlast** | ❌ 有源不能播 → **已删除** |
| **AnimeKai** | ❌ 能搜到不能播 → **已删除** |
| **AnimePahe** | ❌ 找不到片 → **已删除** |

---

## 2. 当前 11 个 provider

| ID | 状态 | 说明 |
|----|------|------|
| **hdhub4u** | ✅ | 用户确认 |
| **uhdmovies** | ✅ | instant link |
| **vidlink** | ✅ | 用户确认 |
| **streamflix** | ✅ | |
| **moviebox** | ✅ 电影 | TV 视情况 |
| **4khdhub** | ⚠️ | seek 低优先级 |
| **vixsrc** | ❓ 真机 | CF |
| **moviesmod** | ❓ 真机 | CF |
| **yflix** | ⚠️ | limited |
| **mallumv** | 区域 | 南印 |
| **kickassanime** | ❓ 真机 | 新增 1.2.1；kaa.lt CF，需真机测 |

---

## 3. 已删除（1.2.0）

`animekai`, `animepahe`, `movieblast`, `dvdplay`, `vidnest`, `showbox`, `castle`, `cinevibe`, `dahmermovies`, `allmovieland`

---

## 5. KissKH kkey（未接入，备忘）

`kkey` **不是固定 API key**，是**每一集**播放前向 KissKH 换的一次性 token。

**Phisher / Cloudstream 用法**（`KisskhProvider/build.gradle.kts`）：
- 在仓库根目录 `local.properties` 里配置两个 **URL 前缀**（不是 kkey 本身）：
  - `KissKh=` → 用来换**视频** kkey 的接口前缀
  - `KisskhSub=` → 用来换**字幕** kkey 的接口前缀
- 代码：`GET {KissKh}{episodeId}&version=2.8.10` → JSON `{ "key": "..." }`，再拼到 `...Episode/{id}.png?kkey=...`

这些 URL 通常来自 **phisher 社区 Discord / 已编译 CS 插件**，公开 repo 里**没有**。

**自己拿 kkey 的办法**：
1. 浏览器打开 [kisskh.nl](https://kisskh.nl) 播一集 → F12 → Network → 搜 `kkey=`，复制 query 里的值（**会过期**）。
2. Python 工具 [kisskh-downloader](https://pypi.org/project/kisskh-downloader/)：`pip install kisskh-downloader playwright && playwright install chromium`，再 `kisskh get-key` 自动生成；可设环境变量 `KISSKH_STREAM_KEY` / `KISSKH_SUB_KEY`。

Nuvio 若要接 KissKH，需要把 kkey 获取逻辑写进 provider（或你提供稳定的 key 服务 URL）。

---

## 6. Push

Codex 不能 push；Cursor 本机 `git push origin main`。Nuvio 删 cbrepo 重加见 **1.2.0**。
