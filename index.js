/**
 * @module index
 * @license MIT
 * @version 2018/03/29
 */

'use strict';

const postcss = require('postcss');
const cssnano = require('cssnano');
const uglify = require('uglify-es');
const babel = require('@babel/core');
const autoprefixer = require('autoprefixer');
const { extname, relative } = require('path');

/**
 * @function toBuffer
 * @param {string} string
 * @returns {Buffer}
 */
const toBuffer = Buffer.from ? Buffer.from : string => new Buffer(string);

/**
 * @function isFileType
 * @param {string} path
 * @param {string} type
 * @returns {boolean}
 */
const isFileType = (path, type) => extname(path).toLowerCase() === `.${type}`;

/**
 * @function js
 * @param {Object} options
 */
module.exports = function(options = {}) {
  options.cssnano = options.cssnano || {};
  options.uglify = Object.assign(
    {
      ecma: 5,
      ie8: true,
      mangle: { eval: true }
    },
    options.uglify
  );
  options.autoprefixer = Object.assign(
    {
      add: true,
      remove: true,
      browsers: ['> 0.5% in CN', '> 1%', 'ie >= 8']
    },
    options.autoprefixer
  );
  // Open cssnano use safe mode
  options.cssnano.safe = true;
  options.cssnano.autoprefixer = options.autoprefixer;

  return {
    name: 'gulp-cmd-plugins',
    async transform(path, contents) {
      if (!isFileType(path, 'css')) return contents;

      // Get contents string
      contents = contents.toString();

      // Process css file
      const result = options.minify
        ? await cssnano.process(contents, options.cssnano)
        : await postcss(autoprefixer(options.autoprefixer)).process(contents, { from: path });

      // To buffer
      contents = toBuffer(result.css);

      return contents;
    },
    bundle(path, contents, { base }) {
      if (!isFileType(path, 'js')) return contents;

      // Get contents string
      contents = contents.toString();

      // Babel config
      const rpath = relative(base, path);
      const config = Object.assign({}, options.babel, {
        filename: path,
        filenameRelative: rpath
      });

      // Format source maps
      config.sourceMaps = config.sourceMaps === false ? false : 'inline';

      // Babel transform
      try {
        const result = babel.transform(contents, config);

        // Get transformed code
        if (result) contents = result.ignored ? contents : result.code;
      } catch (error) {
        // Babel syntax error
        throw error;
      }

      // Uglify minify
      if (options.minify) {
        const result = uglify.minify({ [path]: contents }, options.uglify);

        // Get minify code
        contents = result.error ? contents : result.code;
      }

      // To buffer
      contents = toBuffer(contents);

      return contents;
    }
  };
};
