const packageJson = require("./package.json");

const settings = {
    info: {
        name: "Conway's CLIfe",
        version: packageJson.version,
        intVersion: packageJson.version.split(".").map(x=>parseInt(x))
    }
};

module.exports = Object.freeze(settings);