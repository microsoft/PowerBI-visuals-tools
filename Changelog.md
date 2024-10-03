# Change Log - PowerBI Visual Tools (pbiviz)

This page contains information about changes to the PowerBI Visual Tools (pbiviz).

## 5.6.0
* Updated to ESLint v9
* Updated to TypeScript v5
* `--use-default` flag for `pbiviz package` and `pbiviz lint` commands is deprecated. Recommeded config is used by default

## 5.5.1
* Fixed subtotal feature check

## 5.5.0
* Changed path for storing certificates. It allows the certificate to be reused regardless of tools version. New path is `({home directory}/pbiviz-certs)`.
* Windows version lower 10 is deprecated.
* Resolve of symlinks is disabled.

## 5.4.3
* Fixed bug with missing plugins for Eslint.
* New flag `--use-default` for `pbiviz package` and `pbiviz lint` commands. Use this command to lint files according to recommended lint config.

## 5.4.2
* Added the **node: false** option to the webpack plugin to eliminate the use of the potentially dangerous **new Function()** method, which ensures compatibility with the Node.js runtime.
* Introduced support for *.mjs ECMAScript modules.

## 5.4.1
* Updated R-based visuals settings.ts file to work properly with the new API

## 5.4.0
* Updated packages
* New command `pbiviz lint` to run lint check from tools. It'll use eslintrc file from the root of the visual, if there is no such file, recommended one will be used instead.

## 5.3.0
* Updated packages
* Updated to Typescript 5.0 **⚠**
* New flag `--pbiviz-file` to specify path to pbiviz.json file

## 5.2.1
* Fixed errors output when packaging the visual
* Fixed `RHTML` template render error

## 5.2.0
* Integrated PAC validation

## 5.1.1
* Updated crypto import to fix error in old Node versions

## 5.1.0
* New flag `--skip-api` to skip verifying api version. It might produce different errors in visual, so use it only in some specific cases (ex. installing something during the build process brakes packages managed by monorepo managers).
* New flag `--all-locales` to disable optimization using localization loader. It's recommended not to use this flag because all locales take a huge amount of package size. If you need just a few of them follow [this guide](https://learn.microsoft.com/en-us/power-bi/developer/visuals/localization?tabs=English#step-5---add-a-resources-file-for-each-language). In this case, only declared in stringResources locales will be added to your visual package.

## 5.0.3
* Now option `--install-cert` is command. The new usage is `pbiviz install-cert` **⚠**

## 5.0.3
* Now option `--install-cert` is command. New usage is `pbiviz install-cert`
* Fixed bug with the incorrect detection of the installed API version

## 5.0.2
* Implemented common solution for webpack loaders on different environments

## 5.0.1
* Fixed broken imports in webpack.config for some cases

## 5.0.0
* Migrated to TypeScript
* Migrated to eslint
* Fixed vulnerabilities
* Migrated to newest CommanderJS
* Migrated to NodeJS 18.0 **⚠**

## 4.3.2
* `options` in `Visual.constructor()` is optional. It's made to match PowerBI interface and to support strict mode
* LocalizationLoader has been moved to `powerbi-visuals-webpack-plugin`

## 4.3.1
* Fixed path to localization loader

## 4.3.0
* Implemented new flag `--no-stats` to disable statistics files
* Fixed vulnerabilities

## 4.2.1
* Replaced `base64-inline-loader` with webpack `asset/inline`

## 4.2.0
* Fixed vulnerabilities
* Updated `powerbi-visuals-webpack-plugin` to 3.2.0


### **⚠ BREAKING CHANGES**
## 4.1.0
* Added loader to reduce localizations size. REQUIRES `powerbi-visuals-utils-formattingutils` version 5.1 and higher.
  
    Now loader deletes all unused in stringResources folder locales.

* Fixed vulnerabilities

## 4.0.9
* Fixed vulnerabilities

## 4.0.8
* Reverted to stable version
* Removed vulnerabilities

## 4.0.7
### **⚠ NOT RECOMMENDED** - critical bugs discovered for some cases
* StringResources (Localizations) are supported in Developer Mode.
* Update `powerbi-visuals-webpack-plugin` to 3.1.0
* Fixed vulnerabilities

## 4.0.6
Update templates visuals to:
* Support new visuals-api version 5.1.0
* Replace `enumerateObjectInstances` by `getFormattingModel` API
* Import and use `powerbi-visuals-utils-formattingmodel`

## 4.0.5
* Updated dependencies, fixed npm audit issues

## 4.0.3 - 4.0.4
### **⚠ BREAKING CHANGES**
* Removed polyfills and 'Internet Explorer` browser support
* Removed `--target` option for `pbiviz-start` and `pbiviz-package` commands

## 4.0.2
* Fix custom visual package upload to desktop version of PowerBI
* Removed environment logging in this version 
* Downgraded "powerbi-visuals-webpack-plugin"

## 4.0.0
* This release version includes changes from previous betta versions: 3.4.0, 3.4.1, 3.4.2, 3.4.3.

## 3.4.3

* Updated webpack assets compilation
* Added environment logging for debugging purposes
* Fixed certificate date verification for different regional settings

## 3.4.2

* Migrated from `request` lib to node `https` standard method
* Removed `friendly-errors-webpack-plugin` usage
* Removed or updated deprecated dependencies
* Fixed vulnerabilities

## 3.4.1

* Fixed certificate verification for 'non-english' environment

## 3.4.0

### **⚠ BREAKING CHANGES**

* Removed old API ( 2.6.0 and bellow) templates logic
* Removed `pbiviz-update` method
* Removed `--api [version]` flag
* Migrated to `webpack-dev-server` v4

## 3.3.2

* Extended `"powerbi-visuals-api"` usage up to version 3.2.0 and higher

## 3.3.1

* Fixed certificate issues
* Fixed an issue when previous API version was used for a new package build

## 3.3.0

### **⚠ BREAKING CHANGES**

* Starting from tools version 3.3.0, it expects usage of ["powerbi-visuals-api": ">=3.8.0"](https://github.com/microsoft/powerbi-visuals-api/blob/master/CHANGELOG.md#382)

### **Features**

* Added support for CV modal dialog

## 3.2.2

* Removed npm-force-resolutions package

## 3.2.1

* Fixed preinstall to prevent instalation failure because of npm-force-resolutions
* Fixed pbiviz.json dependencies option usage

## 3.2.0

* Fixed LessCompiler for old visuals

## 3.1.19

* Fixed webpack Node.js polyfill issue in webpack 5+"

## 3.1.18

* Removed deprecated packages

## 3.1.16

* Added visuals compatibility with webpack v5
* Removed lodash: _.template, ._findindex, .difference
* Packages update

## 3.1.15

* Webpack plugin update
* npm audit package-lock patch

## 3.1.14

* Fix output library name for debug mode

## 3.1.12

* Command package rolling back to fix issues with some commands running

## 3.1.11

* Packages update. Fixed <https://github.com/microsoft/PowerBI-visuals-tools/issues/304>

## 3.1.10

* Packages update: Uglify-js is replaced by Terser

## 3.1.9

* Fix loading the old visual projects
* Fix loading old [`formattingutils`](https://github.com/microsoft/powerbi-visuals-utils-formattingutils/tree/72a136aca836e60042be35b1cd2ae10a07837ba8) in the old visual projects.

## 3.1.8

* Update `powerbi-visuals-webpack-plugin` to 2.2.1

## 3.1.7

* Fix vscode workspace settings template
* Fix certificate tool error handling

## 3.1.6

* Fix webpack configureation include regex
* Templates update

## 3.1.5

* Templates update

## 3.1.4

* Packages update

## 3.1.3

* Remove `@babel/polyfill`
* Replace `webpack-visualizer-plugin` by `webpack-bundle-analyzer`

## 3.1.2

* Add extensions for *.svg*.eot files to `base64-inline-loader` configuration
* Exclude `code-js` package to process by Babel
* Include `@babel/plugin-syntax-dynamic-import` plugin for Babel
* Update `core-js` package to version 3.x.x.

## 3.1.1

* Add `base64-inline-loader` to load images

## pbiviz v3.1.0

* Release. Now Webpack is default builder for Custom Visuals.
* What’s new in powerbi-visuals-tools v3?
  * TypeScript v3.0.1 by default
  * ES6 Modules supported
  * New versions of D3v5 and other external libraries are supported
  * Reduced package size
  * Improved API performance
* For the full details please check [this article](https://microsoft.github.io/PowerBI-visuals/docs/how-to-guide/migrating-to-powerbi-visuals-tools-3-0/).

## pbiviz v2.5.0

* Added Analytics Pane support
Note: API v2.4.0 skipped as it does not include any public changes

## pbiviz v2.3.0

* custom visuals now support a landing page

## pbiviz v2.2.2

* Update package-lock.json to fix vulnerabilities

## pbiviz v2.2.1

* Deprecated `applySelectionFilter` from `ISelectionManager`

## pbiviz v3.0.12 Beta

* Compression option for compressing visual package
* Fix launch webpack build triggering
* Update powerbi-visuals-webpack-plugin to 2.1.0

## pbiviz v3.0.11 Beta

* Add support to import *.css and*.less files
* Fix reloading capabilities.json
* Resolve issue of starting dev server after copy certs from global instance
* Serve old visual project by nodejs server instead webpack dev server

## pbiviz v3.0.10 Beta

* Resolve dev server certificates from global instance of pbiviz.
* Replace VisualServer.js by webpack-dev-server

## pbiviz v3.0.9 Beta

* Set `sourceType` to "unambiguous" for babel configuration

## pbiviz v3.0.8 Beta

* Update powerbi-visuals-webpack-plugin to 2.0.0
* Remove minification by babel (remove `babel-preset-minify` package).

## pbiviz v3.0.7 Beta

* Update powerbi-visuals-webpack-plugin to 1.0.15

## pbiviz v3.0.6 Beta

* Install the latest patch of `powerbi-visuals-api`
* The `pbiviz.json` values of visual templates overrides global template values
* Remove unnecessary `setApiVersion` and `updateApi` from `VisualGenerator`
* Fix including styles into visual package
* Update powerbi-visuals-plugin to version 1.0.13

## pbiviz v3.0.5 Beta

* Prevent using define function in context of module

## pbiviz v3.0.4 Beta

* Update powerbi-visuals-plugin to version 1.0.11

## pbiviz v3.0.3 Beta

* Update powerbi-visuals-plugin to version 1.0.10
* Remove jasmine-node package

## pbiviz v3.0.2 Beta

* Tools observe changes in `pbiviz.json` and `capabilities.json` files and rebuild the visual.
* `webpack-visualizer-plugin` replaced by `webpack-bundle-analyzer` to visualize the webpack bundle stats.

## pbiviz v3.0.1 Beta

* Webpack based tools

## pbiviz v2.0.2

* Skip precompilation for the visual with ES6 modules

## pbiviz v2.0.1

* Update package.json. Fix package installation

## pbiviz v2.0.0

* TypeScript external modules support

## pbiviz v1.12.1

* Generate certificates on development server starts

## pbiviz v1.11.3

* Resolve PowerShell params issue on Win8.

## pbiviz v1.11.2

* Resolve PowerShell script launching issue.

## pbiviz v1.11.1

* Check certificate path in `--install-cert` command.

## pbiviz v1.11.0

* Added `selectionManager.registerOnSelectCallback()` method for Report Bookmarks support

## pbiviz v1.10.2

* Added `pbiviz --create-cert` for generating new unique certificate

## pbiviz v1.10.1

* Increase typescript to 2.3.3 version

## pbiviz v1.10.0

* Added ILocalizationManager
* Upgrade dependencies
* Added Authentication API call support

## pbiviz v1.9.0

* Added launchUrl API call support

## pbiviz v1.8.1

* FIX: Localization schema will be ignored if API doesn't support localization

## pbiviz v1.8.0

* Added new type "fillRule" (gradient) support in capabilities schema
* Added "rule" property support in capabilities schema for object properties
* Fixed sub commands help output in "Using:" section

## pbiviz v1.7.5

* Return innerHTML method for RHTML visual sample

## pbiviz v1.7.4

* Remove innerHTML method from sample visual

## pbiviz v1.7.3

* Added RESJSON support

## pbiviz v1.7.2

* Add name validation to pbiviz new command, restrict usage of symbols in the file visual name.

## pbiviz v1.7.1

* Added visual name validation
* Added auto-install npm dependencies

## pbiviz v1.6.5

* Updated npm dependencies
* Fixed settings generation

## pbiviz v1.1.0

* Fix issue in [Capabilities.objects does not support "text" type](https://github.com/Microsoft/PowerBI-visuals-tools/issues/12)
* Add `pbiviz update` to support updating visual API type definitions and schema
* Add `--api-version` flag to `pbiviz new` to support creating visuals with a specific api version
* Add support for alpha release of API v1.2.0

## pbiviz v1.0.0

Initial public release
