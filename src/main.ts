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

// Track spawned cache rectangles and labels so we can clear them when respawning
const spawnedCaches: (leaflet.Rectangle | leaflet.Marker)[] = [];

// Function to clear all spawned tiles from the map
function clearTiles() {
  for (const rect of spawnedCaches) {
    rect.remove();
  }
  spawnedCaches.length = 0;
}

// Function to spawn tiles around the player
function spawnTiles() {
  try {
    // Get the map's visible bounds
    const bounds = map.getBounds();
    const northWest = bounds.getNorthWest();
    const southEast = bounds.getSouthEast();

    // Calculate which tile indices are visible on screen
    // Note: i represents latitude rows (north/south), j represents longitude columns (east/west)
    // NorthWest has the highest lat, SouthEast has the lowest lat
    const minLat = Math.floor(
      (southEast.lat - PLAYER_LATLNG.lat) / TILE_DEGREES,
    );
    const maxLat = Math.ceil(
      (northWest.lat - PLAYER_LATLNG.lat) / TILE_DEGREES,
    );
    const minLng = Math.floor(
      (northWest.lng - PLAYER_LATLNG.lng) / TILE_DEGREES,
    );
    const maxLng = Math.ceil(
      (southEast.lng - PLAYER_LATLNG.lng) / TILE_DEGREES,
    );

    // Spawn tiles for all visible grid cells
    for (let i = minLat; i < maxLat; i++) {
      for (let j = minLng; j < maxLng; j++) {
        // If location i,j is lucky enough, spawn a cache!
        if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
          spawnCache(i, j);
        }
      }
    }
  } catch (_e) {
    // Map may not be ready yet; fall back to neighborhood spawn
    for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
      for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
        // If location i,j is lucky enough, spawn a cache!
        if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
          spawnCache(i, j);
        }
      }
    }
  }
}

if (typeof navigator !== "undefined" && "geolocation" in navigator) {
  // Use watchPosition for continuous location updates
  navigator.geolocation.watchPosition(
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

      try {
        if (playerCircle && typeof playerCircle.setLatLng === "function") {
          playerCircle.setLatLng(PLAYER_LATLNG);
        }
      } catch (_e) {
        // playerCircle may not exist yet; it's fine.
      }

      // Clear old tiles and spawn tiles at the updated location
      clearTiles();
      spawnTiles();
    },
    (err) => {
      console.warn("Geolocation failed, using fallback location:", err);
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

  // Calculate the center of this cache tile
  const tileCenter = bounds.getCenter();

  // Calculate the point value for this cache (mutable)
  let pointValue = Math.floor(
    luck([i, j, "initialValue"].toString()) * 4,
  );

  pointValue = Math.pow(2, pointValue); // Square the value for more variance

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
  spawnedCaches.push(rect);

  // Add a text label showing the point value
  const label = leaflet.marker(tileCenter, {
    icon: leaflet.divIcon({
      className: "cache-label",
      html:
        `<div style="font-size: 15px; font-weight: bold; text-align: center; color: #3388ff; text-shadow: 1px 1px 2px white; pointer-events: none;">${pointValue}</div>`,
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
        `<div style="font-size: 15px; font-weight: bold; text-align: center; color: #3388ff; text-shadow: 1px 1px 2px white; pointer-events: none;">${pointValue}</div>`,
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
                <button id="take">Take</button> <button id="place">Place</button>`;

    // Take button: remove coins from cache and add to player inventory
    popupDiv
      .querySelector<HTMLButtonElement>("#take")!
      .addEventListener("click", () => {
        if (pointValue >= 1) {
          if (playerPoints === 0) {
            playerPoints = pointValue;
            pointValue = 0;
            popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
              pointValue.toString();
            statusPanelDiv.innerHTML = `${playerPoints} points accumulated`;
            updateLabel(); // Update the label on the map
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
          } else {
            alert("You can only place points into a cache of equal value!");
          }
        } else {
          alert("You have no points to place!");
        }
      });

    return popupDiv;
  });
}
