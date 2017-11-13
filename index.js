/**
 * @module index
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const postcss = require('postcss');
const cssnano = require('cssnano');
const uglify = require('uglify-es');
const autoprefixer = require('autoprefixer');

/**
 * @function js
 * @param {Object} options
 */
module.exports = function(options) {
  options = options || {};
  options.cssnano = options.cssnano || {};

  options.uglify = Object.assign({
    ecma: 5,
    ie8: true,
    mangle: { eval: true }
  }, options.uglify);

  options.autoprefixer = Object.assign({
    add: true,
    remove: true,
    browsers: ['> 1% in CN', '> 5%', 'ie >= 8']
  }, options.autoprefixer);

  // Open cssnano use safe mode
  options.cssnano.safe = true;
  options.cssnano.autoprefixer = options.autoprefixer;

  const minify = (vinyl) => {
    const file = {};

    file[vinyl.path] = vinyl.contents.toString();

    const result = uglify.minify(file, options.uglify);

    if (result.error) {
      throw result.error;
    } else {
      vinyl.contents = new Buffer(result.code);
    }

    return vinyl;
  }

  const addons = {};

  if (options.minify) {
    addons.css = [
      function(vinyl) {
        return new Promise((resolve, reject) => {
          cssnano
            .process(vinyl.contents.toString(), options.cssnano)
            .then((result) => {
              vinyl.contents = new Buffer(result.css);

              resolve(vinyl);
            })
            .catch((error) => {
              reject(error);
            });
        });
      },
      'inline-loader',
      minify
    ];

    ['js', 'json', 'tpl', 'html'].forEach((name) => {
      addons[name] = ['inline-loader', minify];
    });
  } else {
    addons.css = [
      function(vinyl) {
        return new Promise((resolve, reject) => {
          postcss(autoprefixer(options.autoprefixer))
            .process(vinyl.contents.toString())
            .then((result) => {
              vinyl.contents = new Buffer(result.css);

              resolve(vinyl);
            })
            .catch((error) => {
              reject(error);
            });
        });
      },
      'inline-loader',
      minify
    ]
  }

  return addons;
};
