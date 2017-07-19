'use strict';

var postcss = require('postcss');
var cssnano = require('cssnano');
var uglify = require('uglify-es');
var through = require('@nuintun/through');
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

  var minify = through(function(vinyl, encoding, next) {
    var file = {};

    file[vinyl.path] = vinyl.contents.toString();

    var result = uglify.minify(file, options.uglify);

    if (result.error) {
      return next(result.error);
    }

    vinyl.contents = new Buffer(result.code);

    next(null, vinyl);
  });

  var addons = {};

  if (options.minify) {
    addons.css = [
      through(function(vinyl, encoding, next) {
        cssnano
          .process(vinyl.contents.toString(), options.cssnano)
          .then(function(result) {
            vinyl.contents = new Buffer(result.css);

            next(null, vinyl);
          })
          .catch(function(error) {
            next(error);
          });
      }),
      'inline-loader',
      minify
    ];

    ['js', 'json', 'tpl', 'html'].forEach(function(name) {
      addons[name] = ['inline-loader', minify];
    });
  } else {
    addons.css = [
      through(function(vinyl, encoding, next) {
        postcss(autoprefixer(options.autoprefixer))
          .process(vinyl.contents.toString())
          .then(function(result) {
            vinyl.contents = new Buffer(result.css);

            next(null, vinyl);
          })
          .catch(function(error) {
            next(error);
          });
      }),
      'inline-loader',
      minify
    ]
  }

  return addons;
};
