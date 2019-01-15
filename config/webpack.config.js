'use strict';

const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
//解析模块
const resolve = require('resolve');

const PnpWebpackPlugin = require('pnp-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
//区分路径大小写
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin');
//This plugin uses terser to minify your JavaScript
const TerserPlugin = require('terser-webpack-plugin');
//分离css
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
//优化css
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
//postcss
const safePostCssParser = require('postcss-safe-parser');
//生成manifest资产清单的webpack插件
const ManifestPlugin = require('webpack-manifest-plugin');
//配合html-webpack-plugin使用，可在index.html中使用变量，
//并可配合使用html-webpack-plugin的默认模板语法
//Interpolate插入
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
//构建离线应用
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');

const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent');
const paths = require('./paths');
const getClientEnvironment = require('./env');
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin-alt');
const typescriptFormatter = require('react-dev-utils/typescriptFormatter');


// Source maps are resource heavy and can cause out of memory issue for large source files.
//源映射是资源密集型的，可能会导致大型源文件的内存不足问题
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';

// Some apps do not need the benefits of saving a web request, so not inlining the chunk
// makes for a smoother build process.
//By default, Create React App will embed the runtime script into `index.html` during 
//the production build. When set to `false`, the script will not be embedded and 
//will be imported as usual. This is normally required when dealing with CSP.
//webpack 的 runtime 和 manifest，管理所有模块的交互
//runtime，以及伴随的 manifest 数据，主要是指：在浏览器运行时，
//webpack 用来连接模块化的应用程序的所有代码。runtime 包含：
//在模块交互时，连接模块所需的加载和解析逻辑。
//包括浏览器中的已加载模块的连接，以及懒加载模块的执行逻辑。
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false';

// Check if TypeScript is setup
const useTypeScript = fs.existsSync(paths.appTsConfig);
// style files regexes
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
//less正则
const lessRegex = /\.less$/;
const lessModuleRegex = /\.module\.less$/;
//sass正则
const sassRegex = /\.(scss|sass)$/;
const sassModuleRegex = /\.module\.(scss|sass)$/;
// This is the production and development configuration.
// It is focused on developer experience, fast rebuilds, and a minimal bundle.
module.exports = function (webpackEnv) {
  const isEnvDevelopment = webpackEnv === 'development';
  const isEnvProduction = webpackEnv === 'production';

  // Webpack uses `publicPath` to determine where the app is being served from.
  // It requires a trailing slash, or the file assets will get an incorrect path.
  // In development, we always serve from the root. This makes config easier.
  // webpack 使用 `publicPath` 来决定app部署在哪
  // 它要求以 斜杠'/' 开始, 否则生成的asset无法正确部署
  // 在开发模式, 我们总是以 根目录'/'开始
  const publicPath = isEnvProduction
    ? paths.servedPath
    : isEnvDevelopment && '/';
  // Some apps do not use client-side routing with pushState.
  // For these, "homepage" can be set to "." to enable relative asset paths.
  // 有一些 app 不使用 客服端渲染
  // 所以 通过设置 homepage: "." 可以使用相对路径
  const shouldUseRelativeAssetPaths = publicPath === './';

  // `publicUrl` is just like `publicPath`, but we will provide it to our app
  // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
  // Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
  // `publicUrl` 和 `publicPath` 类似, 但是 `publicUrl`是 `publicPath`去掉最后的 /
  const publicUrl = isEnvProduction
    ? publicPath.slice(0, -1)
    : isEnvDevelopment && '';
  // Get environment variables to inject into our app.
  // 获取需要 inject的 环境变量
  //我以为如果是开发环境，publicUrl值为''，则函数返回的对象的属性中
  // {
  //   NODE_ENV: process.env.NODE_ENV || 'development'，此值这development
  //   PUBLIC_URL: publicUrl,此值为''
  //   REACT_APP_: 值为process.env[key]
  // }
  const env = getClientEnvironment(publicUrl);

  // common function to get style loaders
  const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
      isEnvDevelopment && require.resolve('style-loader'),
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        options: Object.assign(
          {},
          shouldUseRelativeAssetPaths ? { publicPath: '../../' } : undefined
        ),
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
      {
        // Options for PostCSS as we reference these options twice
        // Adds vendor prefixing based on your specified browser support in
        // package.json
        loader: require.resolve('postcss-loader'),
        options: {
          // Necessary for external CSS imports to work
          // https://github.com/facebook/create-react-app/issues/2677
          ident: 'postcss',
          plugins: () => [
            require('postcss-flexbugs-fixes'),
            require('postcss-preset-env')({
              autoprefixer: {
                flexbox: 'no-2009',
              },
              stage: 3,
            }),
          ],
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      },
    ].filter(Boolean);
    if (preProcessor) {
      loaders.push({
        loader: require.resolve(preProcessor),
        options: {
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      });
    }
    return loaders;
  };

  return {
    mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',

    //Stop compilation编译 early in production
    //bail:保释
    //如果是生产环境
    //在第一个错误出错时抛出，而不是无视错误。
    bail: isEnvProduction,

    // 开发环境, 是使用 cheap-module-source-map
    // 生产, 基于 shouldUseSourceMap 判断是否使用 'source-map'
    // 备注: 我对 cheap-module-source-map 这种sourcemap不喜欢, 有不少bug。
    devtool: isEnvProduction
      ? shouldUseSourceMap
        ? 'source-map'
        : false
      : isEnvDevelopment && 'cheap-module-source-map',
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    entry: [
      // Include an alternative client for WebpackDevServer. A client's job is to
      // connect to WebpackDevServer by a socket and get notified about changes.
      // When you save a file, the client will either apply hot updates (in case
      // of CSS changes), or refresh the page (in case of JS changes). When you
      // make a syntax error, this client will display a syntax error overlay覆盖.
      // Note: instead of the default WebpackDevServer client, we use a custom one
      // to bring better experience体验 for Create React App users. You can replace
      // the line below下面 with these two lines if you prefer the stock库存 client:
      //require.resolve函数来查询某个模块文件的带有完整绝对路径的文件名
      // require.resolve('webpack-dev-server/client') + '?/',
      // require.resolve('webpack/hot/dev-server'),
      // CRA 定制了和服务器端和客户端通信的组件, react-dev-utils/webpackHotDevClient
      // 记住, WebpackDevServer 是服务器, react-dev-utils/webpackHotDevClient 是于页面通信的客户端
      isEnvDevelopment &&
      require.resolve('react-dev-utils/webpackHotDevClient'),
      // Finally, this is your app's code:
      paths.appIndexJs,
      // We include the app code last so that if there is a runtime error during
      // initialization, it doesn't blow up the WebpackDevServer client, and
      // changing JS code would still trigger a refresh.
    ].filter(Boolean),
    output: {
      // 构建目录, 如果在开发环境, 那么会使用 cache 方式, 不会实际输入到disk中
      path: isEnvProduction ? paths.appBuild : undefined,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: isEnvDevelopment,

      // There will be one main bundle, and one file per asynchronous chunk.
      // In development, it does not produce real files.
      // 设置生成文件的名称
      // 开发模式下, 不产生真实文件
      filename: isEnvProduction
        ? 'static/js/[name].[chunkhash:8].js'
        : isEnvDevelopment && 'static/js/bundle.js',
      // There are also additional JS chunk files if you use code splitting.
      chunkFilename: isEnvProduction
        ? 'static/js/[name].[chunkhash:8].chunk.js'
        : isEnvDevelopment && 'static/js/[name].chunk.js',

      // We inferred推断 the "public path" (such as / or /my-project) from homepage.
      // We use "/" in development.
      // publicPath: "/assets/", // string
      // publicPath: "",
      // publicPath: "https://cdn.example.com/",
      // 输出解析文件的目录，url 相对于 HTML 页面
      //publicPath 并不会对生成文件的路径造成影响，
      //主要是对你的页面里面引入的资源的路径做对应的补全，
      //常见的就是css文件里面引入的图片
      publicPath: publicPath,

      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: isEnvProduction
        ? info =>
          path
            .relative(paths.appSrc, info.absoluteResourcePath)
            .replace(/\\/g, '/')
        : isEnvDevelopment &&
        (info => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')),
    },
    optimization: {
      //只在生产模式下有用，如何压缩代码
      minimize: isEnvProduction,
      minimizer: [
        // This is only used in production mode
        new TerserPlugin({
          terserOptions: {
            parse: {
              // we want terser to parse ecma 8 code. However, we don't want it
              // to apply any minfication steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,//对比
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending futher investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2,
            },
            mangle: {//损坏
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
          // Use multi-process parallel running to improve the build speed
          // Default number of concurrent runs: os.cpus().length - 1
          parallel: true,//并行的
          // Enable file caching
          cache: true,
          sourceMap: shouldUseSourceMap,
        }),
        // This is only used in production mode
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            parser: safePostCssParser,
            map: shouldUseSourceMap
              ? {
                // `inline: false` forces the sourcemap to be output into a
                // separate file
                inline: false,
                // `annotation: true` appends the sourceMappingURL to the end of
                // the css file, helping the browser find the sourcemap
                annotation: true,
              }
              : false,
          },
        }),
      ],
      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      splitChunks: {
        chunks: 'all',
        name: false,
      },
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      runtimeChunk: true,
    },
    resolve: {
      // 设置webpack解析模块的回退处理fallback回退
      // if there are any conflicts. This matches Node resolution mechanism.
      // https://github.com/facebook/create-react-app/issues/253
      //webpack解析模块的顺序：
      //先到node_modules文件夹中去找，
      //没有再到process.env.NODE_PATH中设置的路径中去找
      modules: ['node_modules'].concat(
        // It is guaranteed有保证的 to exist because we tweak it in `env.js`
        process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
      ),
      // These are the reasonable合理的 defaults supported by the Node ecosystem生态系统.
      // We also include JSX as a common component filename extension to support
      // some tools, although we do not recommend using it, see:
      // https://github.com/facebook/create-react-app/issues/290
      // `web` extension prefixes have been added for better support
      // for React Native Web.
      //自动解析确定的扩展。默认值为：extensions: [".js", ".json"]
      //能够使用户在引入模块时不带扩展：
      //import File from '../path/to/file'
      //使用此选项，会覆盖默认数组，这就意味着 webpack 将不再尝试使用默认扩展来解析模块。
      //对于使用其扩展导入的模块，例如，import SomeFile from "./somefile.ext"，
      //要想正确的解析，一个包含“*”的字符串必须包含在数组中。
      extensions: paths.moduleFileExtensions
        .map(ext => `.${ext}`)
        .filter(ext => useTypeScript || !ext.includes('ts')),
      alias: {
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        'react-native': 'react-native-web',
      },
      //应该使用的额外的解析插件列表。它允许插件
      plugins: [
        // Adds support for installing with Plug'n'Play即插即用, 
        // leading to faster installs and adding
        // guards against防止 forgotten dependencies and such.
        PnpWebpackPlugin,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        // new ModuleScopePlugin(appSrc: string | string[], allowedFiles?: string[])
        // 这个webpack插件让你只能从src目录或第一个参数数组中的其它目录中引入文件
        // 而不能从其它目录引入
        // 第二个参数是例外的文件
        // 如果一个项目引用两个src文件夹(/src and /docs/src)。
        // ModuleScopePlugin将不允许你从/docs/src中import文件，
        // 而只能从src中引入文件，可按以下步骤解决这个问题
        // In config/paths.js, add docsSrc: resolveApp('docs')
        // In config/webpack.config.dev.js, modify 
        // new ModuleScopePlugin(paths.appSrc, [paths.appPackageJson]), 
        // to new ModuleScopePlugin([paths.appSrc, paths.docsSrc], [paths.appPackageJson]),
        new ModuleScopePlugin(paths.appSrc, [paths.appPackageJson]),
      ],
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(module),
      ],
    },
    module: {
      //strictExportPresence呈现 makes missing exports an error instead of warning
      strictExportPresence: true,
      rules: [
        // Disable require.ensure as it's not a standard language feature.
        { parser: { requireEnsure: false } },

        // First, run the linter.
        // It's important to do this before Babel processes the JS.
        {
          // Rule.test 是 Rule.resource.test 的简写。
          // 如果你提供了一个 Rule.test 选项，就不能再提供 Rule.resource
          test: /\.(js|mjs|jsx)$/,
          enforce: 'pre',
          use: [
            {
              options: {
                formatter: require.resolve('react-dev-utils/eslintFormatter'),
                eslintPath: require.resolve('eslint'),

              },
              loader: require.resolve('eslint-loader'),
            },
          ],
          include: paths.appSrc,
        },
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: [
            // "url" loader works like "file" loader except that it embeds assets
            // smaller than specified limit in bytes as data URLs to avoid requests.
            // A missing `test` is equivalent to a match.
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              loader: require.resolve('url-loader'),
              options: {
                limit: 10000,
                //转换后的路径及文件名
                name: 'static/media/[name].[hash:8].[ext]',
              },
            },
            // Process application JS with Babel.
            // The preset includes JSX, Flow, TypeScript, and some ESnext features.
            {
              test: /\.(js|mjs|jsx|ts|tsx)$/,
              include: paths.appSrc,
              loader: require.resolve('babel-loader'),
              options: {
                customize: require.resolve(
                  'babel-preset-react-app/webpack-overrides'
                ),

                plugins: [
                  [
                    require.resolve('babel-plugin-named-asset-import'),
                    {
                      loaderMap: {
                        svg: {
                          ReactComponent:
                            '@svgr/webpack?-prettier,-svgo![path]',
                        },
                      },
                    },
                  ],
                ],
                // This is a feature of `babel-loader` for webpack (not Babel itself).
                // It enables caching results in ./node_modules/.cache/babel-loader/
                // directory for faster rebuilds.
                cacheDirectory: true,
                cacheCompression: isEnvProduction,
                //compact紧凑
                compact: isEnvProduction,
              },
            },
            // Process any JS outside of the app with Babel.
            // Unlike the application JS, we only compile编译 the standard ES features.
            {
              test: /\.(js|mjs)$/,
              exclude: /@babel(?:\/|\\{1,2})runtime/,
              loader: require.resolve('babel-loader'),
              options: {
                babelrc: false,
                configFile: false,
                compact: false,
                presets: [
                  [
                    require.resolve('babel-preset-react-app/dependencies'),
                    { helpers: true },
                  ],
                ],
                cacheDirectory: true,
                cacheCompression: isEnvProduction,

                // If an error happens in a package, it's possible to be
                // because it was compiled. Thus, we don't want the browser
                // debugger to show the original code. Instead, the code
                // being evaluated would be much more helpful.
                sourceMaps: false,
              },
            },
            // "postcss" loader applies autoprefixer to our CSS.
            // "css" loader resolves paths in CSS and adds assets as dependencies.
            // "style" loader turns CSS into JS modules that inject <style> tags.
            // In production, we use MiniCSSExtractPlugin to extract that CSS
            // to a file, but in development "style" loader enables hot editing
            // of CSS.
            // By default we support CSS Modules with the extension .module.css
            {
              test: cssRegex,
              exclude: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction && shouldUseSourceMap,
              }),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
            // using the extension .module.css
            {
              test: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction && shouldUseSourceMap,
                modules: true,
                getLocalIdent: getCSSModuleLocalIdent,
              }),
            },
            // Opt-in support for SASS (using .scss or .sass extensions).
            // By default we support SASS Modules with the
            // extensions .module.scss or .module.sass
            {
              test: sassRegex,
              exclude: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 2,
                  sourceMap: isEnvProduction && shouldUseSourceMap,
                },
                'sass-loader'
              ),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules, but using SASS
            // using the extension .module.scss or .module.sass
            {
              test: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 2,
                  sourceMap: isEnvProduction && shouldUseSourceMap,
                  modules: true,
                  getLocalIdent: getCSSModuleLocalIdent,
                },
                'sass-loader'
              ),
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              loader: require.resolve('file-loader'),
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
              options: {
                name: 'static/media/[name].[hash:8].[ext]',
              },
            },
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.
          ],
        },
      ],
    },
    plugins: [
      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin(
        Object.assign(
          {},
          {
            inject: true,
            template: paths.appHtml,
          },
          isEnvProduction
            ? {
              minify: {
                removeComments: true,
                collapseWhitespace: true,
                //redundant多余的
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true,
              },
            }
            : undefined
        )
      ),
      // Inlines the webpack runtime script. This script is too small to warrant批准
      // a network request.
      isEnvProduction &&
      shouldInlineRuntimeChunk &&
      // 正则表达式/[.]/方括号[]中的.就表示.,不需要转义。
      new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime~.+[.]js/]),
      // Makes some environment variables available in index.html.
      // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
      // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
      // In production, it will be an empty string unless you specify "homepage"
      // in `package.json`, in which case it will be the pathname of that URL.
      // In development, this will be an empty string.
      // interpolate插入
      new InterpolateHtmlPlugin(HtmlWebpackPlugin, env.raw),
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(paths.appPath),
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
      // It is absolutely essential必须的 that NODE_ENV is set to production
      // during a production build.
      // Otherwise React will be compiled in the very slow development mode.
      new webpack.DefinePlugin(env.stringified),
      // This is necessary to emit hot updates (currently CSS only):
      isEnvDevelopment && new webpack.HotModuleReplacementPlugin(),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      isEnvDevelopment && new CaseSensitivePathsPlugin(),
      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for Webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebook/create-react-app/issues/186
      isEnvDevelopment &&
      new WatchMissingNodeModulesPlugin(paths.appNodeModules),
      isEnvProduction &&
      new MiniCssExtractPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
      }),
      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new ManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: publicPath,
      }),
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how Webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      // Generate a service worker script that will precache, and keep up to date,
      // the HTML & assets that are part of the Webpack build.
      isEnvProduction &&
      new WorkboxWebpackPlugin.GenerateSW({
        //Optional Boolean, defaulting to false
        //Whether or not the service worker should start controlling any existing clients as soon as it activates.
        clientsClaim: true,
        exclude: [/\.map$/, /asset-manifest\.json$/],
        //Optional String, defaulting to 'cdn'
        //Valid values are 'cdn', 'local', and 'disabled.
        //将为workbox运行时库使用一个URL
        importWorkboxFrom: 'cdn',
        navigateFallback: publicUrl + '/index.html',
        //Optional Array of RegExp, defaulting to []
        navigateFallbackBlacklist: [
          // Exclude URLs starting with /_, as they're likely an API call
          new RegExp('^/_'),
          // Exclude URLs containing a dot, as they're likely a resource in
          // public/ and not a SPA route
          new RegExp('/[^/]+\\.[^/]+$'),
        ],
      }),
      // TypeScript type checking
      useTypeScript &&
      new ForkTsCheckerWebpackPlugin({
        typescript: resolve.sync('typescript', {
          basedir: paths.appNodeModules,
        }),
        async: false,
        checkSyntacticErrors: true,
        tsconfig: paths.appTsConfig,
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'preserve',
        },
        reportFiles: [
          '**',
          '!**/*.json',
          '!**/__tests__/**',
          '!**/?(*.)(spec|test).*',
          '!**/src/setupProxy.*',
          '!**/src/setupTests.*',
        ],
        watch: paths.appSrc,
        silent: true,
        formatter: typescriptFormatter,
      }),
    ].filter(Boolean),
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty',
    },
    // Turn off performance processing because we utilize运用
    // our own hints via the FileSizeReporter
    performance: false,
  };
};
