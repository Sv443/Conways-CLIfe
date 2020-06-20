/**
 * Made by Sv443 as part of the CLI games collection: https://github.com/Sv443/CLI-Games-Collection
 * Licensed under the MIT license
 * 
 * I try to keep these games to a single file so view this code at your own risk lol
 * Also x and y coordinates are usually swapped due to me being an idiot (x = rows / down, y = columns / right)
 * I recommend VS Code with the extension "fabiospampinato.vscode-highlight", it'll give you better code highlighting in here
 * 
 * @author Sv443 - https://github.com/Sv443
 * @license MIT
 */


"use-strict";

const jsl = require("svjsl");
const { resolve, join } = require("path");

const settings = require("./settings");

const fs = require("fs-extra");
const unzipper = require("unzipper");
const perlin = require("perlin-noise");
// const { isBuffer } = require("util");
require("keypress")(process.stdin);

const dbg = false;
var field = [];
var frameTime = settings.game.defaultFrameTime;
var gameActive = false, gamePaused = true;
var gameSpeed = 1.0;
var gameName = "";
var currentIteration = 0;
var aliveCellChar = settings.game.aliveCellChar;
var deadCellChar = settings.game.deadCellChar;
var aliveCellColor = settings.game.aliveCellColor;
var deadCellColor = settings.game.deadCellColor;
var lastSize = getFieldSize();


const defaultSettings = {
    aliveCellChar: aliveCellChar,
    deadCellChar: deadCellChar,
    aliveCellColor: aliveCellColor,
    deadCellColor: deadCellColor
};


//#MARKER init

/**
 * Pre-initializes stuff. Should only be run once at the start of the application
 */
function preInit()
{
    process.on("SIGINT", beforeShutdown);
    process.on("SIGTERM", beforeShutdown);

    let prefPath = resolve(settings.game.preferencesFilePath);
    if(!fs.existsSync(prefPath))
        fs.writeFileSync(prefPath, JSON.stringify(defaultSettings, null, 4));

    process.stdin.setRawMode(true);

    process.stdout.on("resize", () => {
        recalcSize(true);
    });
    recalcSize();

    init();
}

function beforeShutdown()
{
    console.log(`\n${jsl.colors.fg.yellow}Goodbye.${jsl.colors.rst}`);
    process.exit(0);
}

//#SECTION init
/**
 * Inits everything and displays the main menu
 */
function init()
{
    setTimeout(() => {
        setTerminalTitle(`${settings.info.name} - Menu`);

        currentIteration = 0;
        field = [];

        if(fs.existsSync(resolve(settings.game.preferencesFilePath)))
        {
            let usrSettings = JSON.parse(fs.readFileSync(resolve(settings.game.preferencesFilePath)).toString());
            try
            {
                if(usrSettings)
                {
                    aliveCellChar = usrSettings.aliveCellChar || settings.game.aliveCellChar;
                    deadCellChar = usrSettings.deadCellChar || settings.game.deadCellChar;
                    aliveCellColor = usrSettings.aliveCellColor || settings.game.aliveCellColor;
                    deadCellColor = usrSettings.deadCellColor || settings.game.deadCellColor;
                }
            }
            catch(err)
            {
                aliveCellChar = settings.game.aliveCellChar;
                deadCellChar = settings.game.deadCellChar;
                aliveCellColor = settings.game.aliveCellColor;
                deadCellColor = settings.game.deadCellColor;
            }
        }

        let mp = new jsl.MenuPrompt({
            autoSubmit: true,
            exitKey: "x",
            retryOnInvalid: true,
            onFinished: (res => {
                if(res[0] == undefined)
                    process.exit(0);

                switch(parseInt(res[0].key))
                {
                    case 1: // "Presets"
                        presetSelector();
                    break;
                    case 2: // "Editor"
                        field = [];
                        // TODO:
                        startGame(true, "Custom");
                    break;
                    case 3: // "Random"
                        randomGameSelector();
                    break;
                    case 4: // Settings
                        settingsMenu();
                    break;
                    case 5: // "About"
                        aboutGame();
                    break;
                }
            })
        });

        mp.addMenu({
            title: `${settings.info.name} v${settings.info.version}`,
            options: [
                {
                    key: "1",
                    description: "Presets"
                },
                {
                    key: "2",
                    description: "Custom [WIP]"
                },
                {
                    key: "3",
                    description: "Random\n"
                },
                {
                    key: "4",
                    description: "Settings"
                },
                {
                    key: "5",
                    description: "About"
                }
            ]
        });

        return mp.open();
    }, settings.game.inputCooldown);
}

//#MARKER game
/**
 * Controls the recalculation of certain things when terminal size was changed.  
 * Can also be called to just redraw the game.
 * @param {Boolean} ignorePaused
 * @param {Boolean} onlyCheckSizeOk
 */
function recalcSize(ignorePaused, onlyCheckSizeOk)
{
    let sizeIsOk = true;
    let fieldSizeChanged = false;

    let activeFieldArea = getActiveFieldArea(6, 40);
    let gameFieldSize = getFieldSize();

    if(lastSize[0] != gameFieldSize[0] || lastSize[1] != gameFieldSize[1])
    {
        lastSize = gameFieldSize;
        fieldSizeChanged = true;
    }

    if(activeFieldArea[0] > gameFieldSize[0] || activeFieldArea[1] > gameFieldSize[1])
        sizeIsOk = false;

    if(dbg) console.log(`Terminal size: ${process.stdout.columns}x${process.stdout.rows} - TTY? ${process.stdout.isTTY}`);

    if(gameActive)
    {
        if(sizeIsOk && onlyCheckSizeOk !== true)
            drawGame(field, false, gameName, ignorePaused);
        else if(!sizeIsOk && (fieldSizeChanged || onlyCheckSizeOk === true))
        {
            let whatToIncrease = [];
            activeFieldArea[0] > gameFieldSize[0] && whatToIncrease.push("width");
            activeFieldArea[1] > gameFieldSize[1] && whatToIncrease.push("height");

            clearConsole();
            console.log(`${jsl.colors.fg.red}Window too small!${jsl.colors.rst}`);
            whatToIncrease.length > 0 && console.log(`Increase ${jsl.colors.fg.yellow}${whatToIncrease.join(`${jsl.colors.rst} and ${jsl.colors.fg.yellow}`)}${jsl.colors.rst}.`);
            console.log("\n(Game paused)");
            gamePaused = true;
        }
    }

    if(!process.stdout.isTTY)
    {
        console.log(`Couldn't find a suitable TTY terminal. Please make sure you are using the latest version of your operating system or try switching to a different default terminal.`);
        process.exit(1);
    }
}

/**
 * Redraws the current frame.
 * @param {Boolean} ignorePaused
 */
function redraw(ignorePaused)
{
    recalcSize(ignorePaused);
}

//#SECTION start game
/**
 * Starts the actual game with the previously set instructions
 * @param {Boolean} paused Whether the game should start paused
 * @param {String} name Name of the session
 * @param {Number} fieldW Width of the field
 * @param {Number} fieldH Height of the field
 */
function startGame(paused, name, fieldW, fieldH)
{
    if(dbg) console.log(`\n\n${jsl.colors.fg.green}Starting game.${jsl.colors.rst}\nSession: ${name} [${fieldW}x${fieldH}]`);

    gameName = name;
    currentIteration = 0;

    // console.log(JSON.stringify(field, null, 4));

    process.stdin.removeAllListeners(["keypress"]);
    registerControls();
    
    gamePaused = paused || true;
    gameActive = true;

    drawGame(field, true, name);
    let calcFrame = () => {
        if(dbg) console.log(`Frame iteration. Paused: ${gamePaused}`);

        if(!gameActive)
            return;

        calcNextFrame(field).then(nextField => {
            let curFrameTime = frameTime / gameSpeed;
            setTimeout(() => {
                field = nextField;
                drawGame(nextField, false, name);

                if(!gameActive)
                    return;

                recalcSize(true, true);

                calcFrame();
            }, curFrameTime);
        });
    };

    calcFrame();
    
    dbg && process.stdin.resume();
}

//#SECTION start random game
/**
 * Starts a new random game
 * @param {Boolean} paused 
 * @param {String} name 
 * @param {"perlin"|"random"} type 
 * @param {Number} [seed] Only needed when run in "seed" mode
 */
function startRandomGame(paused, name, type, seed)
{
    let actualSize = getFieldSize();
    let noisedGrid = [];

    jsl.unused(seed);
    switch(type)
    {
        case "perlin":
        {
            let noiseSampleScale = 3; // does not work well with floats, gets skewed weirdly and creates horizontal lines
            let opts = {
                octaveCount: 10, // 4
                amplitude: 0.1,  // 0.1
                persistence: 0.2 // 0.2
            };
            let noise = perlin.generatePerlinNoise(Math.round(actualSize[0] * noiseSampleScale), Math.round(actualSize[1] * noiseSampleScale)).map(v => Math.round(v), opts);
            let idx = 0;

            for(let x = 0; x < actualSize[1]; x++)
            {
                noisedGrid.push([]);
                for(let y = 0; y < actualSize[0]; y++)
                {
                    noisedGrid[x].push(noise[Math.round(idx * Math.pow(noiseSampleScale, 2))]);

                    idx++;
                }
            }

            field = noisedGrid;
            return startGame(paused, `${name} (Perlin Noise)`);
        }
        case "random":
        {
            for(let x = 0; x < actualSize[1]; x++)
            {
                noisedGrid.push([]);
                for(let y = 0; y < actualSize[0]; y++)
                {
                    noisedGrid[x].push(jsl.randRange(0, 1));
                }
            }

            field = noisedGrid;
            return startGame(paused, `${name} (True Random)`);
        }
    }
}

//#SECTION calc next frame
/**
 * Calculates the next frame based on a passed grid and returns it
 * @param {Array<Number>} grid 
 * @returns {Promise<Array<Number>, String>}
 */
function calcNextFrame(grid)
{
    let newGrid = [];
    return new Promise((resolve, reject) => {
        jsl.unused(reject);

        if(gamePaused)
            return resolve(grid);

        /*
            Rules:

            1 - Births: Each dead cell adjacent to exactly three live neighbors will become live in the next generation.
            2 - Death by isolation: Each live cell with one or fewer live neighbors will die in the next generation.
            3 - Death by overcrowding: Each live cell with four or more live neighbors will die in the next generation.
            4 - Survival: Each live cell with either two or three live neighbors will remain alive for the next generation.
        */

        let timeS = new Date().getTime();

        for(let x = 0; x < grid.length; x++)
        {
            newGrid[x] = [];

            for(let y = 0; y < grid[x].length; y++)
            {
                let cell = grid[x][y];
                let gridWidth = grid[x].length;
                let gridHeight = grid.length;
                let adjacentCells = [];

                // dynamically checking values and pushing values across dimensions in
                // two arrays is fun and definitely not complex and I don't hate myself at all 🙂🔫

                //#SECTION check adjacent cells
                if(x - 1 >= 0 && y - 1 >= 0)
                    adjacentCells.push(grid[x - 1][y - 1]); // NW
                if(x - 1 >= 0)
                    adjacentCells.push(grid[x - 1][y]); // N
                if(x - 1 >= 0 && y + 1 < gridWidth)
                    adjacentCells.push(grid[x - 1][y + 1]); // NE
                if(y - 1 >= 0)
                    adjacentCells.push(grid[x][y - 1]); // W
                if(y + 1 < gridWidth)
                    adjacentCells.push(grid[x][y + 1]); // E
                if(x + 1 < gridHeight && y - 1 >= 0)
                    adjacentCells.push(grid[x + 1][y - 1]); // SW
                if(x + 1 < gridHeight)
                    adjacentCells.push(grid[x + 1][y]); // S
                if(x + 1 < gridHeight && y + 1 < gridWidth)
                    adjacentCells.push(grid[x + 1][y + 1]); // SE

                let aliveAndAdjacent = parseInt(adjacentCells.reduce((acc, val) => acc += val));

                if(isNaN(aliveAndAdjacent))
                    continue;
                    
                //#SECTION game rules
                let die = false;
                let resurrect = false;

                if(cell == 1 && (aliveAndAdjacent == 2 || aliveAndAdjacent == 3)) // 4 - Survival: Each live cell with either two or three live neighbors will remain alive for the next generation.
                    die = false;
                if(cell == 1 && aliveAndAdjacent <= 1 || aliveAndAdjacent >= 4) // 2+3 - Death by isolation: Each live cell with one or fewer live neighbors will die in the next generation. - Death by overcrowding: Each live cell with four or more live neighbors will die in the next generation.
                    die = true;
                
                if(aliveAndAdjacent == 3 && cell == 0)
                    resurrect = true; // 1 - Births: Each dead cell adjacent to exactly three live neighbors will become live in the next generation.

                let newCell = cell;

                if(cell == 1 && die)
                    newCell = 0;
                
                if(cell == 0 && resurrect)
                    newCell = 1;
                    
                newGrid[x].push(newCell);
            }
        }

        let timeDelta = new Date().getTime() - timeS;
        if(dbg) console.log(`calc Δt: ${timeDelta}ms`);

        currentIteration++;

        return resolve(newGrid);
    });
}

/**
 * Draws a frame to the terminal
 * @param {Array<Number>} pattern 
 * @param {Boolean} [initial] Set to true to exempt frame from pause check
 * @param {String} [name] The name of the session
 * @param {Boolean} [ignorePaused]
 */
function drawGame(pattern, initial, name, ignorePaused)
{
    let consoleTxt = [];

    if((gamePaused && ignorePaused !== true) && initial !== true)
        return;

    let actualSize = getFieldSize();
    let horPadding = settings.game.padding.horizontal;
    let verPadding = settings.game.padding.vertical;

    consoleTxt.push("\n");

    let sizeCol = jsl.colors.fg.yellow;
    if(actualSize[0] + actualSize[1] >= 200)
        sizeCol = jsl.colors.fg.red;

    if(name && typeof name == "string" && name.length > 0)
        consoleTxt.push(`${jsl.colors.fg.cyan}${name} ${sizeCol}[${actualSize[0]}x${actualSize[1]}]${jsl.colors.fg.yellow} ${gameSpeed == 1.0 ? "1" : gameSpeed.toFixed(1)}x ${jsl.colors.rst}-${jsl.colors.fg.yellow} i=${currentIteration} ${gamePaused ? `${jsl.colors.rst}-${jsl.colors.fg.yellow} Paused ` : ""}${jsl.colors.rst}\n`);

    //#SECTION apply padding at the top
    for(let i = 0; i < (verPadding[0] - 1); i++)
        consoleTxt.push("\n");

    //#SECTION get padding at the left
    let lPad = "";
    for(let i = 0; i < (horPadding[0] - 1); i++)
        lPad += " ";
    
    //#SECTION draw top row
    let topRowConsole = "";
    for(let i = 0; i < actualSize[0]; i++)
    {
        if(i == 0)
            topRowConsole += settings.game.border.cornerTL;
        else if(i == (actualSize[0] - 1))
            topRowConsole += settings.game.border.cornerTR;
        else
            topRowConsole += settings.game.border.horChar;
    }

    consoleTxt.push(`${topRowConsole}\n`);

    field = JSON.parse("[]");
    
    //#SECTION draw rows
    let rowConsole = "";
    for(let i = 0; i < actualSize[1]; i++)
    {
        let rowEmptyFlag = false;
        let last = null;
        field.push([]);
            rowConsole += `${lPad}${settings.game.border.verChar}`;

        if(pattern[i] == undefined)
        rowEmptyFlag = true;
        
        for(let j = 0; j < (actualSize[0] - 2); j++)
        {
            let cellColor = "";
            if(pattern[i] != undefined && (last == null || last != pattern[i][j]))
            {
                last = pattern[i][j];

                if(pattern[i][j] == 1)
                    cellColor = aliveCellColor;
                else
                    cellColor = deadCellColor;
            }

            if(rowEmptyFlag)
            {
                cellColor = deadCellColor;
                rowEmptyFlag = false;
            }

            if(i == 5 && j == 61)
                jsl.unused("breakpoint");

            if(pattern[i] == undefined || pattern[i][j] == undefined)
            {
                rowConsole += (cellColor + deadCellChar);
                field[i].push(0);
                continue;
            }

            rowConsole += (pattern[i][j] == 1 ? (cellColor + aliveCellChar) : (cellColor + deadCellChar));
            field[i].push(pattern[i][j]);
        }

        rowConsole += jsl.colors.rst + settings.game.border.verChar + "\n";
    }
    consoleTxt.push(rowConsole);

    //#SECTION draw bottom row
    let btmRowConsole = "";
    for(let i = 0; i < actualSize[0]; i++)
    {
        if(i == 0)
            btmRowConsole += settings.game.border.cornerBL;
        else if(i == (actualSize[0] - 1))
            btmRowConsole += settings.game.border.cornerBR;
        else
            btmRowConsole += settings.game.border.horChar;
    }
    consoleTxt.push(`${btmRowConsole}\n`);

    if(!gamePaused)
        consoleTxt.push(`\n[Space] Pause - [◄ ►] Change Speed - [Escape] Menu `);
    else
        consoleTxt.push(`\n[Space] Play - [◄ ►] Change Speed - [Escape] Menu `);

    let textToLog = consoleTxt.reduce((acc, val) => acc + val);

    process.stdout.write(textToLog);

    setTerminalTitle(`${settings.info.name} - ${name}${gamePaused ? " - Paused " : ""}`);
}

//#MARKER events
/**
 * Registers the async listeners for input during "gameplay"
 */
function registerControls()
{
    process.stdin.setRawMode(true);

    let onCooldown = false;

    process.stdin.on("keypress", (char, key) => {
        jsl.unused(char);
        
        if(onCooldown || !key)
            return;

        onCooldown = true;
        setTimeout(() => {
            onCooldown = false;
        }, settings.game.inputCooldown);
        
        switch(key.name)
        {
            case "space": // pause / unpause
                gamePaused = !gamePaused;
                redraw(true);
            break;
            case "c": // exit process if CTRL+C is pressed
                if(key.ctrl === true)
                    process.exit(0);
            break;
            case "a":
            case "left":
                if(gameSpeed > settings.game.speedChangeFactor)
                {
                    gameSpeed -= settings.game.speedChangeFactor;
                    redraw(true);
                }
            break;
            case "d":
            case "right":
                if(gameSpeed < settings.game.maxSpeed)
                {
                    gameSpeed += settings.game.speedChangeFactor;
                    redraw(true);
                }
            break;
            case "e":
                if(!gamePaused)
                    gamePaused = true;
                // TODO: live editor
            break;
            case "escape":
                process.stdin.removeAllListeners(["keypress"]);
                gameActive = false;
                gamePaused = true;
                field = JSON.parse("[]");
                init();
            break;
        }
    });
    process.stdin.resume();
}

/**
 * Removes all listeners that have been added with `registerControls()`
 */
function removeControlEvents()
{
    process.stdin.removeAllListeners(["keypress"]);
}
jsl.unused(removeControlEvents);

//#MARKER menus
/**
 * Displays the preset selector
 */
function presetSelector()
{
    let presetsDir = resolve(`./${settings.game.presetsDirName}/`);

    if(!fs.existsSync(presetsDir))
        fs.mkdirSync(resolve(presetsDir));
    
    let presets = fs.readdirSync(presetsDir);
    let currentListIdx = 0;
    let onCooldown = false;

    if(Array.isArray(presets) && presets.length > 0)
    {
        // if(dbg) console.log(`${jsl.colors.fg.red}Registering keypress evt${jsl.colors.rst}`);
        let kp = (ch, key) => {
            if(onCooldown || !key)
                return;

            onCooldown = true;
            setTimeout(() => {
                onCooldown = false;
            }, settings.game.inputCooldown);

            // if(dbg) console.log("keypress triggered");
            jsl.unused(ch);

            switch(key.name)
            {
                case "w":
                case "up":
                    if(currentListIdx > 0)
                        currentListIdx--;

                    redisplayPresets();
                break;
                case "s":
                case "down":
                    if(currentListIdx < (presets.length - 1))
                        currentListIdx++;
                    
                    redisplayPresets();
                break;
                case "c":
                    if(key.ctrl === true)
                    {
                        clearKP();
                        process.exit(0);
                    }
                break;
                case "space":
                case "return":
                    {
                        console.log("\n");
                        let selPresetPath = presets[currentListIdx];
                        let selData = JSON.parse(fs.readFileSync(join(presetsDir, selPresetPath)).toString());

                        clearKP();

                        setTimeout(() => loadPreset(selData.name, selData.size, selData.pattern), settings.game.inputCooldown);
                        
                        break;
                    }
                case "escape":
                    init();
                break;
                default:
                    // if(dbg) console.log(`Unknown keypress: ${JSON.stringify(key)}`);
                break;
            }
        };

        process.stdin.on("keypress", kp);

        let clearKP = () => {
            process.stdin.pause();
            process.stdin.removeAllListeners(["keypress"]);
        };

        process.stdin.setRawMode(true);
        process.stdin.resume();
        
        let redisplayPresets = () => {
            clearConsole();

            let textToLog = [];

            textToLog.push(`${jsl.colors.fg.blue}Presets (${presets.length}):${jsl.colors.rst}\n\n`);

            presets.forEach((preset, i) => {
                // console.log(`${jsl.colors.fg.yellow}DBG - clidx: ${currentListIdx} - i: ${i}${jsl.colors.rst}`);

                try
                {
                    if(i == currentListIdx)
                        textToLog.push(jsl.colors.fg.green + "> ");
                    else
                        textToLog.push("  ");

                    let presetData = JSON.parse(fs.readFileSync(join(presetsDir, preset)).toString());

                    textToLog.push(`${presetData.name} [${presetData.size[0]}x${presetData.size[1]}]${jsl.colors.rst}\n`);
                }
                catch(err)
                {
                    jsl.unused(err);

                    textToLog.push(`${preset} ${jsl.colors.fg.red}[CORRUPTED]${jsl.colors.rst}`);
                }
            });

            textToLog.push(`\n\n[▲ ▼] Navigate - [Enter] Select - [Escape] Menu `);

            process.stdout.write(textToLog.join(""));
        };

        return redisplayPresets();
    }
    else
    {
        console.log(`${jsl.colors.fg.yellow}No presets were found.${jsl.colors.rst}\n`);

        jsl.pause(`Do you want to download them now? (Y/n): `).then(ans => {
            if(ans.toLowerCase() == "n")
                return init();

            let zFile = "./repo.zip";

            //#SECTION download
            process.stdout.write("Downloading (0%)...");
            jsl.downloadFile(settings.game.repoDownload, "./", {
                fileName: zFile,
                progressCallback: prog => {
                    try
                    {
                        let perc = 0;
                        if(prog.totalKB)
                            perc = jsl.mapRange(prog.currentKB, 0, prog.totalKB, 0, 100);

                        process.stdout.cursorTo(0);
                        process.stdout.write(`Downloading (${perc.toFixed(0)}%)...`);
                    }
                    catch(err)
                    {
                        jsl.unused(err);
                    }
                },
                finishedCallback: err => {
                    process.stdout.cursorTo(0);
                    process.stdout.write(`Downloading (100%)...\n`);
                    if(err)
                    {
                        console.log(`${jsl.colors.fg.red}Error while downloading: ${err}\nMake sure your internet connection is working!${jsl.colors.rst}`);
                        jsl.pause().then(() => init());
                    }
                    else
                    {
                        if(!fs.existsSync(zFile))
                        {
                            console.log(`${jsl.colors.fg.red}Unknown error while downloading.\nMake sure your internet connection is working and the game has write permissions!${jsl.colors.rst}`);
                            jsl.pause().then(() => init());
                        }
                        else
                        {
                            //#SECTION unzip
                            console.log("Unzipping...");

                            if(!fs.existsSync("./repoUnzip"))
                                fs.mkdirSync("./repoUnzip");

                            fs.createReadStream(zFile)
                                .pipe(unzipper.Extract({ path: "./repoUnzip" }))
                                .on("close", () => {
                                    //#SECTION extract
                                    let presetsSubdir = resolve("./repoUnzip/Conways-CLIfe-master/presets");

                                    console.log("Extracting presets...");

                                    if(fs.existsSync(presetsDir))
                                        fs.removeSync(presetsDir);

                                    fs.copySync(presetsSubdir, presetsDir, {
                                        errorOnExist: false,
                                        overwrite: true
                                    });

                                    //#SECTION cleanup
                                    console.log("Cleaning up...");
                                    fs.unlinkSync(zFile);
                                    fs.removeSync(resolve("./repoUnzip"));

                                    let presetsDlAmount = fs.readdirSync(presetsDir).length;

                                    console.log(`\n${jsl.colors.fg.green}Successfully downloaded and extracted ${presetsDlAmount} presets.${jsl.colors.rst}\n\n`);

                                    jsl.pause().then(() => init());
                                })
                                .on("error", (err) => {
                                    console.log(`${jsl.colors.fg.red}Error while unzipping: ${err}${jsl.colors.rst}`);
                                });
                        }
                    }
                }
            });
        });
    }
}

//#SECTION random game
/**
 * Displays the random game selector
 */
function randomGameSelector()
{
    let randomTypes = ["perlin", "random"];
    let randomNames = ["Perlin Noise", "True Random"];

    let onCooldown = false;
    let currentListIdx = 0;

    let kp = (ch, key) => {
        if(onCooldown || !key)
            return;

        onCooldown = true;
        setTimeout(() => {
            onCooldown = false;
        }, settings.game.inputCooldown);

        jsl.unused(ch);

        switch(key.name)
        {
            case "w":
            case "up":
                if(currentListIdx > 0)
                    currentListIdx--;

                redisplayRandomGames();
            break;
            case "s":
            case "down":
                if(currentListIdx < (randomTypes.length - 1))
                    currentListIdx++;
                
                redisplayRandomGames();
            break;
            case "c":
                if(key.ctrl === true)
                {
                    clearKP();
                    process.exit(0);
                }
            break;
            case "space":
            case "return":
                {
                    console.log("\n");
                    
                    clearKP();
                    setTimeout(() => startRandomGame(true, "Random", randomTypes[currentListIdx], ""), settings.game.inputCooldown);
                    
                    break;
                }
            case "escape":
                init();
            break;
            default:
                // if(dbg) console.log(`Unknown keypress: ${JSON.stringify(key)}`);
            break;
        }
    };

    process.stdin.on("keypress", kp);

    let clearKP = () => {
        process.stdin.pause();
        process.stdin.removeAllListeners(["keypress"]);
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    let redisplayRandomGames = () => {
        clearConsole();

        console.log(`Random Game Generation Mode:\n`);

        randomNames.forEach((rName, i) => {
            console.log(`${currentListIdx == i ? `${jsl.colors.fg.green}>` : " "} ${rName}${jsl.colors.rst}`);
        });

        process.stdout.write(`\n\n[▲ ▼] Navigate - [Enter] Select - [Escape] Menu `);
    };

    return redisplayRandomGames();
}

//#SECTION settings
/**
 * Displays the settings menu
 */
function settingsMenu()
{
    let c = jsl.colors.fg;
    let usrSettings = [
        {
            objn: "aliveCellChar",
            name: "Alive Cell",
            vals: [
                "∙",
                "x",
                "o",
                "◘",
                "■",
                "█",
                "♦",
                "☼"
            ]
        },
        {
            objn: "deadCellChar",
            name: "Dead Cell",
            vals: [
                " ",
                "_",
                "-",
                ".",
                "'",
                "∟",
                "¨",
                "…",
                "◘",
                "■",
                "█",
                "♦",
                "☼"
            ]
        },
        {
            objn: "aliveCellColor",
            name: "Alive Cell Color",
            suffix: `█${jsl.colors.rst}`,
            vals: [
                jsl.colors.rst,
                c.red,
                c.blue,
                c.green,
                c.yellow,
                c.cyan,
                c.magenta,
                c.white,
                c.black
            ]
        },
        {
            objn: "deadCellColor",
            name: "Dead Cell Color",
            suffix: `█${jsl.colors.rst}`,
            vals: [
                jsl.colors.rst,
                c.red,
                c.blue,
                c.green,
                c.yellow,
                c.cyan,
                c.magenta,
                c.white,
                c.black
            ]
        }
    ];

    let settingsToSave = defaultSettings;
    
    if(fs.existsSync(resolve(settings.game.preferencesFilePath)))
        settingsToSave = JSON.parse(fs.readFileSync(resolve(settings.game.preferencesFilePath)).toString());



    let onCooldown = false;
    let currentListIdx = 0;

    let kp = (ch, key) => {
        let curUsrSetting = usrSettings[currentListIdx];

        if(onCooldown || !key)
            return;

        onCooldown = true;
        setTimeout(() => {
            onCooldown = false;
        }, settings.game.inputCooldown);

        jsl.unused(ch);

        switch(key.name)
        {
            case "a":
            case "left":
            {
                let curVals = usrSettings[currentListIdx].vals;
                let curChar = settingsToSave[curUsrSetting.objn];
                let curValIdx = curVals.indexOf(curChar);

                if(curValIdx > 0)
                    settingsToSave[curUsrSetting.objn] = curUsrSetting.vals[curValIdx - 1];

                redisplaySettings();

                break;
            }
            case "d":
            case "right":
            {
                let curVals = usrSettings[currentListIdx].vals;
                let curChar = settingsToSave[curUsrSetting.objn];
                let curValIdx = curVals.indexOf(curChar);

                if(curValIdx < (usrSettings[currentListIdx].vals.length - 1))
                    settingsToSave[curUsrSetting.objn] = curUsrSetting.vals[curValIdx + 1];

                redisplaySettings();
                break;
            }
            case "w":
            case "up":
                if(currentListIdx > 0)
                    currentListIdx--;

                redisplaySettings();
            break;
            case "s":
            case "down":
                if(currentListIdx < (usrSettings.length - 1))
                    currentListIdx++;
                
                redisplaySettings();
            break;
            case "c":
                if(key.ctrl === true)
                {
                    clearKP();
                    process.exit(0);
                }
            break;
            case "return":
                fs.writeFileSync(resolve(settings.game.preferencesFilePath), JSON.stringify(settingsToSave, null, 4));

                clearKP();
                setTimeout(() => init(), settings.game.inputCooldown);
            break;
            case "escape":
                clearKP();
                setTimeout(() => init(), settings.game.inputCooldown);
            break;
            default:
                // if(dbg) console.log(`Unknown keypress: ${JSON.stringify(key)}`);
            break;
        }
    };

    process.stdin.on("keypress", kp);

    let clearKP = () => {
        process.stdin.pause();
        process.stdin.removeAllListeners(["keypress"]);
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    let redisplaySettings = () => {
        clearConsole();

        console.log(`${jsl.colors.fg.blue}Settings:${jsl.colors.rst}\n`);

        let longestSetting = usrSettings.reduce((prev, cur) => {
            if(!cur || !prev || !cur.name || !prev.name)
                return prev;

            if(cur.name.length > prev.name.length)
                return cur;
            else
                return prev;
        }).name.length;

        usrSettings.forEach((sett, i) => {
            let paddingLength = (longestSetting - sett.name.length);
            let padding = "  ";

            for(let j = 0; j < paddingLength; j++)
                padding += " ";

            let dVal = settingsToSave[sett.objn];

            if(typeof sett.suffix == "string")
                dVal += sett.suffix;

            console.log(`${currentListIdx == i ? `${jsl.colors.fg.green}>` : " "} ${sett.name}:${padding}[ ${typeof dVal == "boolean" ? (!dVal ? "No" : "Yes") : dVal} ${currentListIdx == i ? jsl.colors.fg.green : ""}]${jsl.colors.rst}`);
        });

        process.stdout.write(`\n\n[▲ ▼] Navigate - [◄ ►] Change - [Enter] Save & Exit - [Escape] Exit w/o Save `);
    };

    return redisplaySettings();
}

//#SECTION about
/**
 * Displays the about section
 */
function aboutGame()
{
    console.log(`${jsl.colors.fg.blue}About ${settings.info.name}:${jsl.colors.rst}\n`);

    console.log(`${jsl.colors.fg.yellow}Nice to know / quirks:${jsl.colors.rst}`);
    console.log(`- While playing, if the size indicator at the top turns red, your terminal window might be too large.\n  This might cause some graphical issues in some terminals.`);
    console.log(`- The number next to the "i=" is the current iteration / frame since the game was started.`);
    console.log(`- If the settings menu seems a bit buggy, please delete the "preferences.json" file and restart the game.`);
    console.log(`- To update the presets, please delete the "presets" folder. This will start a prompt to re-download them.`);
    
    console.log("\n");
    
    console.log(`${jsl.colors.fg.yellow}Other:${jsl.colors.rst}`);
    console.log(`  Version: ${jsl.colors.fg.yellow}${settings.info.version}${jsl.colors.rst}`);
    console.log(`  Game made by ${jsl.colors.fg.yellow}${settings.info.authorN}${jsl.colors.rst} - ${settings.info.authorGH}`);
    console.log(`  Licensed under the ${jsl.colors.fg.yellow}MIT License${jsl.colors.rst} - https://sv443.net/LICENSE`);
    console.log(`  GitHub repository: ${settings.info.projGH}`);
    console.log(`  Submit bugs and feature requests: ${settings.info.issueTracker}`);
    
    console.log("\n");

    jsl.pause().then(() => {
        init();
    });
}

/**
 * Loads a preset into the game
 * @param {String} name Name of the preset
 * @param {Array<Number>} size [x, y]
 * @param {Array<Number>} pattern [[0, 1, ...], ...]
 */
function loadPreset(name, size, pattern)
{
    field = pattern;
    startGame(true, `Preset: ${name}`, size[0], size[1]);
}

//#MARKER misc
/**
 * Clears the console
 */
function clearConsole()
{
    process.stdout.clearLine();
    process.stdout.cursorTo(0, 0);
    process.stdout.write("\n");

    try
    {
        if(console && console.clear && process.stdout && process.stdout.isTTY)
            console.clear();
        else if(console)
            console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
        else process.stdout.write("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
    }
    catch(err)
    {
        return;
    }
}

//#SECTION terminal-related shit
/**
 * Sets the title of the terminal window
 * @param {String} title
 */
function setTerminalTitle(title)
{
    process.stdout.write(`${String.fromCharCode(27)}]0;${title}${String.fromCharCode(7)}`);
}

/**
 * Returns the game field size
 * @returns {Array<Number>} [width, height] / [y, x]
 */
function getFieldSize()
{
    let size = getTerminalSize();
    let w = size[0];
    let h = size[1];

    let horPadding = settings.game.padding.horizontal;
    let verPadding = settings.game.padding.vertical;

    let wh = [(w - horPadding.reduce((acc, val) => (acc += val))), (h - verPadding.reduce((acc, val) => (acc += val)))];
    return wh;
}

/**
 * Returns the size of the game field where cells are alive in, plus an optional padding to the right and down
 * @param {Number} [paddingX] Gets applied downwards
 * @param {Number} [paddingY] Gets applied to the right
 * @returns {Array<Number>} [width, height] / [y, x]
 */
function getActiveFieldArea(paddingX, paddingY)
{
    let width = 0;
    let height = 0;
    let isFilled = false;

    field.forEach((row, x) => {
        row.forEach((col, y) => {
            if(col == 1 && y + 1 > width)
            {
                isFilled = true;
                width = y + 1;
            }
        });

        if(row.includes(1) && x + 1 > height)
        {
            isFilled = true;
            height = x + 1;
        }
    });

    if(!isFilled)
        return [ 0, 0 ];

    paddingX = parseInt(paddingX);
    paddingY = parseInt(paddingY);

    if(!isNaN(paddingX))
        height += paddingX;

    if(!isNaN(paddingY))
        width += paddingY;

    return [ width, height ];
}

/**
 * Returns the size of the terminal in columns and rows
 * @returns {Array<Number>} [width, height]
 */
function getTerminalSize()
{
    return [process.stdout.columns, process.stdout.rows] || [0, 0]; 
}



//#SECTION execute everything
preInit();
