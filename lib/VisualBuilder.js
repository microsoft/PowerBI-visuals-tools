var fs = require('fs-extra');
var path = require('path');
var gulp = require('gulp-4.0.build');
var ts = require('gulp-typescript');
var sourceMaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var Q = require('q');
var merge = require('merge2');
var less = require('gulp-less');
var header = require('gulp-header');
var footer = require('gulp-footer');
var scriptPath = __dirname;

var config = {
    drop: '.bin/',
    visualJS: 'visual.js',
    visualCSS: 'visual.css'    
}

function buildSourcesTask() {
    var tsProject = ts.createProject('tsconfig.json', { sortOutput: true });
    var tsResult = tsProject.src().pipe(sourceMaps.init()).pipe(ts(tsProject));
    return tsResult.js
        .pipe(concat(config['visualJS']))
        .pipe(sourceMaps.write('./', { includeContent: false, sourceRoot: '/' }))
        .pipe(gulp.dest(config['drop']))
}

function buildLessTask() {
    var src = gulp.src([
        '!node_modules',
        '!node_modules/**',
        '**/*.less'])

    return src.pipe(header('.debugVisual' + ' {\n'))
        .pipe(footer('}'))
        .pipe(less())
        .pipe(concat(config['visualCSS']))
        .pipe(gulp.dest(config['drop']))
}

/**
 * Represents an instance of a visual builder based on file path
 * @param {string} path - file path to root of visual
 */
function VisualBuilder(path) {
    this.path = path; // unused
}

/**
 * Compiles visual sources & styles
 */
VisualBuilder.prototype.build = function(){
    var promise = Q.defer();
    merge([buildSourcesTask(), buildLessTask()]).on('end', function(){
       promise.resolve(); 
    });
    return promise.promise;
}

module.exports = VisualBuilder;