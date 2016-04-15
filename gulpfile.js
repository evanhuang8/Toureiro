var browserify = require('browserify');
var gulp = require('gulp');
var reactify = require('reactify');
var buffer = require('vinyl-buffer');
var cssmin = require('gulp-cssmin');
var ignore =require('gulp-ignore');
var less = require('gulp-less');
var livereload = require('gulp-livereload');
var notify = require('gulp-notify');
var shell = require('gulp-shell');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var watchify = require('watchify');

var runLess = function() {
  return gulp
    .src('./views/css/toureiro.less')
    .pipe(less())
    .pipe(gulp.dest('./public/dev/css'))
    .pipe(livereload());
};

var runLessMin = function() {
  return gulp
    .src('./views/css/toureiro.less')
    .pipe(less())
    .pipe(cssmin())
    .pipe(gulp.dest('./public/css'));
}

gulp.task('less', runLess);
gulp.task('lessMin', runLessMin);

gulp.task('buildBundle', function() {
  var bundler = browserify({
    entries: './views/jsx/index.jsx',
    debug: true,
    transform: [reactify]
  });
  return bundler.bundle()
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify().on('error', gutil.log))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./public/js/'));
});

function watchBundle() {
  var watcher = watchify(browserify({
    entries: './views/jsx/index.jsx',
    debug: true,
    transform: [reactify],
    cache: {},
    packageCache: {},
    fullPaths: true
  }));
  watcher.on('update', function() {
    bundle(watcher);
  });
  watcher.on('log', gutil.log);
  bundle(watcher);
}

function bundle(bundler) {
  var start = Date.now();
  console.log('Bundling...');
  bundler
    .bundle()
    .on('error', gutil.log)
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(gulp.dest('./public/dev/js/'))
    .pipe(livereload())
    .pipe(notify(function() {
      console.log('Bundled! Process took', (Date.now() - start) + 'ms');
    }));
}

gulp.task('watchBundle', watchBundle);
gulp.task('watchLess', function() {
  runLess();
  gulp.watch('./views/css/**/*.less', ['less']);
});

gulp.task('watch', ['watchBundle', 'watchLess']);

gulp.task('livereload', function() {
  livereload.listen();
});

gulp.task('server', shell.task([
  'nodemon -w ./lib ./examples/server.js'
]));

gulp.task('dev', [
  'livereload',
  'watch',
  'server'
]);

gulp.task('build', ['buildBundle', 'lessMin']);
