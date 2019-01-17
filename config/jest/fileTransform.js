'use strict';

const path = require('path');

// This is a custom Jest transformer turning file imports into filenames.
// http://facebook.github.io/jest/docs/en/webpack.html

module.exports = {
  process(src, filename) {
    // path.basename(path[,ext])返回path的最后一部分
    // path.basename('/foo/bar/baz/asdf/quux.html');
    // 返回: 'quux.html'
    // path.basename('/foo/bar/baz/asdf/quux.html', '.html');
    // 返回: 'quux'
    // 如果 path 或 ext 不是字符串，则抛出 TypeError。
    const assetFilename = JSON.stringify(path.basename(filename));

    if (filename.match(/\.svg$/)) {
      return `module.exports = {
        __esModule: true,
        default: ${assetFilename},
        ReactComponent: (props) => ({
          $$typeof: Symbol.for('react.element'),
          type: 'svg',
          ref: null,
          key: null,
          props: Object.assign({}, props, {
            children: ${assetFilename}
          })
        }),
      };`;
    }

    return `module.exports = ${assetFilename};`;
  },
};
