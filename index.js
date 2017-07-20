'use strict';

var postcss = require('postcss');
var cssnano = require('cssnano');
var uglify = require('uglify-es');
var autoprefixer = require('autoprefixer');

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
    var file = {};

    file[vinyl.path] = vinyl.contents.toString();

    var result = uglify.minify(file, options.uglify);

    if (result.error) {
      throw result.error;
    } else {
      vinyl.contents = new Buffer(result.code);
    }

    return vinyl;
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
      'inline-loader',
      minify
    ];

    ['js', 'json', 'tpl', 'html'].forEach(function(name) {
      addons[name] = ['inline-loader', minify];
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
      'inline-loader',
      minify
    ]
  }

  return addons;
};
