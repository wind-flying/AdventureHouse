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

这样做的原因是当前 WSL 环境里没有可直接使用的 Linux `node`，所以先在项目内放一套独立 Node 运行时，避免依赖系统环境。

## 启动开发服务器

在项目根目录执行：

```bash
PATH="$PWD/.conda-node/bin:$PATH" ./.conda-node/bin/npm run dev:local
```

如果启动成功，终端会保持运行，不要关掉这个进程。

`dev:local` 与 `dev` 相同，均读取 [vite.config.ts](/home/windflying/Code/AdventureHouse/vite.config.ts) 中的开发服务器设置：

- 仅监听本机回环地址 `127.0.0.1`，局域网内其他设备无法访问
- 固定使用 `5173` 端口，并启用严格端口模式

如果 `5173` 已经被旧开发服务器占用，命令会直接失败，而不是自动换到 `5174`、`5175` 等端口。这样浏览器访问地址和实际监听地址不会错位。

## 本地访问地址

启动后，在本机浏览器中打开：

- `http://127.0.0.1:5173/`
- 或 `http://localhost:5173/`

两者等价，都指向本机回环地址。

如果是在 Windows 浏览器中访问 WSL 里启动的服务，也优先使用上述地址。WSL2 会把本机 `localhost` 转发到 WSL 内的服务，这仍然只是本机访问，不会把开发服务器暴露到局域网。

**不要**尝试用局域网 IP（例如 `http://192.168.x.x:5173/`）访问；当前配置下这些地址不可用，这是预期行为。

## 构建生产版本

在项目根目录执行：

```bash
PATH="$PWD/.conda-node/bin:$PATH" ./.conda-node/bin/npm run build
```

构建完成后会生成：

`dist/`

这个目录就是后续部署到静态托管平台时要用的构建产物。

## 当前已验证的内容

目前已经确认：

- `npm install` 可以正常执行
- `npm run build` 可以通过
- `Vite` 开发服务器可以启动
- 本地访问 `http://127.0.0.1:5173` 返回 `HTTP 200`

## 常用命令汇总

安装依赖：

```bash
PATH="$PWD/.conda-node/bin:$PATH" ./.conda-node/bin/npm install
```

启动开发服务器：

```bash
PATH="$PWD/.conda-node/bin:$PATH" ./.conda-node/bin/npm run dev:local
```

构建：

```bash
PATH="$PWD/.conda-node/bin:$PATH" ./.conda-node/bin/npm run build
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
- 并统一走项目内运行时，例如 `PATH="$PWD/.conda-node/bin:$PATH" ./.conda-node/bin/npm run dev:local`

如果必须从 Windows 侧发起，也应该显式包一层 `wsl`，例如：

```powershell
wsl bash -lc "cd /home/windflying/Code/AdventureHouse && PATH=\"\$PWD/.conda-node/bin:\$PATH\" ./.conda-node/bin/npm run build"
```

## 后续可优化项

现在这套方式已经能跑，但还不是最终形态。后面可以考虑：

- 如果 WSL 的系统级 Node 环境恢复正常，可以改回更常规的 `npm run dev`
- GitHub Pages 部署说明见 [github-pages.zh-CN.md](/home/windflying/Code/AdventureHouse/docs/iterations/github-pages.zh-CN.md)

