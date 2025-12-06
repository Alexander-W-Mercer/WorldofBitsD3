# D3: World of Bits

## Game Design Vision

What this game will encompass by the end will be a mixture of AR games, such as Pokemon Go, and number combination games such as 2048. The game will have the user move around the world in order to locate and combine different peices to create larger and larger combinations of tokens.

## Technologies

- TypeScript for most game code, little to no explicit HTML, and all CSS collected in common `style.css` file
- Deno and Vite for building
- GitHub Actions + GitHub Pages for deployment automation

## Assignments

## D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

### Steps

- [x] copy main.ts to reference.ts for future reference
- [x] delete everything in main.ts
- [x] put a basic leaflet map on the screen
- [x] draw the player's location on the map
- [x] Replace the rectangles to be around the player
- [x] use loops to draw a whole grid of cells on the map
- [x] make a radius circle that shows the area that's clickable within for the player
- [x] make only tiles clickable that are within the green circle
- [x] visually display how many points each tile has within them.
- [x] make tiles not able to drop below 0 of itself
- [x] adjust the generating numbers with the luck-style points to have something that fits better
- [x] make picking up items while hands are full impossible
- [c] look for fix to strange inaccurate location detection
- [x] add ability to place tokens back into empty space by adding place button to popup.
- [x] add crafting by modifying the place button to allow placing onto tiles of equal value.
- [x] complete all steps in D3.a

## D3.b

- [x] make starting guideline bullet points in plan.md for D3
- [x] Make directional arrows appear on the screen
- [x] change player positioning so that it is tied to your location plus an offset
- [x] make those arrows change the offset
- [x] switch the starting coords over to null island, and see if theres more to that than I think
- [x] make the rectangles worldwide, just only show up near player
- [x] fix whatever broke with not displaying the rectangles on the full screen
- [x] change color of non-reachable tiles just for fun
- [x] with recommendations from copilot, 'increase position accuracy filtering' by only updating if a GPS jump is within a certain distance of my last known location because that might help with the issue of the constant jumping to new locations
- [x] make the text box go away when you either take or place a number because it is starting to annoy me
- [x] make a 'destroy' button to empty a tile, that way there can be a space to put something down
- [x] make it possible to pick up a number of the same type while holding one otherwise I'm not sure how I'm going to get to test getting to 64 due to how the numbers like to delete themselves.
- [x] make victory screen upon crafting a tile that is equal to 64

### D3.c

- [x] Design a class that works as an interface for a flyweight pattern, allowing for efficient recreation of all the tiles with the same assets / designs and whatnot
- [x] Design a restore function for this class that holds a whole array (map?) that would be the momento 'caretaker' for all the 'momentos' (the tiles)
- [x] Complete the TileType instance that is inheranted by all tiles
- [x] Make an instance of the TileCaretaker class so I can track the different tile momentos
- [x] refactor the spawncache so that it actually uses the new flyweight stuff
- [x] make it so that the tile / momento is only saved to the caretaker array after one of the three buttons on it has been clicked (destroy, take, place)
- [x] Use the caretakers saved states to rebuild the tiles when moving back over an area

### D3.d

- [x] Make the character player token follow the players real world location (I accidentally did this already in D3.a)
- [x] make the game rememebr your state even after closing (local storage)
- [x] impliment reset button at the bottom
- [x] add a button that hides or shows the movement keys
- [x] create a PlayerMovementFacade class
- [x] create a simple interface with different methods for simplicity
- [ ] factor all the code to just use the duplicate logic thats in the PlayerMovementFacade class stuff
