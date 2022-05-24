## 介绍

webpack 引用模块依赖分析，从入口到每个模块以图的形式展现出来。

![效果图](assets/README/2022-05-24-14-15-29.png)

## 使用

```js
import WebpackTreeDenpendensPlugin from 'webpack-tree-denpendens-plugin';

export default {
    // ...

    plugins: [
        // ...
        new WebpackTreeDenpendensPlugin(),
    ],
};
```

## TO DO

- [ ] 页面在打包完成后从服务器获取
- [ ] profile.json 输出由参数控制

## 启动

```bash
pnpm install

pnpm run start
```

查看例子

```bash
cd examples/run/

pnpm run build
```
