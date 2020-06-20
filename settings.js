const packageJson = require("./package.json");
const c = require("svjsl").colors;

const settings = {
    info: {
        name:          "Conway's Game of CLIfe",
        version:       packageJson.version,
        intVersion:    packageJson.version.split(".").map(x=>parseInt(x)),
        authorN:       packageJson.author.name,
        authorGH:      packageJson.author.url,
        projGH:        packageJson.homepage,
        issueTracker:  "https://github.com/Sv443/Conways-CLIfe/issues/new/choose"
    },
    game: {
        presetsDirName:   "presets",  // name of the presets directory
        defaultFrameTime: 500,        // default time each frame / iteration stays rendered
        aliveCellChar:    "∙",        // default character of an alive cell
        deadCellChar:     " ",        // default character of a dead cell
        aliveCellColor:   c.rst,      // default color of an alive cell
        deadCellColor:    c.rst,      // default color of a dead cell
        border: {                     // characters that make up the border:
            horChar:   "─",
            verChar:   "│",
            cornerTL:  "┌",
            cornerTR:  "┐",
            cornerBR:  "┘",
            cornerBL:  "└"
        },
        padding: {
            horizontal: [0, 0],  // how many rows of padding should be at the [top, bottom] - this is pretty broken, use with caution
            vertical: [1, 4]     // how many rows of padding should be at the [left, right]
        },
        speedChangeFactor: 0.5,  // by how much the game speed changes when incrementing or decrementing once
        maxSpeed: 10.0,          // maximum game speed
        inputCooldown: 50,       // how many milliseconds to wait between accepted keyboard inputs
        preferencesFilePath: "./preferences.json", // where preferences should be saved to (relative to root dir),
        repoDownload: "https://github.com/Sv443/Conways-CLIfe/archive/master.zip"
    }
};

module.exports = Object.freeze(settings);
