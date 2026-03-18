# GitHub Pages 部署说明

## 目标

这份文档说明如何把当前项目发布到 GitHub Pages，并得到一个可以直接访问的公开网址。

当前仓库地址：

`https://github.com/wind-flying/AdventureHouse`

部署完成后，对应网址通常为：

`https://wind-flying.github.io/AdventureHouse/`

## 当前方案

项目已经配置了 GitHub Actions 工作流：

[deploy-pages.yml](/home/windflying/Code/AdventureHouse/.github/workflows/deploy-pages.yml)

它会在 `main` 分支发生 push 时自动执行：

1. 安装依赖
2. 运行 `npm run build`
3. 上传 `dist/`
4. 发布到 GitHub Pages

## 首次启用时需要检查的设置

进入仓库页面：

`Settings -> Pages`

确认 Pages 的构建来源是：

- `GitHub Actions`

如果仓库之前没有启用 Pages，这一步通常只需要检查一次。

## 发布流程

### 1. 确认改动已经准备好

本地至少应确认：

- `npm run build` 可以通过
- 页面本地访问正常

### 2. 把改动合入 `main`

当前开发分支是：

`feat-mvp-day-loop`

建议先把这一版确认好，再合并到 `main`。

### 3. 推送到 GitHub

例如：

```bash
git push origin main
```

或者先推当前分支，再通过 GitHub 发起合并请求：

```bash
git push origin feat-mvp-day-loop
```

### 4. 等待 Actions 执行完成

进入仓库页面：

`Actions`

查看 `Deploy To GitHub Pages` 工作流是否成功。

### 5. 访问最终网址

如果工作流通过，访问：

`https://wind-flying.github.io/AdventureHouse/`

## 和本地效果是否一致

原则上会非常接近，因为：

- 本地和线上都基于同一个 `Vite` 构建产物
- GitHub Pages 部署的也是 `dist/`

但需要注意：

- 本地开发模式有热更新，线上没有
- 如果以后接入本地存档，线上和本地浏览器缓存是分开的
- 如果后面增加依赖特定浏览器权限的功能，需要单独验证线上环境

## 当前已具备的条件

- 项目已迁移到 `Vite + TypeScript`
- 本地 `npm run build` 已通过
- 项目是纯静态前端，适合直接部署到 GitHub Pages

## 后续建议

- 以后如果仓库名变化，需要同步检查公开网址是否变化
- 如果后面改成自定义域名，需要额外补 `CNAME`
- 如果要把部署流程也纳入版本记录，可以在迭代文档里注明是哪一版开始接入 Pages
