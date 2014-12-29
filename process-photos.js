var pkg = require("./package.json");

/* node modules */
var fs = require("fs");
var util = require("util");

/* imported modules */
var _ = require("lodash");
var async = require("async");
var Exif = require("exif").ExifImage;
var GetOptions = require("node-getopt");
var log = require("custom-logger");
var moment = require("moment");
var multiline = require("multiline");
var readdirp = require("readdirp");

/* local variables */
var jobState = {
    files: [],
    warnings: [],
    errors: []
};

_.templateSettings.interpolate = /{([\s\S]+?)}/g;

/* Command line argument processing */

// TODO: can I wrap all of this in a single function for processing CLI args??

var cli = GetOptions.create([
        ["s", "source=ARG", "Source folder (contains the photos to be processed)"],
        ["d", "destination=ARG", "Destination folder (where processed photos should be put)"],
        ["h", "help", "Get help on how to use this utility"]
    ]);

var help = multiline.stripIndent(function () {/*
    River Birch v{version}

    Usage: node process-photos --source /path/to/photos/to/process --destination /path/to/put/processed/photos

    [[OPTIONS]]

*/}).replace("{version}", pkg.version);

cli.setHelp(help);

var args = cli.parseSystem();

if (args.options.help) {
    cli.showHelp();
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
    /* Good reference: https://github.com/montanaflynn/photo-saver/blob/master/index.js */

    readdirp({
        root: options.source,
        fileFilter: ["*.jpg", "*.JPG"]
    })
    .on("data", handlePhoto)
    .on("warn", handleWarning)
    .on("error", handleError)
    .on("end", processingComplete);
};

function parseExifDate (exifDate) {
    var dateArray = exifDate.replace(" ", ":").split(/\s*:\s*/),
        month = (dateArray[1] - 1).toString();

    dateArray[1] = month;

    return moment(dateArray);
};

function handlePhoto (file) {
    var formatString = "YYYYMMDDHHmmss";

    try {
        new Exif({ image: file.fullPath }, function (err, data) {
            if (err) {
                jobState.errors.push(err);
            } else {
                var exif = data.exif,
                image = data.image,
                date = image.ModifyDate || exif.DateTimeOriginal || exif.CreateDate,
                timestamp = parseExifDate(date);

                jobState.files.push({
                    source: file.fullPath,
                    destination: timestamp.format(formatString)
                });

                log.debug("Files: ", jobState.files.length, JSON.stringify(jobState.files, null, 2));
            }
        });
    } catch (err) {
        jobState.errors.push(err);
    }
};

function handleWarning (data) {
    log.warn(data);
};

function handleError (data) {
    log.error(data);
};

function processingComplete (data) {
    log.debug("Processing complete", JSON.stringify(jobState, null, 4));
};
