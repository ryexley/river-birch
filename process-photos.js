var pkg = require("./package.json");

/* node modules */
var fs = require("fs");

/* imported modules */
var _ = require("lodash");
var async = require("async");
var Exif = require("exif").ExifImage;
var GetOptions = require("node-getopt");
var log = require("custom-logger");
var multiline = require("multiline");

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
    var options = {
        source: resolvePath(args.options.source),
        destination: resolvePath(args.options.destination)
    };

    log.info(_.template("Processing photos in {source} and moving them to {destination}", options));

    main(options);
}

/* END Command line argument processing */

function resolvePath (path) {
    if (path.indexOf("~") > -1) {
        path = path.replace("~", process.env.HOME);
    }

    return path;
};

function main (options) {
    async.series([
        function (next) {
            fs.exists(options.source, function (exists) {
                if (exists) {
                    fs.stat(options.source, function (err, stats) {
                        if (stats && stats.isDirectory) {
                            next(null, true)
                        } else {
                            next("Source is not a directory", false);
                        }
                    });
                } else {
                    next("Source directory does not exist", false);
                }
            });
        },
        function (next) {
            fs.exists(options.destination, function (exists) {
                if (exists) {
                    fs.stat(options.destination, function (err, stats) {
                        if (stats && stats.isDirectory) {
                            next(null, true);
                        } else {
                            next("Destination is not a directory", false)
                        }
                    })
                } else {
                    fs.mkdir(options.destination, 0755, function (err) {
                        if (!err) {
                            next(null, true);
                        } else {
                            next("Error creating destination directory", false);
                        }
                    });
                }
            });
        }
    ], function (err, results) {
        if (_.all(results)) { // if all of the above functions completed successfully...
            processPhotos(options);
        }
    });
};

function processPhotos (options) {
    log.debug("Walking source tree and processing photos...");
};
