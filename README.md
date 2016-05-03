#PowerBI Visual Tools (pbiviz)

This guide is meant to provide the quickest path to creating a custom visual.

##Setup

The easiest way to create custom visuals is by using the PowerBI command line tools which can be easily to installed via NPM.

####Dependencies

Before you can run (or install) the command line tools you must install NodeJS.

[Download NodeJS](https://nodejs.org)

**NodeJS 4.0+ Required (6.0 recommended)**

####Installation

To install the command line tools simply run the following command

```
npm install -g pbiviz
```

To confirm it was installed correctly you can run the command without any paremeters which should display the help screen.

```
pbiviz
```

##Creating your first visual

You can create a new visual project with a single command

```
pbiviz new MyVisualName
```

Replace "MyVisualName" with the name of your visual. You can change this later by modifying the generated `pbiviz.json` file.

This command will create a new folder in your current directory and generate a basic starter template for your visual. Once it finishes you can open the directory and use your favorite editor to start working on your new visual.

[Learn more about writing custom visuals](https://github.com/microsoft/powerbi-visuals-contracts) 

##Running your visual

To run your visual navigate to the root of your visual project (the directory containing `pbiviz.json`) and use the following command to start it.

```
pbiviz start
```

This command will compile your [typescript](http://www.typescriptlang.org/) and [less](http://lesscss.org/) files and bundle them for testing. It also launches an https server that will serve your visual for testing in your favorite web browser.

##Packaging your Visual for distribution

Before you can load your visual into [PowerBI Desktop](https://powerbi.microsoft.com/en-us/desktop/) or share it with the community in the [PowerBI Visual Gallery](https://visuals.powerbi.com) you'll need to generate a `pbiviz` file.

To package your visual navigate to the root of your visual project (the directory containing `pbiviz.json`) and use the following command to generate a pbiviz file.

```
pbiviz package
```

This command will create a pbiviz file in the `/build/` directory of your visual project. If there is already a pbiviz file (from previous package operations) it will be overwritten.