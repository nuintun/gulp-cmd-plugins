'use strict';

var postcss = require('postcss');
var cssnano = require('cssnano');
var uglify = require('uglify-es');
var cmd = require('@nuintun/gulp-cmd');
var autoprefixer = require('autoprefixer');

var defAddons = cmd.defaults.plugins;

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

  // cssnano use safe mode
  options.cssnano.safe = true;
  options.cssnano.autoprefixer = options.autoprefixer;

  function minify(vinyl) {
    return new Promise(function(resolve, reject) {
      try {
        var result = uglify.minify(vinyl.contents.toString(), options.uglify);

        vinyl.contents = new Buffer(result.code);
      } catch (error) {
        reject(error);
      }

      resolve(vinyl);
    });
  }

  var addons = {};

  if (options.minify) {
    addons.css = [
      function(vinyl) {
        return new Promise(function(resolve, reject) {
          cssnano
            .process(vinyl.contents.toString(), options.cssnano)
            .then(function(result) {
              vinyl.contents = new Buffer(result.css);

              resolve(vinyl);
            })
            .catch(function(error) {
              reject(error);
            });
        });
      },
      defAddons.css,
      minify
    ];

    ['js', 'json', 'tpl', 'html'].forEach(function(name) {
      addons[name] = [defAddons[name], minify];
    });
  } else {
    addons.css = [
      function(vinyl) {
        return new Promise(function(resolve, reject) {
          postcss(autoprefixer(options.autoprefixer))
            .process(vinyl.contents.toString())
            .then(function(result) {
              vinyl.contents = new Buffer(result.css);

              resolve(vinyl);
            })
            .catch(function(error) {
              reject(error);
            });
        });
      },
      defAddons.css,
      minify
    ]
  }

  return addons;
};
