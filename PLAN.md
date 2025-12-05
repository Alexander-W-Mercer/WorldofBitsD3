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
- [ ] make victory screen upon crafting a tile that is equal to 64

### D3.c
