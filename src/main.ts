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

// Our current location (start with a fallback; update from device geolocation when available)
let PLAYER_LATLNG = leaflet.latLng(36.997936938057016, -122.05703507501151);

// Track spawned cache rectangles so we can clear them when respawning
const spawnedCaches: leaflet.Rectangle[] = [];

// Function to clear all spawned tiles from the map
function clearTiles() {
  for (const rect of spawnedCaches) {
    rect.remove();
  }
  spawnedCaches.length = 0;
}

// Function to spawn tiles around the player
function spawnTiles() {
  // Look around the player's neighborhood for caches to spawn
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      // If location i,j is lucky enough, spawn a cache!
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(i, j);
      }
    }
  }
}

if (typeof navigator !== "undefined" && "geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      PLAYER_LATLNG = leaflet.latLng(latitude, longitude);

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

      // Clear old tiles and spawn tiles at the updated location
      clearTiles();
      spawnTiles();
    },
    (err) => {
      console.warn("Geolocation failed, using fallback location:", err);
      // Clear old tiles and spawn tiles at the fallback location
      clearTiles();
      spawnTiles();
    },
    { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
  );
} else {
  console.warn("Geolocation not supported — using fallback location");
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

// Display the player's points
let playerPoints = 0;
statusPanelDiv.innerHTML = "No points yet...";

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const origin = PLAYER_LATLNG;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
  spawnedCaches.push(rect);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    let pointValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i},${j}". It has value <span id="value">${pointValue}</span>.</div>
                <button id="poke">poke</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#poke")!
      .addEventListener("click", () => {
        pointValue--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          pointValue.toString();
        playerPoints++;
        statusPanelDiv.innerHTML = `${playerPoints} points accumulated`;
      });

    return popupDiv;
  });
}
