const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util"),
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser"),
      "vm": require.resolve("vm-browserify"),
      "fs": false,
      "net": false,
      "tls": false,
      "child_process": false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        cosmjs: {
          test: /[\\/]node_modules[\\/]@cosmjs[\\/]/,
          name: 'cosmjs',
          chunks: 'all',
        },
        coreum: {
          test: /[\\/]node_modules[\\/]coreum-js[\\/]/,
          name: 'coreum',
          chunks: 'all',
        }
      }
    }
  }
};
