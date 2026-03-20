# 本地运行与访问说明

## 适用范围

这份文档说明当前项目在本地如何启动、如何访问，以及为什么不能再使用 `Live Server`。

当前项目技术栈为：

- `Vite`
- `TypeScript`
- 纯静态前端

## 为什么不能再用 Live Server

项目现在的入口脚本是 [src/main.ts](/home/windflying/Code/AdventureHouse/src/main.ts)，不是浏览器可以直接执行的普通 JavaScript 文件。

`Live Server` 只适合直接托管静态文件，不会帮我们处理：

- TypeScript 转译
- Vite 模块解析
- 开发时热更新

所以这个项目后续统一使用 `Vite` 运行。

## 当前运行方式

当前仓库已经准备了一套项目内本地运行时，放在：

`/home/windflying/Code/AdventureHouse/.conda-node`

这样做的原因是当前 WSL 环境里没有可直接使用的 Linux `node`，所以先用 `conda` 在项目内放一套独立 Node 运行时，避免依赖系统环境。

## 启动开发服务器

在项目根目录执行：

```bash
conda run -p /home/windflying/Code/AdventureHouse/.conda-node npm run dev -- --host 0.0.0.0 --port 4173
```

如果启动成功，终端会保持运行，不要关掉这个进程。

## 本地访问地址

启动后，在浏览器中打开：

`http://localhost:4173/`

如果是在 Windows 浏览器中访问 WSL 里的服务，也优先先试这个地址。

## 构建生产版本

在项目根目录执行：

```bash
conda run -p /home/windflying/Code/AdventureHouse/.conda-node npm run build
```

构建完成后会生成：

`dist/`

这个目录就是后续部署到静态托管平台时要用的构建产物。

## 当前已验证的内容

目前已经确认：

- `npm install` 可以正常执行
- `npm run build` 可以通过
- `Vite` 开发服务器可以启动
- 本地访问 `http://127.0.0.1:4173` 返回 `HTTP 200`

## 常用命令汇总

安装依赖：

```bash
conda run -p /home/windflying/Code/AdventureHouse/.conda-node npm install
```

启动开发服务器：

```bash
conda run -p /home/windflying/Code/AdventureHouse/.conda-node npm run dev -- --host 0.0.0.0 --port 4173
```

构建：

```bash
conda run -p /home/windflying/Code/AdventureHouse/.conda-node npm run build
```

结算模拟脚本：

```bash
conda run -p /home/windflying/Code/AdventureHouse/.conda-node npm run simulate:resolution
```

指定样本次数与线索数量：

```bash
conda run -p /home/windflying/Code/AdventureHouse/.conda-node npm run simulate:resolution -- --runs 5000 --intel-count 2
```

只看某条测试任务：

```bash
conda run -p /home/windflying/Code/AdventureHouse/.conda-node npm run simulate:resolution -- --quest resolution-danger-match
```

## 关于 Windows / WSL 混跑

如果项目目录位于 WSL 路径下，不要直接在 Windows 的 `cmd.exe` 或 Windows 侧 `npm` 环境里运行这些命令。

常见错误表现是：

- `UNC 路径不受支持`
- `tsc 不是内部或外部命令`

原因是：

- Windows 的 `cmd.exe` 无法把 `\\\\wsl.localhost\\...` 这样的 UNC 路径当成当前工作目录
- 回退到 Windows 目录后，就找不到 WSL / conda 环境里的 `node`、`npm`、`tsc`

当前项目最稳的做法是：

- 在 WSL bash 里执行命令
- 并统一走 `conda run -p /home/windflying/Code/AdventureHouse/.conda-node ...`

如果必须从 Windows 侧发起，也应该显式包一层 `wsl`，例如：

```powershell
wsl bash -lc "cd /home/windflying/Code/AdventureHouse && conda run -p /home/windflying/Code/AdventureHouse/.conda-node npm run simulate:resolution -- --runs 5000 --intel-count 2"
```

## 后续可优化项

现在这套方式已经能跑，但还不是最终形态。后面可以考虑：

- 给 `conda` 运行命令再包一层脚本，减少命令长度
- 如果 WSL 的系统级 Node 环境恢复正常，可以改回更常规的 `npm run dev`
- 补齐浏览器自动截图依赖，方便开发时自动检查界面结果
- GitHub Pages 部署说明见 [github-pages.zh-CN.md](/home/windflying/Code/AdventureHouse/docs/iterations/github-pages.zh-CN.md)
