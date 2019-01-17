'use strict';

const path = require('path');
const fs = require('fs');
const url = require('url');

// Make sure any symlinks in the project folder are resolved:
// 确保项目文件夹中的所有符号连接符都被解析了
// https://github.com/facebook/create-react-app/issues/637
// https://github.com/facebook/create-react-app/pull/648
// The process.cwd() method returns the current working directory of the Node.js process.
// 个人认为cmd中cd到哪里，这个值就是什么
// __dirname 是被执行的js 文件的地址 ——文件所在目录
// fs.realpathSync()Returns the resolved pathname.
// 所以appDirectory这个值是app的根目录
const appDirectory = fs.realpathSync(process.cwd());

//path.resolve():路径段拼接，如果路径之间没有/，会自动补上，
//详见：https://nodejs.org/dist/latest-v10.x/docs/api/path.html
//这个方法用来生成在配置文件中要用到的各种路径，参数是相当于根目录的路径
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const envPublicUrl = process.env.PUBLIC_URL;
//slash斜线
// 如果路径需要以/结尾的话
// 如果inputPath有/，就直接返回
// 如果inputPath没/，就加上
function ensureSlash(inputPath, needsSlash) {
  const hasSlash = inputPath.endsWith('/');
  if (hasSlash && !needsSlash) {
    return inputPath.substr(0, inputPath.length - 1);
  } else if (!hasSlash && needsSlash) {
    return `${inputPath}/`;
  } else {
    return inputPath;
  }
}

const getPublicUrl = appPackageJson =>
  //先看环境变量中有没有，再看package.homepage有没有
  envPublicUrl || require(appPackageJson).homepage;
// Webpack needs to know it(PublicUrl) to put 
// the right <script> hrefs into HTML even哪怕 in
// single-page apps that may serve index.html for nested嵌入的 URLs like /todos/42.
// We can't use a relative path in HTML because we don't want to load something
// like /todos/42/static/js/bundle.7289d.js. We have to know the root.
function getServedPath(appPackageJson) {
  const publicUrl = getPublicUrl(appPackageJson);
  const servedUrl =
    // url.parse()可以将一个完整的URL地址，分为很多部分，
    // http://nodejs.cn/api/url.html#url_url_pathname
    // 常用的有：host、port、pathname、path、query。
    // 先看envPlublicUrl有没有设置，有就用，
    // 如果没有，就看package.json中homepage有没有设置，
    // 如果有，就把homepage中的pathname取出来，
    // 如果没有，就直接取'/'。
    envPublicUrl || (publicUrl ? url.parse(publicUrl).pathname : '/');
  // 确保servedUrl以'/'结尾
  // PublicUrl和ServedPath的区别：
  // 如果process.env.PUBLIC_URL设置了，相等
  // 如果package.json中homepage设置了，servedUrl只包含PublicUrl中的pathname部分
  // 如果package.json也没设置，PublicUrl为undefined,servedUrl为'/'。
  return ensureSlash(servedUrl, true);
}

//模块文件后缀
const moduleFileExtensions = [
  'web.mjs',
  'mjs',
  'web.js',
  'js',
  'web.ts',
  'ts',
  'web.tsx',
  'tsx',
  'json',
  'web.jsx',
  'jsx',
];

// Resolve file paths in the same order as webpack
// 根据filePath文件路径来查找对应模块，按moduleFileExtensions
// 数组中文件类型的顺序查找，find()找到后就停止查找
const resolveModule = (resolveFn, filePath) => {
  //find() 方法返回通过测试（函数内判断）的数组的第一个元素的值。
  const extension = moduleFileExtensions.find(extension =>
    fs.existsSync(resolveFn(`${filePath}.${extension}`))
  );
  //找到了就返回该模板文件
  if (extension) {
    return resolveFn(`${filePath}.${extension}`);
  }
  //没找到默认就使用js后缀的模块文件
  return resolveFn(`${filePath}.js`);
};

// config after eject: we're in ./config/
module.exports = {
  dotenv: resolveApp('.env'),
  appPath: resolveApp('.'),
  //g:\webpack4\build会自动加\
  appBuild: resolveApp('build'),
  appPublic: resolveApp('public'),
  appHtml: resolveApp('public/index.html'),
  //按顺序查找src/index.web.mjs,.mjs,web.js,js...文件，找到后
  //用resolveApp()函数将路径拼接后再返回路径
  //默认拼接并返回src/index.js文件的路径
  appIndexJs: resolveModule(resolveApp, 'src/index'),
  appPackageJson: resolveApp('package.json'),
  appSrc: resolveApp('src'),
  appTsConfig: resolveApp('tsconfig.json'),
  yarnLockFile: resolveApp('yarn.lock'),
  testsSetup: resolveModule(resolveApp, 'src/setupTests'),
  proxySetup: resolveApp('src/setupProxy.js'),
  appNodeModules: resolveApp('node_modules'),
  publicUrl: getPublicUrl(resolveApp('package.json')),
  servedPath: getServedPath(resolveApp('package.json')),
};

module.exports.moduleFileExtensions = moduleFileExtensions;
