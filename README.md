[![Npm Version](https://img.shields.io/npm/v/powerbi-visuals-tools.svg?style=flat)](https://www.npmjs.com/package/powerbi-visuals-tools)
[![Npm Downloads](https://img.shields.io/npm/dm/powerbi-visuals-tools.svg?style=flat)](https://www.npmjs.com/package/powerbi-visuals-tools)
![Build](https://github.com/microsoft/powerbi-visuals-tools/workflows/build/badge.svg) 
[![Build status](https://ci.appveyor.com/api/projects/status/ogws5ib33i35o5hs/branch/master?svg=true)](https://ci.appveyor.com/project/spatney/powerbi-visuals-tools)
[![Code Climate](https://codeclimate.com/github/Microsoft/PowerBI-visuals-tools/badges/gpa.svg)](https://codeclimate.com/github/Microsoft/PowerBI-visuals-tools)

# PowerBI Visual Tools (pbiviz)

The easiest way to create custom visuals is by using the PowerBI command line tools which can be easily to installed via NPM. The command line tools provide everything you need to develop visuals and test them in live PowerBI reports and dashboards.

**Features:**

* Visual project generation
* TypeScript compilation
* Less compilation
* Automatic live reload
* pbiviz packaging (for distribution)

## Basic Setup

Before you can get started you'll need to install the tools. This should only take a few seconds.

#### Dependencies

Before you can run (or install) the command line tools you must install NodeJS.

* NodeJS 18.0+ Required - [Download NodeJS](https://nodejs.org)

#### Installation

To install the command line tools simply run the following command

```
npm install -g powerbi-visuals-tools
```

To confirm it was installed correctly you can run the command without any parameters which should display the help screen.

```
pbiviz
```

## How to build a visual?
Refer to our [documentation repository](https://learn.microsoft.com/en-us/power-bi/developer/visuals/develop-circle-card)

## Usage

You can learn more about using these tools in the following guides

* [Usage Guide](https://learn.microsoft.com/en-us/power-bi/developer/visuals/develop-circle-card#create-a-development-project)
* [Debugging Guide](https://learn.microsoft.com/en-us/power-bi/developer/visuals/visuals-how-to-debug)

## PowerBI Visuals Tools Changes

* [Change Log](https://github.com/Microsoft/PowerBI-visuals-tools/blob/master/Changelog.md)

## Visuals API Changes

* [API Change Log](https://github.com/microsoft/PowerBI-visuals-tools/blob/master/Changelog.md)

## Contributing

If you would like to contribute please see [How To Contribute](https://github.com/Microsoft/PowerBI-visuals-tools/blob/master/CONTRIBUTING.md).
