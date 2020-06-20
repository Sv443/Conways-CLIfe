<div style="text-align: center" align="center">

# Conways Game of CLIfe
[![License](https://img.shields.io/github/license/Sv443/Conways-CLIfe)](https://sv443.net/LICENSE)
[![Build Status](https://github.com/Sv443/Conways-CLIfe/workflows/build/badge.svg)](https://github.com/Sv443/Conways-CLIfe/actions)
[![Known Vulnerabilities](https://snyk.io/test/github/Sv443/Conways-CLIfe/badge.svg)](https://snyk.io/test/github/Sv443/Conways-CLIfe)
[![Discord](https://img.shields.io/discord/565933531214118942)](https://sv443.net/discord)  

[![preview](./clife_preview.gif)](#readme)

</div>

## Info:
Conway's Game of Life in the Command Line Interface.  
Features a bunch of premade presets, a random generator and an editor to create your own presets.  
I strongly recommend using CMD, Git Bash or zsh to run this since it renders better than other terminal apps.  

### This game is part of my [CLI Games Collection](https://github.com/Sv443/CLI-Games-Collection)
### You can download a standalone version here: [![(click)](https://img.shields.io/github/v/release/Sv443/Conways-CLIfe.svg)](https://github.com/Sv443/Conways-CLIfe/releases)

<br>

## Steps to build:
1. Have Node.js and npm installed (I recommend the latest v14)
2. Download or clone the repo and open a terminal in the downloaded folder
3. Install dependencies by running the command `npm i` in the terminal
4. Run the command `npm run build` to build the executables (they will be located in the `dist` folder)

<br>

## Rules of Conway's game of life:
| &nbsp; | &nbsp; |
| --- | --- |
| Births | Each dead cell adjacent to exactly three live neighbors will become live in the next generation. |
| Death by isolation | Each live cell with one or fewer live neighbors will die in the next generation. |
| Death by overcrowding | Each live cell with four or more live neighbors will die in the next generation. |
| Survival | Each live cell with either two or three live neighbors will remain alive for the next generation. |

<br>

## Dependencies:
- [fs-extra](https://npmjs.com/package/fs-extra)
- [keypress](https://npmjs.com/package/keypress)
- [perlin-noise](https://npmjs.com/package/perlin-noise)
- [svjsl](https://npmjs.com/package/svjsl)
- [unzipper](https://npmjs.com/package/unzipper)
