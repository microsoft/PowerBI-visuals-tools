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
var template = require('gulp-template');
var jsonfile = require('jsonfile');
var scriptPath = __dirname;

var config = {
    dropFolder: '.bin',
    visualJS: 'visual.js',
    visualPlugin: 'visualPlugin.js',
    visualCSS: 'visual.css'    
}

function buildSourcesTask() {
    console.log('building sources');
    var promise = Q.defer();
    var tsProject = ts.createProject('tsconfig.json', { sortOutput: true });
    var tsResult = tsProject.src().pipe(sourceMaps.init()).pipe(ts(tsProject));
    
    tsResult.js
        .pipe(concat(config['visualJS']))
        .pipe(sourceMaps.write('./', { includeContent: false, sourceRoot: '/' }))
        .pipe(gulp.dest(config['dropFolder']))
        .on('end', function(){
            promise.resolve();
        });
    return promise.promise;
}

function generatePlugin(options){
    console.log('generating plugin');
    var promise = Q.defer();
    gulp
        .src('../templates/plugin.js.template')
        .pipe(template({
            guid: options.guid,
            className: options.className,
            version: options.version,
            versionstring: options.apiVersion
        }))
        .pipe(concat(config['visualPlugin']))
        .pipe(gulp.dest(config['dropFolder']))        
        .on('end', function(){
            promise.resolve();
        });
    return promise.promise;
}

function buildLessTask() {
    console.log('building styles');
    var promise = Q.defer();
    gulp.src([
        '!node_modules',
        '!node_modules/**',
        '**/*.less'])
        .pipe(header('.debugVisual' + ' {\n'))
        .pipe(footer('}'))
        .pipe(less())
        .pipe(concat(config['visualCSS']))
        .pipe(gulp.dest(config['dropFolder']))
        .on('end', function(){
            promise.resolve();
        });
    return promise.promise;
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
    var cf = jsonfile.readFileSync('pbiviz.json')
    
    var opts = {
        guid: cf.guid,
        className: cf.visualClassName,
        version: 'v100',
        apiVersion: cf.apiVersion
    }
    return Q.all([buildSourcesTask(), buildLessTask(), generatePlugin(opts)]);
}

module.exports = VisualBuilder;