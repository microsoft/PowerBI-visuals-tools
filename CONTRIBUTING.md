# How To Contribute

If you would like to contribute to the PowerBI Custom Visuals CLI Tools there are many ways you can help.

## Report issues

First, please do a search in open issues to see if the issue or feature request has already been filed. If there is an issue add your comments to this issue.

If your issue is a question then please ask the question on Stack Overflow using the tags `PowerBI` and `pbiviz`.

* [PowerBI-visuals-tools issue page](https://github.com/Microsoft/PowerBI-visuals-tools/issues) - Issues related to the CLI tools specifically
* [PowerBI-visuals issue page](https://github.com/Microsoft/PowerBI-visuals/issues) - Any other issues related to Power BI visuals

## Contributing Code

If you would like to contribute a fix or change follow these steps

* Search [issues on github](https://github.com/microsoft/powerbi-visuals-tools/issues) to ensure your issue isn't a duplicate
    * If your issue or feature is a duplicate feel free to join the conversation
* [Create an issue](https://github.com/Microsoft/PowerBI-visuals-tools/issues/new) with a feature request / bug so we can discuss the change
* Submit a pull request by following the proccess below

#### Build from source

* Install dependencies
* Fork this reporitory
* Clone your fork using git
* Navigate into the repository directory
* Run `npm install` to install all dependencies
* Run `npm uninstall -g powerbi-visuals-tools` to remove your global version
* Run `npm link` to link the repo version of the module globally

Note: If pbiviz isn't working globally you may need to restart your terminal.

#### Dependencies

Before you can run (or install) the command line tools you must install NodeJS.

* NodeJS 4.0+ Required (5.0 recommended) - [Download NodeJS](https://nodejs.org)

#### Running and modifying

Once the repository is linked you can run `pbiviz` anywhere on your computer and it will reference the repository version. This makes it easy to make modifications and test them instantly.

## Submitting a PR

#### Testing the code

Simply run `npm test` to run our end to end test suite and code style checks. Be sure to run this locally before submitting a pull request as the tests will be run by our CI platform and automatically reject the PR if it fails.

#### Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

#### Legal

You will need to complete a Contributor License Agreement (CLA). Briefly, this agreement testifies that you are granting us permission to use the submitted change according to the terms of the project's license, and that the work being submitted is under appropriate copyright.

Please submit a Contributor License Agreement (CLA) before submitting a pull request. You may visit [https://cla.microsoft.com](https://cla.microsoft.com) to sign digitally. Alternatively, download the agreement ([Microsoft Contribution License Agreement.docx](https://www.codeplex.com/Download?ProjectName=typescript&DownloadId=822190), sign, scan, and email it back to <cla@microsoft.com>. Be sure to include your github user name along with the agreement. Once we have received the signed CLA, we'll review the request.
