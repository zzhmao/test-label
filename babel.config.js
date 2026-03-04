module.exports = {
  presets: [
    // https://github.com/vuejs/vue-cli/tree/master/packages/@vue/babel-preset-app
    '@vue/cli-plugin-babel/preset'
  ],
  plugins: [
    // 支持可选链操作符
    '@babel/plugin-proposal-optional-chaining', '@babel/plugin-proposal-nullish-coalescing-operator', '@babel/plugin-proposal-private-methods'
  ],
  env: {
    development: {
      // babel-plugin-dynamic-import-node 插件通过将所有 import() 转换为 require() 来增加热更新速度
      plugins: ['dynamic-import-node']
    }
  }
}
