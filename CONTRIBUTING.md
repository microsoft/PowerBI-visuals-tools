#How To Contribute

If you would like to contribute to the PowerBI Custom Visuals CLI Tools there are many ways you can help.

##Report issues

First, please do a search in open issues to see if the issue or feature request has already been filed. If there is an issue add your comments to this issue.

If your issue is a question then please ask the question on Stack Overflow using the tags `PowerBI` and `pbiviz`

##Contributing Code

If you would like to contribute a fix or change follow these steps

* Search [issues on github](https://github.com/microsoft/powerbi-visuals-tools/issues) to ensure your issue isn't a duplicate
    * If your issue or feature is a duplicate feel free to join the conversation
* [Create an issue](https://github.com/Microsoft/PowerBI-visuals-tools/issues/new) with a feature request / bug so we can discuss the change
* Submit a pull request by following the proccess below

####Build from source

* Install dependencies
* Fork this reporitory
* Clone your fork using git
* Navigate into the repository directory
* Run `npm install` to install all dependencies
* Run `npm uninstall -g powerbi-visuals-tools` to remove your global version
* Run `npm link` to link the repo version of the module globally

Note: If pbiviz isn't working globally you may need to restart your terminal.

####Running and modifying

Once the repository is linked you can run `pbiviz` anywhere on your computer and it will reference the repository version. This makes it easy to make modifications and test them instantly.

####Testing and submitting

Simply run `npm test` to run our end to end test suite and code style checks. Be sure to run this locally before submitting a pull request as the tests will be run by our CI platform and automatically reject the PR if it fails.

####Dependencies

Before you can run (or install) the command line tools you must install NodeJS.

* NodeJS 4.0+ Required (5.0 recommended) - [Download NodeJS](https://nodejs.org)

