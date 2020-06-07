const packageJson = require("./package.json");

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
        presetsDirName:    "presets",  // name of the presets directory
        defaultFrameTime:  500,        // default time each frame / iteration stays rendered
        aliveCellChar:     "◘",        // character of an alive cell
        deadCellChar:      " ",        // dead cell
        border: {                      // characters that make up the border:
            horChar:   "─",
            verChar:   "│",
            cornerTL:  "┌",
            cornerTR:  "┐",
            cornerBR:  "┘",
            cornerBL:  "└"
        },
        padding: {
            horizontal: [1, 1],  // how many rows of padding should be at the [top, bottom]
            vertical: [1, 4]     // how many rows of padding should be at the [left, right]
        }
    }
};

module.exports = Object.freeze(settings);
