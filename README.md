# CMPM 121 D3 Project

This is the D3 Assignment for CMPM 121. This project is essentially if you combined the AR elements of a game like Pokemon GO with the number combining element of games like 2048. There are several parts to this assignment that I'm supposed to work on, specifically D3.a, D3.b, D3.c, and D3.d all of which have different elements/requirements that need to be satisfied.

These are the different sections:

## D3.A: Core Mechanics

### D3.A Software requirements

- Leaflet is used to render an interactive map centered on the player's location (which is fixed to the location of the classroom).
- Grid cells of some fixed size (e.g. about the size of a house, 0.0001 degrees on a side) are rendered on the map.
- The contents of a cell (e.g. whether it contains a token, and if so a token of what value) are visible without needing to click the cell. This may be done with text or graphics (e.g. a sprite image or procedural graphics using a canvas tag).
- Cells can be clicked to exercise the game mechanics.
- Token spawning consistency is implemented using a deterministic hashing mechanism (likely using the luck function provided in the starter code)

### D3.A Gameplay requirements

#### D3.A Map

- The player can see cells all the way to the edge of the map (i.e. if the player doesn’t scroll the map, they could believe that cells covered the entire world).
- The player can only interact with cells near them (e.g. about three cells away from their current location).
  The initial state of cells is consistent across page loads.

#### D3.A Inventory

- They can pick up at most one token, and picking it up removes it from the cell that contained it.
- Whether the player holds a token and if so, what value it has is clearly visible on the screen.

#### D3.A Crafting

- If they have a token, they can place it onto a cell containing a token of equal value to produce a new token of double the value.
- The game detects when the player has a token of sufficient value in hand (e.g. 8 or 16).

## D3.B: Globe-spanning Gameplay

### D3.B Software requirements

- The interface offers some buttons to simulate local player movement (e.g. to move north/south/east/west by one grid step).
- As the player moves, cells continue to be visible all the way out to the edge of the map (i.e. they spawn/despawn as necessary to keep the screen full).
- The representation of grid cells uses an earth-spanning coordinate system anchored at Null Island (zero latitude, zero longitude).

### D3.B Gameplay requirements

#### D3.B Map

- The player can move their character about the map or simply scroll the map without moving their character, seeing cells wherever they go.
- As the character moves, only the cells near to their current location are available for interaction.
- Cells should appear to be memoryless in the sense that they forget their state when they are no longer visible on the screen. As a result, the player should be able to farm tokens by moving into and out of the visibility range of a cell. (This behavior will be robustly fixed in the next assignment.)

#### D3.B Crafting

- By practicing the collecting and crafting mechanics, the player can now craft a token a value higher than before, and the game now requires that threshold to be reached for victory to be declared.

## D3.C: Object Persistence

### D3.C Software requirements

- Cells should apply the Flyweight pattern or some similarly-effective memory-saving strategy so cells not visible on the map do not require memory for storage if they have not been modified by the player.
- Use the Memento pattern or some similarly-effective serialization strategy to preserve the state of modified cells when they scroll off-screen, and restore them when they return to view.

### D3.C Gameplay requirements

#### D3.C Map

- Cells should appear to have a memory of their state that persists even when they are not visible on the map (but persistence across page loads is not yet required —see next assignment).

## D3.D: Gameplay Across Real-world Space and Time

### D3.D Software requirements

- The browser geolocation API should be used to control player character movement instead of on-screen buttons.
- The implementation of the new player movement control system should be hidden behind an interface so that most of the game code does not depend on what moves the character. This implementation should embody the Facade design pattern.
- The browser localStorage API should be used to persist game state across page loads.

### D3.D Gameplay requirements

- The player can move their character by moving their device around the real world.
- Even if the player closes the game's page, they should be able to continue gameplay from the same state by simply opening the page again.
- The player needs some way to start a new game.
- The player needs some way to switch between button-based and geolocation-based movement. This can be a runtime control (e.g. an on-screen button) or something that is determined by looking at the page's query string (e.g. index.html?movement=geolocation versus index.html?movement=buttons)
