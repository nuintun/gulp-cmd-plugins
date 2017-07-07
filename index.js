'use strict';

var postcss = require('postcss');
var cssnano = require('cssnano');
var uglify = require('uglify-es');
var cmd = require('@nuintun/gulp-cmd');
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

  var addons = {};

  if (options.minify) {
    addons.css = function(vinyl, options, next) {
      var context = this;

      cssnano
        .process(vinyl.contents.toString(), options.cssnano)
        .then(function(result) {
          vinyl.contents = new Buffer(result.css);

          cmd.defaults.plugins.css.process(vinyl, options, function(vinyl) {
            try {
              var result = uglify.minify(vinyl.contents.toString(), options.uglify);

              vinyl.contents = new Buffer(result.code);
            } catch (error) {
              // no nothing
            }

            context.push(vinyl);
            next();
          });
        });
    };

    ['js', 'json', 'tpl', 'html'].forEach(function(name) {
      addons[name] = function(vinyl, options, next) {
        var context = this;

        // transform
        cmd.defaults.plugins[name].process(vinyl, options, function(vinyl) {
          try {
            var result = uglify.minify(vinyl.contents.toString(), options.uglify);

            vinyl.contents = new Buffer(result.code);
          } catch (error) {
            // no nothing
          }

          context.push(vinyl);
          next();
        });
      }
    });
  } else {
    addons.css = function(vinyl, options, next) {
      var context = this;

      postcss(autoprefixer(options.autoprefixer))
        .process(vinyl.contents.toString())
        .then(function(result) {
          vinyl.contents = new Buffer(result.css);

          cmd.defaults.plugins.css.process(vinyl, options, function(vinyl) {
            try {
              var result = uglify.minify(vinyl.contents.toString(), options.uglify);

              vinyl.contents = new Buffer(result.code);
            } catch (error) {
              // no nothing
            }

            context.push(vinyl);
            next();
          });
        });
    };
  }

  return addons;
};
