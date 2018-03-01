# Change Log - PowerBI Visual Tools (pbiviz)

This page contains information about changes to the PowerBI Visual Tools (pbiviz).

## pbiviz v1.10.2
* Add `pbiviz --create-cert` for generating new unique certificate

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
