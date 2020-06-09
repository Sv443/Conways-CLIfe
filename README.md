# Conways-CLIfe
Conway's Game of Life in the Command Line Interface.  
Features a bunch of premade presets, a random generator and an editor to create your own presets.  
Windows Users: I strongly recommend using CMD or Git Bash to run this since it looks better than PowerShell.  

### This game is part of my [CLI game collection](https://github.com/Sv443/CLI-Games-Collection)
  
### Rules of Conway's game of life:
|  |  |
| --- | --- |
| Births | Each dead cell adjacent to exactly three live neighbors will become live in the next generation. |
| Death by isolation | Each live cell with one or fewer live neighbors will die in the next generation. |
| Death by overcrowding | Each live cell with four or more live neighbors will die in the next generation. |
| Survival | Each live cell with either two or three live neighbors will remain alive for the next generation. |

## Steps to build:

## Dependencies:
- keypress
- perlin-noise
- svjsl
