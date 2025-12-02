# HusterWhat2Eat

依靠微信云开发实现的校园食堂评分推荐小程序，依赖vant组件库

## 使用说明

1. 根目录中

   ```bash
   npm init -y
   ```

   此步骤会生成：

   ```
   package.json
   ```

2. 安装 Vant Weapp

   使用 npm 安装 Vant Weapp：

   ```bash
   npm install @vant/weapp -S --production
   ```

   安装完成后，目录中会生成：

   ```bash
   /node_modules/@vant/weapp/
   ```

3. 微信开发者工具构建 npm

   由于微信小程序运行环境无法直接识别 `node_modules`，
    需要在 微信开发者工具中执行 npm 构建：

   菜单 → 工具 → 构建 npm

   构建完成后，会生成：

   ```
   miniprogram/miniprogram_npm/@vant/weapp/
   ```

   该目录为小程序实际使用的依赖文件。
