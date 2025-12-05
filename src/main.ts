// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

// Create basic UI elements

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Create geolocation status display
const geoStatusDiv = document.createElement("div");
geoStatusDiv.id = "geoStatus";
geoStatusDiv.innerHTML = "🔍 Requesting location...";
document.body.append(geoStatusDiv);

// Create directional controls at the bottom
const navigationDiv = document.createElement("div");
navigationDiv.id = "navigation";
navigationDiv.innerHTML = `
  <button id="north">⬆️</button>
  <div>
    <button id="west">⬅️</button>
    <button id="south">⬇️</button>
    <button id="east">➡️</button>
  </div>
`;
document.body.append(navigationDiv);

// Create victory screen (hidden by default)
const victoryScreen = document.createElement("div");
victoryScreen.id = "victoryScreen";
victoryScreen.style.display = "none";
victoryScreen.innerHTML = `
  <div id="victoryContent">
    <h1>🎉 Victory! 🎉</h1>
    <p>Congratulations, you've won!</p>
    <button id="playAgain">Play Again</button>
  </div>
`;
document.body.append(victoryScreen);

// Function to show victory screen (call this to trigger victory)
export function showVictory() {
  victoryScreen.style.display = "flex";
}

// Make showVictory accessible from console for testing
(globalThis as { showVictory?: () => void }).showVictory = showVictory;

// Play again button reloads the page
document.addEventListener("DOMContentLoaded", () => {
  const playAgainBtn = document.getElementById("playAgain");
  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", () => {
      location.reload();
    });
  }
});

// Our current location (start with a fallback; update from device geolocation when available)
let PLAYER_BASE_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Offset for player position (can be modified by movement controls)
const playerOffset = { lat: 0, lng: 0 };

// Calculate actual player position (base + offset)
function getPlayerLatLng(): leaflet.LatLng {
  return leaflet.latLng(
    PLAYER_BASE_LATLNG.lat + playerOffset.lat,
    PLAYER_BASE_LATLNG.lng + playerOffset.lng,
  );
}

let PLAYER_LATLNG = getPlayerLatLng();

// Track spawned cache rectangles and labels so we can clear them when respawning
const spawnedCaches: (leaflet.Rectangle | leaflet.Marker)[] = [];

// Function to clear all spawned tiles from the map
function clearTiles() {
  for (const rect of spawnedCaches) {
    rect.remove();
  }
  spawnedCaches.length = 0;
}

// Function to spawn tiles dynamically across the full visible screen
function spawnTiles() {
  try {
    // Step 1: Get the map's current visible bounds (what's on screen)
    const bounds = map.getBounds();
    const northWest = bounds.getNorthWest(); // Top-left corner
    const southEast = bounds.getSouthEast(); // Bottom-right corner

    // Step 2: Convert the screen bounds to tile coordinates
    // Divide lat/lng by TILE_DEGREES to get tile indices from null island
    // northWest has the highest lat (north is positive), southEast has lowest lat
    const visibleMinLat = Math.floor(southEast.lat / TILE_DEGREES); // Bottom edge
    const visibleMaxLat = Math.ceil(northWest.lat / TILE_DEGREES); // Top edge
    const visibleMinLng = Math.floor(northWest.lng / TILE_DEGREES); // Left edge
    const visibleMaxLng = Math.ceil(southEast.lng / TILE_DEGREES); // Right edge

    // Step 2.5: Add buffer zone to extend tiles off-screen
    // This prevents blank spots when moving - tiles load before they're visible
    const TILE_BUFFER = 5; // Number of extra tiles to spawn beyond visible area
    const minLat = visibleMinLat - TILE_BUFFER;
    const maxLat = visibleMaxLat + TILE_BUFFER;
    const minLng = visibleMinLng - TILE_BUFFER;
    const maxLng = visibleMaxLng + TILE_BUFFER;

    // Step 3: Spawn tiles for every grid cell including buffer zone
    for (let i = minLat; i < maxLat; i++) {
      for (let j = minLng; j < maxLng; j++) {
        // Use luck function to determine if this tile gets a cache
        if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
          spawnCache(i, j);
        }
      }
    }
  } catch (_e) {
    // If map isn't ready yet, fall back to spawning around player
    const playerTileI = Math.floor(PLAYER_LATLNG.lat / TILE_DEGREES);
    const playerTileJ = Math.floor(PLAYER_LATLNG.lng / TILE_DEGREES);

    for (
      let i = playerTileI - NEIGHBORHOOD_SIZE;
      i < playerTileI + NEIGHBORHOOD_SIZE;
      i++
    ) {
      for (
        let j = playerTileJ - NEIGHBORHOOD_SIZE;
        j < playerTileJ + NEIGHBORHOOD_SIZE;
        j++
      ) {
        if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
          spawnCache(i, j);
        }
      }
    }
  }
}

if (typeof navigator !== "undefined" && "geolocation" in navigator) {
  // Track if we've received the first GPS update
  let firstGPSUpdate = true;

  // Use watchPosition for continuous location updates
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const newPosition = leaflet.latLng(latitude, longitude);

      // Allow first GPS update to always go through (replacing fallback position)
      if (!firstGPSUpdate) {
        // Filter out large GPS jumps - only update if within 100 meters of current position
        const MAX_POSITION_JUMP = 100; // meters
        const distanceFromCurrent = PLAYER_BASE_LATLNG.distanceTo(newPosition);

        if (distanceFromCurrent > MAX_POSITION_JUMP) {
          console.warn(
            `GPS jump detected: ${
              distanceFromCurrent.toFixed(1)
            }m - ignoring update`,
          );
          geoStatusDiv.innerHTML = `⚠️ GPS jump ignored (${
            distanceFromCurrent.toFixed(0)
          }m)`;
          geoStatusDiv.style.color = "orange";
          return; // Skip this update
        }
      }

      firstGPSUpdate = false; // Mark that we've processed the first update

      PLAYER_BASE_LATLNG = newPosition;
      PLAYER_LATLNG = getPlayerLatLng();

      // Update the map view and player marker if they exist. These are declared
      // later in the file, but this callback runs asynchronously after
      // synchronous initialization, so it's safe to call them here.
      try {
        // `map` and `playerMarker` are created later; when this callback runs
        // they will be defined and we can update them to reflect device location.
        // Use a try/catch to avoid runtime errors if something else changed.
        if (map && typeof map.setView === "function") {
          map.setView(PLAYER_LATLNG, GAMEPLAY_ZOOM_LEVEL);
        }
      } catch (_e) {
        // map may not be ready yet; that's fine — it'll still initialize at the fallback
      }

      try {
        if (playerMarker && typeof playerMarker.setLatLng === "function") {
          playerMarker.setLatLng(PLAYER_LATLNG);
        }
      } catch (_e) {
        // playerMarker may not exist yet; it's fine.
      }

      try {
        if (playerCircle && typeof playerCircle.setLatLng === "function") {
          playerCircle.setLatLng(PLAYER_LATLNG);
        }
      } catch (_e) {
        // playerCircle may not exist yet; it's fine.
      }

      // Update geolocation status
      geoStatusDiv.innerHTML = `✅ Location: ${latitude.toFixed(6)}, ${
        longitude.toFixed(6)
      }`;
      geoStatusDiv.style.color = "green";

      // Clear old tiles and spawn tiles at the updated location
      clearTiles();
      spawnTiles();
    },
    (err) => {
      console.warn("Geolocation failed, using fallback location:", err);

      // Update status with error details
      let errorMsg = "";
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMsg = "❌ Location denied - check browser permissions";
          break;
        case err.POSITION_UNAVAILABLE:
          errorMsg = "❌ Location unavailable - GPS signal lost";
          break;
        case err.TIMEOUT:
          errorMsg = "❌ Location timeout - taking too long";
          break;
        default:
          errorMsg = "❌ Location error: " + err.message;
      }
      geoStatusDiv.innerHTML = errorMsg + " (using fallback)";
      geoStatusDiv.style.color = "red";

      // Spawn tiles at the fallback location if not already spawned
      if (spawnedCaches.length === 0) {
        clearTiles();
        spawnTiles();
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0, // Always get fresh position, no cached location
      timeout: 20000, // Increased timeout for better accuracy
    },
  );
} else {
  console.warn("Geolocation not supported — using fallback location");
  geoStatusDiv.textContent = "❌ Geolocation not supported by browser";
  geoStatusDiv.style.color = "red";
  // Spawn tiles at the fallback location
  spawnTiles();
}

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: PLAYER_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(PLAYER_LATLNG);
playerMarker.bindTooltip("Your current location!");
playerMarker.addTo(map);

// Add a green circle around the player with radius of ~3 tiles
const playerCircle = leaflet.circle(PLAYER_LATLNG, {
  radius: 3 * TILE_DEGREES * 111000, // Convert degrees to meters (roughly 111km per degree)
  color: "green",
  fill: true,
  fillColor: "green",
  fillOpacity: 0.2,
  weight: 2,
});
playerCircle.addTo(map);

// Add directional controls to modify the offset
const MOVE_DISTANCE = TILE_DEGREES * 5; // Move by 10 tiles

document.getElementById("north")!.addEventListener("click", () => {
  playerOffset.lat += MOVE_DISTANCE / 2;
  PLAYER_LATLNG = getPlayerLatLng();
  map.setView(PLAYER_LATLNG, GAMEPLAY_ZOOM_LEVEL);
  playerMarker.setLatLng(PLAYER_LATLNG);
  playerCircle.setLatLng(PLAYER_LATLNG);
  clearTiles();
  spawnTiles();
});

document.getElementById("south")!.addEventListener("click", () => {
  playerOffset.lat -= MOVE_DISTANCE / 2;
  PLAYER_LATLNG = getPlayerLatLng();
  map.setView(PLAYER_LATLNG, GAMEPLAY_ZOOM_LEVEL);
  playerMarker.setLatLng(PLAYER_LATLNG);
  playerCircle.setLatLng(PLAYER_LATLNG);
  clearTiles();
  spawnTiles();
});

document.getElementById("west")!.addEventListener("click", () => {
  playerOffset.lng -= MOVE_DISTANCE;
  PLAYER_LATLNG = getPlayerLatLng();
  map.setView(PLAYER_LATLNG, GAMEPLAY_ZOOM_LEVEL);
  playerMarker.setLatLng(PLAYER_LATLNG);
  playerCircle.setLatLng(PLAYER_LATLNG);
  clearTiles();
  spawnTiles();
});

document.getElementById("east")!.addEventListener("click", () => {
  playerOffset.lng += MOVE_DISTANCE;
  PLAYER_LATLNG = getPlayerLatLng();
  map.setView(PLAYER_LATLNG, GAMEPLAY_ZOOM_LEVEL);
  playerMarker.setLatLng(PLAYER_LATLNG);
  playerCircle.setLatLng(PLAYER_LATLNG);
  clearTiles();
  spawnTiles();
});

// Display the player's points
let playerPoints = 0;
statusPanelDiv.innerHTML = "No points yet...";

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds relative to null island (0, 0)
  const origin = leaflet.latLng(0, 0);
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Calculate the center of this cache tile
  const tileCenter = bounds.getCenter();

  // Calculate the point value for this cache (mutable)
  let pointValue = Math.floor(
    luck([i, j, "initialValue"].toString()) * 4,
  );

  pointValue = Math.pow(2, pointValue); // Square the value for more variance

  // Check if this tile is within interaction range
  const INTERACTION_RADIUS = 3 * TILE_DEGREES * 111000; // Same as green circle radius
  const distanceToPlayer = PLAYER_LATLNG.distanceTo(tileCenter);
  const isWithinRange = distanceToPlayer <= INTERACTION_RADIUS;

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds, {
    color: isWithinRange ? "#3388ff" : "#ff3333ff", // Blue if in range, red if out of range
  });
  rect.addTo(map);
  spawnedCaches.push(rect);

  // Add a text label showing the point value
  const labelColor = isWithinRange ? "#3388ff" : "#ff3333ff"; // Match tile color
  const label = leaflet.marker(tileCenter, {
    icon: leaflet.divIcon({
      className: "cache-label",
      html:
        `<div style="font-size: 15px; font-weight: bold; text-align: center; color: ${labelColor}; text-shadow: 1px 1px 2px white; pointer-events: none;">${pointValue}</div>`,
      iconSize: [30, 30],
    }),
  });
  label.addTo(map);
  spawnedCaches.push(label); // Track label for cleanup

  // Disable pointer events on the label marker so clicks pass through to rectangles
  const labelElement = label.getElement();
  if (labelElement) {
    labelElement.style.pointerEvents = "none";
  }

  // Function to update the label when point value changes
  function updateLabel() {
    label.setIcon(leaflet.divIcon({
      className: "cache-label",
      html:
        `<div style="font-size: 15px; font-weight: bold; text-align: center; color: ${labelColor}; text-shadow: 1px 1px 2px white; pointer-events: none;">${pointValue}</div>`,
      iconSize: [30, 30],
    }));
  }

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Check if cache is within interaction range at click time
    const INTERACTION_RADIUS = 3 * TILE_DEGREES * 111000; // Same as green circle radius
    const distanceToPlayer = PLAYER_LATLNG.distanceTo(tileCenter);
    const isWithinRange = distanceToPlayer <= INTERACTION_RADIUS;

    // If not in range, show a message instead of allowing interaction
    if (!isWithinRange) {
      const outOfRangeDiv = document.createElement("div");
      outOfRangeDiv.innerHTML =
        `<div>This cache at "${i},${j}" is too far away!</div>`;
      return outOfRangeDiv;
    }

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i},${j}". It has value <span id="value">${pointValue}</span>.</div>
                <button id="take">Take</button> <button id="place">Place</button> <button id="destroy">Destroy</button>`;

    // Take button: remove coins from cache and add to player inventory
    popupDiv
      .querySelector<HTMLButtonElement>("#take")!
      .addEventListener("click", () => {
        if (pointValue >= 1) {
          if (playerPoints === 0 || playerPoints === pointValue) {
            playerPoints += pointValue;
            pointValue = 0;
            popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
              pointValue.toString();
            statusPanelDiv.innerHTML = `${playerPoints} points accumulated`;
            updateLabel(); // Update the label on the map
            rect.closePopup(); // Close the popup
            if (playerPoints >= 64) {
              showVictory();
            }
          } else {
            alert("Your hands are full!");
          }
        } else {
          alert("This cache is fully depleted!");
        }
      });

    // Place button: add player's coins to the cache
    popupDiv
      .querySelector<HTMLButtonElement>("#place")!
      .addEventListener("click", () => {
        if (playerPoints > 0) {
          if (pointValue === playerPoints || pointValue === 0) {
            pointValue += playerPoints;
            playerPoints = 0;
            popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
              pointValue.toString();
            statusPanelDiv.innerHTML = `No points yet...`;
            updateLabel(); // Update the label on the map
            rect.closePopup(); // Close the popup
            if (pointValue >= 64) {
              showVictory();
            }
          } else {
            alert("You can only place points into a cache of equal value!");
          }
        } else {
          alert("You have no points to place!");
        }
      });

    // Destroy button: set cache value to 0
    popupDiv
      .querySelector<HTMLButtonElement>("#destroy")!
      .addEventListener("click", () => {
        if (pointValue > 0) {
          pointValue = 0;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            pointValue.toString();
          updateLabel(); // Update the label on the map
          rect.closePopup(); // Close the popup
        } else {
          alert("This cache is already empty!");
        }
      });

    return popupDiv;
  });
}
