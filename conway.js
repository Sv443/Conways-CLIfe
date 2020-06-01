const jsl = require("svjsl");
const fs = require("fs");
const { resolve, join } = require("path");
const readline = require("readline");

const settings = require("./settings");

require("keypress")(process.stdin);

const dbg = true;
var field = [];
var frameTime = settings.game.defaultFrameTime;


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
                case 1:
                    presetSelector();
                break;
                case 2:
                    startGame(true);
                break;
                case 3:
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
                description: "Editor\n"
            },
            {
                key: "3",
                description: "About"
            }
        ]
    });

    mp.open();
}

/**
 * Recalculates and adjusts for a resized terminal
 */
function recalcSize()
{
    console.log(`Terminal size: ${process.stdout.columns}x${process.stdout.rows} - TTY? ${process.stdout.isTTY}`);
}

/**
 * Registers the async listeners for input
 */
function registerControls()
{

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

    console.log(JSON.stringify(field, null, 4));

    process.stdin.removeAllListeners();
    registerControls();

    drawGame(field);
    let calcFrame = () => {
        calcNextFrame(field).then(nextField => {
            setTimeout(() => {
                field = nextField;
                drawGame(nextField);
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
    return new Promise((resolve, reject) => {
        // TODO: game logic in here
        /*
            Rules:

            1 - Any live cell with two or three live neighbours survives.
            2 - Any dead cell with three live neighbours becomes a live cell.
            3 - All other live cells die in the next generation. Similarly, all other dead cells stay dead.
        */
        return resolve();
    });
}

/**
 * Draws the game
 * @param {Array<Number>} grid 
 */
function drawGame(grid)
{

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
        let kp = process.stdin.on("keypress", (ch, key) => {
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
                case "up":
                    if(currentListIdx > 0)
                        currentListIdx--;

                    redisplayPresets();
                break;
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
                case "return":
                    {
                        let selPresetPath = presets[currentListIdx];
                        let selData = JSON.parse(fs.readFileSync(join(presetsDir, selPresetPath)).toString());

                        loadPreset(selData.name, selData.size, selData.pattern);
                        
                        break;
                    }
                default:
                    // if(dbg) console.log(`Unknown keypress: ${JSON.stringify(key)}`);
                break;
            }
        });

        let clearKP = () => {
            process.stdin.pause();
            process.stdin.removeAllListeners();
        };

        process.stdin.setRawMode(true);
        process.stdin.resume();
        
        let redisplayPresets = () => {
            clearConsole();

            console.log("Presets found in the presets folder:\n");

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

            process.stdout.write(`\n\n\n[▲ ▼] Navigate - [↵] Select `);
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
    startGame(true, name, size[0], size[1]);
}

/**
 * Returns the current presets URL
 */
function getCurrentPresetsURL()
{
    return "[[Not implemented yet]]";
}

/**
 * Clears the console
 */
function clearConsole()
{
    if(dbg)
    {
        console.log(`\n\n\n--------------------------------------------------\n`);
        return;
    }
    console.clear();
}


preInit();
