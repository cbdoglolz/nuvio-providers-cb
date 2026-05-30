# Nuvio 插件版本刷不出来 — 说明与解决办法

## 重要结论

**GitHub 上的 `manifest.json` 已经是最新的**（当前仓库顶层 `version` 见 [manifest.json](./manifest.json)）。  
你在 Nuvio 里点「同步 / 刷新」后**版本号不变**，几乎总是下面两类原因之一，**不是我没 push**。

---

## Nuvio 实际怎么判断「要不要更新」

根据交接与真机现象，Nuvio 大致是这样工作的：

1. **第一次添加**插件时：用你填的 URL 下载 `manifest.json`，再按里面的 `scrapers[].id` + `version` + `filename` 缓存每个 `.js` 文件。
2. **之后点刷新**：只有当你**新拉到的 manifest** 里版本号变了，才会重新下载改过的 provider；否则继续用本地旧 JS。
3. **若刷新时根本没拉到新 manifest**（CDN 缓存、网络、填错 URL、账号云端仍是旧配置），界面上的版本会**一直停在第一次安装时的数字**（例如 1.2.5）。

所以：**改代码 + push 不等于手机自动变版本**；必须让 App **成功下载到新的 manifest.json**。

---

## 为什么「以前会自动变，现在不会」

常见变化：

| 以前 | 现在 |
|------|------|
| 改得少，隔几天才升一次版本 | 一天内连续升 1.2.3 → 1.2.8，更容易撞上 CDN/App 缓存 |
| 用 `npm start` + 局域网 `http://192.168.x.x:3000/manifest.json` 测 | 只用 GitHub raw，国内 CDN 易缓存 |
| 每次会**删掉重装** cbrepo | 只点「同步」，旧 manifest 可能不更新 |
| 只在 App 里加插件 | 还在 **nuvioapp.space 账号**里留着旧 Plugin URL，云端把旧配置同步回手机 |

---

## 30 秒自检（区分「GitHub 有」还是「手机没拉到」）

用手机浏览器打开（不要用 Nuvio 内置页）：

```
https://raw.githubusercontent.com/cbdoglolz/nuvio-providers-cb/main/manifest.json
```

或（推荐，少缓存）：

```
https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@main/manifest.json
```

看 JSON 里 `"version": "x.x.x"`：

- **浏览器已是 1.2.8，Nuvio 仍显示 1.2.5** → 100% 是 **Nuvio / 账号 / App 缓存**，按下面「强制更新」做。
- **浏览器也是 1.2.5** → 换网络、关 VPN、过几分钟再试，或改用 jsdelivr 链接。

---

## 强制更新（请按顺序做，不要只点刷新）

### A. App 内插件

1. **设置 → 插件 → 删除 cbrepo**（整仓删除，不是关开关）。
2. **设置里清除 Nuvio 缓存**（有的话）；或 **强制停止 App** 再打开。
3. **重新添加**，URL 用下面这一条（完整复制，必须含 `manifest.json`）：

   ```
   https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@main/manifest.json
   ```

4. 确认列表里 **cbrepo 仓库版本** 与浏览器里一致（不要和 UHDMovies 的 `1.2.2-cb4` 搞混）。

### B. 若用过 Nuvio 官网账号

1. 打开 https://nuvioapp.space/account → **Plugins**
2. 删掉旧的 plugin，或把 URL 改成上面的 **jsdelivr** 地址并保存。
3. 再打开 App，避免云端把旧 manifest 同步回来。

### C. 仍不行时（钉死某一版）

把 `@main` 换成具体 commit（示例，以 GitHub 最新为准）：

```
https://cdn.jsdelivr.net/gh/cbdoglolz/nuvio-providers-cb@8fa1909/manifest.json
```

每次大更新后把 commit 换掉再添加一次。

---

## 不要用的 URL

- `https://github.com/yoruix/nuvio-providers`（上游，不是你的 fork）
- `https://raw.githubusercontent.com/tapframe/...`（旧地址）
- 只填仓库根路径、**没有** `manifest.json` 的地址
- 和 jsdelivr **同时** 添加两个 cbrepo（会搞不清哪个在生效）

---

## 开发者本地测试（版本一定跟着变）

电脑在项目目录执行：

```bash
npm start
```

手机 Nuvio **开发版** → 设置 → Developer → Plugin Tester → 填：

```
http://你的电脑局域网IP:3000/manifest.json
```

改完 `providers/*.js` 保存后，在 Tester 里重新 Fetch Manifest，**不经过 GitHub CDN**，所以不会出现「永远 1.2.5」。

---

## 我们每次改代码时会动的版本号

| 字段 | 作用 |
|------|------|
| `manifest.json` 顶层 `"version"` | 你在插件列表里看到的 **cbrepo 仓库版本** |
| 每个 scraper 的 `"version"` | 单个 provider（如 HDHub4u `1.1.5-cb2`） |
| 改 `providers/xxx.js` 时**必须**同时升对应 scraper 的 version | 否则 Nuvio 认为 JS 没变，不重新下载 |

顶层 version 只升、某个 provider 的 version 没升 → 仓库号会变，但那个 provider 仍跑旧代码。
