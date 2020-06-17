/**
 * @module index
 * @license MIT
 * @version 2018/03/29
 */

'use strict';

const terser = require('terser');
const postcss = require('postcss');
const cssnano = require('cssnano');
const babel = require('@babel/core');
const autoprefixer = require('autoprefixer');
const { extname, relative } = require('path');

/**
 * @function unixify
 * @description Convert path separators to posix/unix-style forward slashes.
 * @param {string} path
 * @returns {string}
 */
const unixify = path => path.replace(/\\/g, '/');

/**
 * @function isFileType
 * @param {string} path
 * @param {string} type
 * @returns {boolean}
 */
const isFileType = (path, type) => extname(path).toLowerCase() === `.${type}`;

/**
 * @function babelTransform
 * @param {string} path
 * @param {Object} options
 */
function babelTransform(path, contents, options) {
  const sourceMaps = options.sourceMaps;
  // Babel config
  const config = Object.assign({}, options.babel, {
    sourceMaps,
    ast: false,
    filename: path,
    highlightCode: true,
    sourceFileName: sourceMaps ? `/${unixify(relative(options.root, path))}` : path
  });

  // Babel transform
  try {
    const result = babel.transform(contents, config);

    // Get transformed code
    if (result) contents = result.ignored ? contents : result.code;
  } catch (error) {
    // Babel syntax error
    throw error;
  }

  return contents;
}

/**
 * @function js
 * @param {Object} options
 */
module.exports = function (options = {}) {
  options.cssnano = options.cssnano || {};
  options.terser = Object.assign(
    {
      ie8: true,
      mangle: { eval: true }
    },
    options.terser
  );
  options.autoprefixer = Object.assign(
    {
      add: true,
      remove: true
    },
    options.autoprefixer
  );
  options.cssnano.from = undefined;
  options.cssnano.autoprefixer = options.autoprefixer;

  // Bable parsed file
  const babelParsed = new Set();
  // Out source maps
  const sourceMaps = options.sourceMaps === false ? false : 'inline';

  return {
    name: 'gulp-cmd-plugins',
    async moduleDidLoad(path, contents, { root }) {
      if (!isFileType(path, 'js')) return contents;

      // Get contents string
      contents = contents.toString();

      // Babel trnasform
      contents = babelTransform(path, contents, { root, sourceMaps, babel: options.babel });

      // Set babel trnasform cache
      babelParsed.add(path);

      return contents;
    },
    async moduleDidParse(path, contents, { root }) {
      if (!isFileType(path, 'css')) return contents;

      // Get contents string
      contents = contents.toString();

      // Process css file
      const result = options.minify
        ? await cssnano.process(contents, options.cssnano)
        : await postcss(autoprefixer(options.autoprefixer)).process(contents, {
            from: path,
            map: sourceMaps ? { inline: sourceMaps, from: `/${unixify(relative(root, path))}` } : null
          });

      contents = result.css;

      return contents;
    },
    async moduleDidTransform(path, contents, { root }) {
      if (babelParsed.has(path) || !isFileType(path, 'js')) return contents;

      // Get contents string
      contents = contents.toString();

      // Babel trnasform
      contents = babelTransform(path, contents, { root, sourceMaps, babel: options.babel });

      return contents;
    },
    async moduleDidComplete(path, contents) {
      if (!isFileType(path, 'js')) return contents;

      // Get contents string
      contents = contents.toString();

      // Uglify minify
      if (options.minify) {
        const result = terser.minify({ [path]: contents }, options.terser);

        // Get minify code
        contents = result.error ? contents : result.code;
      }

      // Delete babel trnasform cache
      babelParsed.delete(path);

      return contents;
    }
  };
};
