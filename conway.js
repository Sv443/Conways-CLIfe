const jsl = require("svjsl");
const fs = require("fs");
const { resolve, join } = require("path");

const settings = require("./settings");

require("keypress")(process.stdin);

const dbg = true;
var field = [];
var frameTime = settings.game.defaultFrameTime;
var gameActive = false, gamePaused = true;


//#MARKER init

/**
 * Pre-initializes stuff. Should only be run once at the start of the application
 */
function preInit()
{
    process.stdin.setRawMode();

    process.stdout.on("resize", () => {
        recalcSize();
    });
    recalcSize();

    init();
}

/**
 * Inits everything
 */
function init()
{
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
                    startGame(true);
                break;
                case 3: // "Random"
                    console.log("\nRandom generation is WIP\n");
                    // startRandomGame(); // TODO:
                    jsl.pause().then(() => init());
                break;
                case 4: // "About"
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
                description: "Editor"
            },
            {
                key: "3",
                description: "Random\n"
            },
            {
                key: "4",
                description: "About"
            }
        ]
    });

    mp.open();
}

//#MARKER game
/**
 * Controls the recalculation of certain things when terminal size was changed
 */
function recalcSize()
{
    if(dbg) console.log(`Terminal size: ${process.stdout.columns}x${process.stdout.rows} - TTY? ${process.stdout.isTTY}`);

    if(gameActive)
        drawGame(field);

    if(!process.stdout.isTTY)
    {
        console.log(`Couldn't find a suitable TTY terminal. Please make sure you are using the latest version of your operating system or try switching to a different default terminal.`);
        process.exit(1);
    }
}

/**
 * Returns the size of the terminal in columns and rows
 * @returns {Array<Number>} [width, height]
 */
function getTerminalSize()
{
    return [process.stdout.columns, process.stdout.rows] || [0, 0]; 
}

/**
 * Starts the actual game with the previously-set instructions
 * @param {Boolean} paused Whether the game should start paused
 * @param {String} name Name of the session
 * @param {Number} fieldW Width of the field
 * @param {Number} fieldH Height of the field
 */
function startGame(paused, name, fieldW, fieldH)
{
    if(dbg) console.log(`\n\n${jsl.colors.fg.green}Starting game.${jsl.colors.rst}\nSession: ${name} [${fieldW}x${fieldH}] - Paused: ${paused}`);

    // console.log(JSON.stringify(field, null, 4));

    process.stdin.removeAllListeners(["keypress"]);
    registerControls();

    gameActive = true;
    gamePaused = true;

    drawGame(field, true, name);
    let calcFrame = () => {
        if(dbg) console.log(`Frame iteration. Paused: ${gamePaused}`);

        if(!gameActive)
            return;

        calcNextFrame(field).then(nextField => {
            setTimeout(() => {
                field = nextField;
                drawGame(nextField, false, name);
                calcFrame();
            }, frameTime);
        });
    };

    calcFrame();
    
    dbg && process.stdin.resume();
}

/**
 * Calculates the next frame based on a passed grid and returns it
 * @param {Array<Number>} grid 
 * @returns {Promise<Array<Number>, String>}
 */
function calcNextFrame(grid)
{
    let newGrid = [];
    return new Promise((resolve, reject) => {
        if(gamePaused)
            return resolve(grid);

        // TODO: something here is fucky, pls fix thx
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

                // dynamically pushing across dimensions in an array is fun :) 🔫

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

        // fs.writeFileSync("./d.json", JSON.stringify(newGrid, null, 4))
        // process.exit()

        let timeDelta = new Date().getTime() - timeS;
        if(dbg) console.log(`calc Δt: ${timeDelta}ms`);

        return resolve(newGrid);
    });
}

/**
 * Draws a frame to the terminal
 * @param {Array<Number>} pattern 
 * @param {Boolean} [initial] Set to true to exempt frame from pause check
 * @param {String} [name] The name of the session
 */
function drawGame(pattern, initial, name)
{
    // TODO: push all to array and then write to console at once so there's no delays when drawing the graphics

    if(gamePaused && initial !== true)
        return;

    let size = getTerminalSize();
    let w = size[0];
    let h = size[1];

    let horPadding = settings.game.padding.horizontal;
    let verPadding = settings.game.padding.vertical;

    let actualSize = [(w - horPadding.reduce((acc, val) => acc += val)), (h - verPadding.reduce((acc, val) => acc += val))];

    if(name && typeof name == "string" && name.length > 0)
        process.stdout.write(`${jsl.colors.fg.cyan}${name} ${jsl.colors.fg.yellow}[${actualSize[0]}x${actualSize[1]}]${jsl.colors.rst}\n`);

    //#SECTION apply padding at the top
    for(let i = 0; i < (verPadding[0] - 1); i++)
        process.stdout.write("\n");

    //#SECTION get padding at the left
    let lPad = "";
    for(let i = 0; i < (horPadding[0] - 1); i++)
        lPad += " ";
    
    //#SECTION draw top row
    for(let i = 0; i < actualSize[0]; i++)
    {
        if(i == 0)
            process.stdout.write(settings.game.border.cornerTL);
        else if(i == (actualSize[0] - 1))
            process.stdout.write(settings.game.border.cornerTR + "\n");
        else
            process.stdout.write(settings.game.border.horChar);
    }

    field = JSON.parse("[]");
    
    //#SECTION draw rows
    for(let i = 0; i < actualSize[1]; i++)
    {
        field.push([]);
        process.stdout.write(`${lPad}${settings.game.border.verChar}`);
        
        for(let j = 0; j < (actualSize[0] - 2); j++)
        {
            if(pattern[i] == undefined || pattern[i][j] == undefined)
            {
                process.stdout.write(settings.game.deadCellChar);
                field[i].push(0);
                continue;
            }

            process.stdout.write(pattern[i][j] == 1 ? settings.game.aliveCellChar : settings.game.deadCellChar);
            field[i].push(pattern[i][j]);
        }

        process.stdout.write(`${settings.game.border.verChar}\n`);
    }

    //#SECTION draw bottom row
    for(let i = 0; i < actualSize[0]; i++)
    {
        if(i == 0)
            process.stdout.write(settings.game.border.cornerBL);
        else if(i == (actualSize[0] - 1))
            process.stdout.write(settings.game.border.cornerBR + "\n");
        else
            process.stdout.write(settings.game.border.horChar);
    }

    // TODO: frame doesn't get redrawn when game is paused -> text is not shown properly
    if(!gamePaused)
        process.stdout.write(`\n[Space] Pause & Modify - [Escape] Menu `);
    else
        process.stdout.write(`\n[Space] Play - [Escape] Menu `);

    // pattern.forEach(row => {
    //     console.log(`${lPad}${settings.game.border.verChar}`);
    // });

    // console.log(`\nDrawing frame. TTY size: ${size.join("x")} - Field size: ${actualSize.join("x")}`);

    //DEBUG:
    // process.exit(0);
}

/**
 * Displays the about section
 */
function aboutGame()
{
    console.log(`Game made by ${settings.info.authorN} - ${settings.info.authorGH}`);
    console.log(`Version: ${settings.info.version}\n`);

    console.log(`GitHub repository: ${settings.info.projGH}`);
    console.log(`Issue tracker: ${settings.info.issueTracker}`);
    console.log(`Created from 2020/06/01 to 2020/x/x`);

    console.log("\n\n\n");

    jsl.pause().then(() => {
        init();
    });
}

//#MARKER events
/**
 * Registers the async listeners for input during gameplay
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
        }, 100);
        
        switch(key.name)
        {
            case "space": // pause / unpause
                gamePaused = !gamePaused;
                jsl.unused(); // so I can put a breakpoint here
            break;
            case "c": // exit process if CTRL+C is pressed
                if(key.ctrl === true)
                    process.exit(0);
            break;
            case "escape":
                process.stdin.removeAllListeners(["keypress"]);
                gameActive = false;
                gamePaused = true;
                field = [];
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

//#MARKER menus
/**
 * Displays the preset selector
 */
function presetSelector()
{
    let presetsDir = resolve(`./${settings.game.presetsDirName}`);
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
            }, 100);

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

                        setTimeout(() => loadPreset(selData.name, selData.size, selData.pattern), 50);
                        
                        break;
                    }
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

            console.log(`${presets.length} presets found:\n`);

            presets.forEach((preset, i) => {
                // console.log(`${jsl.colors.fg.yellow}DBG - clidx: ${currentListIdx} - i: ${i}${jsl.colors.rst}`);

                try
                {
                    if(i == currentListIdx)
                        process.stdout.write(jsl.colors.fg.green + "> ");
                    else
                        process.stdout.write("  ");

                    let presetData = JSON.parse(fs.readFileSync(join(presetsDir, preset)).toString());

                    process.stdout.write(`${presetData.name} [${presetData.size[0]}x${presetData.size[1]}]${jsl.colors.rst}`);
                    process.stdout.write("\n");
                }
                catch(err)
                {
                    jsl.unused(err);

                    console.log(`${preset} ${jsl.colors.fg.red}[CORRUPTED]${jsl.colors.rst}`);
                }
            });

            process.stdout.write(`\n\n\n[▲ ▼] Navigate - [Enter] Select `);
        };

        return redisplayPresets();
    }
    else
    {
        console.log(`No presets found :(\n\nBut fear not! You can download them here:\n${getCurrentPresetsURL()}`);

        console.log("\n\n\n");
        jsl.pause().then(() => init());
    }
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

/**
 * Returns the current presets URL
 */
function getCurrentPresetsURL()
{
    return "[[Not implemented yet]]";
}

//#MARKER misc
/**
 * Clears the console
 */
function clearConsole()
{
    return console.clear();
    // if(!dbg) //dbg
    // {
    //     console.log(`\n\n\n--------------------------------------------------\n`);
    //     return;
    // }
    // console.clear();
    // console.log("\n\n\n");
    // console.clear();
}


preInit();
