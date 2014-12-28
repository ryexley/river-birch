var pkg = require("./package.json");
/* node modules */

/* imported modules */
var _ = require("lodash");
var log = require("custom-logger");
var multiline = require("multiline");
var GetOptions = require("node-getopt");
var Exif = require("exif").ExifImage;

_.templateSettings.interpolate = /{([\s\S]+?)}/g;

/* Command line argument processing */

var cliOptions = GetOptions.create([
        ["s", "source=ARG", "Source folder (contains the photos to be processed)"],
        ["d", "destination=ARG", "Destination folder (where processed photos should be put)"],
        ["h", "help", "Get help on how to use this utility"]
    ]);

var help = multiline.stripIndent(function () {/*
    River Birch v{version}

    Usage: node process-photos --source /path/to/photos/to/process --destination /path/to/put/processed/photos

    [[OPTIONS]]

*/}).replace("{version}", pkg.version);

cliOptions.setHelp(help);

var args = cliOptions.parseSystem();

if (args.options.help) {
    cliOptions.showHelp();
}

// Exit of a source directory is not specified
if (!args.options.source || (args.options.source && args.options.source.length < 1)) {
    log.warn("A source directory must be specified");
    process.exit();
}

// Exit of a destination directory is not specified
if (!args.options.destination || (args.options.destination && args.options.destination.length < 1)) {
    log.warn("A destination directory must be specified");
    process.exit();
}

// if we have both a source and a destination, we can proceed
if ((args.options.source && args.options.source.length > 0) && (args.options.destination && args.options.destination.length > 0)) {
    log.info(_.template("Processing photos in {source} and moving them to {destination}", { source: args.options.source, destination: args.options.destination }));
}

/* END Command line argument processing */
