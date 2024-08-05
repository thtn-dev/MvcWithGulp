"use strict";
import { series, src, dest, parallel, watch } from "gulp";
import autoprefixer from "gulp-autoprefixer";
import babel from 'gulp-babel';
import browsersync from "browser-sync";
import concat from "gulp-concat";
import cleanCss from "gulp-clean-css";
import { deleteSync } from 'del';
import fileinclude from "gulp-file-include";
import npmdist from "gulp-npm-dist";
import newer from "gulp-newer";
import rename from "gulp-rename";
import rtlcss from "gulp-rtlcss";
import sourcemaps from "gulp-sourcemaps";
import uglify from "gulp-uglify";

import dartSass from 'sass';
import gulpSass from 'gulp-sass';
const sass = gulpSass(dartSass);

const paths = {
    baseSrc: "Assets/",
    baseDist: "wwwroot/dist/",
    baseDistAssets: "wwwroot/dist/assets/",
    baseSrcAssets: "Assets/"
}

// Clean
const clean = (done) => {
    deleteSync(paths.baseDist, done());
}

// Vendor
const vendor = function () {
    const out = paths.baseDistAssets + "vendor/";
    return src(npmdist(), { base: "./node_modules" })
        .pipe(rename(function (path) {
            path.dirname = path.dirname.replace(/\/dist/, "").replace(/\\dist/, "");
        }))
        .pipe(dest(out));
}; 
// JavaScript
const javascript = function () {
    const out = paths.baseDistAssets + "js/";

    // vendor.min.js
    src([
            paths.baseDistAssets + "vendor/bootstrap/js/bootstrap.bundle.min.js",
            paths.baseDistAssets + "vendor/jquery/jquery.min.js"
        ])
        .pipe(concat("vendor.js"))
        .pipe(rename({ suffix: ".min" }))
        .pipe(dest(out));


    // copying and minifying all other js
    src([paths.baseSrcAssets + "js/**/*.js", `!${paths.baseSrcAssets}js/layout.js`, `!${paths.baseSrcAssets}js/main.js`])
        .pipe(uglify())
        // .pipe(rename({ suffix: ".min" }))
        .pipe(dest(out));


    // app.js (main.js + layout.js)
    return src([paths.baseSrcAssets + "js/main.js", paths.baseSrcAssets + "js/layout.js"])
        .pipe(concat("app.js"))
        .pipe(dest(out))
        .pipe(babel({
            presets: ["@babel/env"]
        }))
        .pipe(uglify())
        .pipe(rename({ suffix: ".min" }))
        .pipe(dest(out));
};
// SCSS
const scss = function () {
    const out = paths.baseDistAssets + "css/";

    return src(paths.baseSrcAssets + "scss/app.scss")
        .pipe(sourcemaps.init())
        .pipe(sass.sync()) // scss to css
        .pipe(
            autoprefixer({
                overrideBrowserslist: ["last 2 versions"]
            })
        )
        .pipe(dest(out))
        .pipe(cleanCss())
        .pipe(rename({ suffix: ".min" }))
        .pipe(sourcemaps.write("./")) // source maps
        .pipe(dest(out));

    //// generate rtl
    //return src(paths.baseSrcAssets + "scss/app.scss")
    //    .pipe(sourcemaps.init())
    //    .pipe(gulp_sass.sync()) // scss to css
    //    .pipe(
    //        autoprefixer({
    //            overrideBrowserslist: ["last 2 versions"]
    //        })
    //    )
    //    .pipe(rtlcss())
    //    .pipe(rename({ suffix: "-rtl" }))
    //    .pipe(dest(out))
    //    .pipe(CleanCSS())
    //    .pipe(rename({ suffix: ".min" }))
    //    .pipe(sourcemaps.write("./")) // source maps
    //    .pipe(dest(out));
};
// Live browser loading
const initBrowserSync = function (done) {
    const startPath = "/index.html";
    browsersync.init({
        startPath: startPath,
        server: {
            baseDir: paths.baseDist,
            middleware: [
                function (req, res, next) {
                    req.method = "GET";
                    next();
                }
            ]
        }
    });
    done();
}
const reloadBrowserSync = function (done) {
    browsersync.reload();
    done();
}

// Watch files
const watchFiles = function () {
    watch(paths.baseSrc + "scss/**/*", series(scss));
    watch(paths.baseSrc + "js/**/*", series(javascript));
}

export default series(
    vendor,
    parallel(javascript, scss),
    parallel(watchFiles)
);

export const build = series(
    clean,
    vendor,
    parallel(javascript, scss)
);