const packageJson = require("./package.json");

const settings = {
    info: {
        name:          "Conway's CLIfe",
        version:       packageJson.version,
        intVersion:    packageJson.version.split(".").map(x=>parseInt(x)),
        authorN:       packageJson.author.name,
        authorGH:      packageJson.author.url,
        projGH:        packageJson.homepage,
        issueTracker:  "https://github.com/Sv443/Conways-CLIfe/issues/new/choose"
    },
    game: {
        presetsDirName:    "presets",
        defaultFrameTime:  500
    }
};

module.exports = Object.freeze(settings);
