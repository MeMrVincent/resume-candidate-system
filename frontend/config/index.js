'use strict';
const path = require('path');
const envConfig = require('./env.conf');

module.exports = {
  dev: {
    assetsSubDirectory: 'static',
    assetsPublicPath: '/',
    host: envConfig.process.host,
    port: envConfig.process.port,
    autoOpenBrowser: true,
    errorOverlay: true,
    notifyOnErrors: true,
    poll: false,
    devtool: 'eval-cheap-module-source-map',
    cacheBusting: true,
    cssSourceMap: true,
  },
  build: {
    index: path.resolve(__dirname, '../dist/index.html'),
    assetsRoot: path.resolve(__dirname, '../dist'),
    assetsSubDirectory: 'static',
    sysApp: 'src',
    assetsPublicPath: './',
    productionSourceMap: false,
    devtool: 'source-map',
    productionGzip: true,
    productionGzipExtensions: ['js', 'css'],
    bundleAnalyzerReport: process.env.npm_config_report,
    dist: path.resolve(__dirname, '../dist'),
  },
};
