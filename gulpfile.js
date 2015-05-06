
var gulp = require('gulp');
var ts = require('gulp-typescript');
var del = require('del');
var merge = require('merge2');

var config = require('./tsConfig.json');

var distDir = 'dist';

var compilerOpts = config.compilerOptions;
compilerOpts.typescript = require('typescript'); // Update the compiler version for now

var files = config.filesGlob;

gulp.task('clean', function(cb) {
  del(distDir, cb);
});

gulp.task('build', ['clean'], function() {
  var tsResult = gulp.src(files)
    .pipe(ts(compilerOpts));

  return merge([
    tsResult.dts.pipe(gulp.dest('dist/definitions')),
    tsResult.js.pipe(gulp.dest('dist'))
  ]);
});

gulp.task('default', ['build']);
