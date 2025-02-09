var map = new mapboxgl.Map({
	container: 'map-container',
	style: {
		version: 8,
		sources: {
			osm: {
				type: 'raster',
				tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
				tileSize: 256,
				attribution: 'Map tiles by <a target="_top" rel="noopener" href="https://tile.openstreetmap.org/">OpenStreetMap tile servers</a>, under the <a target="_top" rel="noopener" href="https://operations.osmfoundation.org/policies/tiles/">tile usage policy</a>. Data by <a target="_top" rel="noopener" href="http://openstreetmap.org">OpenStreetMap</a>'
			}
		},
		layers: [{
			id: 'osm',
			type: 'raster',
			source: 'osm',
		}],
	}
});

let drawing = false;
let currentPolygon = null;
let polygonCoordinates = [];

const polygonSelect = document.querySelector('.js-polygon-select');
const polygonNameInput = document.querySelector('.js-polygon-name');
const createPolygonButton = document.querySelector('.js-create-polygon-btn');
const savePolygonButton = document.querySelector('.js-save-polygon-btn');

createPolygonButton.addEventListener('click', () => {
	drawing = true;
	currentPolygon = {
		type: 'Feature',
		geometry: {
			type: 'Polygon',
			coordinates: [[]] // Initialize with an empty array of coordinates
		}
	};
	polygonCoordinates = []; // Clear previous polygon coordinates
});

map.on('click', (e) => {
	if (!drawing) {	
		return;
	}
	const lngLat = e.lngLat;
	polygonCoordinates.push([lngLat.lng, lngLat.lat]);
	currentPolygon.geometry.coordinates[0].push([lngLat.lng, lngLat.lat]); // Add coordinates to polygon

	// Update the source data for the polygon layer (if it exists)
	if (map.getSource('polygon-source')) {
		map.getSource('polygon-source').setData(currentPolygon);
	} else {
		// If the source doesn't exist, create it and the layer
		map.addSource('polygon-source', {
			type: 'geojson',
			data: currentPolygon
		});

		map.addLayer({
			id: 'polygon-layer',
			type: 'fill',
			source: 'polygon-source',
			paint: {
				'fill-color': 'blue',
				'fill-opacity': 0.5
			}
		});
	}
});

savePolygonButton.addEventListener('click', () => {
	if (!currentPolygon || polygonCoordinates.length < 3) { // Check if a polygon is being drawn and has at least 3 points
		alert('Please draw a polygon with at least 3 points before saving.');
		return;
	}

	const polygonName = polygonNameInput.value;

	if (!polygonName) {
		alert('Please enter a name for the polygon.');
		return;
	}

	// Add the polygon to the dropdown
	const option = document.createElement('option');
	option.value = polygonName;
	option.text = polygonName;
	polygonSelect.appendChild(option);

	// Store the polygon data (you might want to use a more robust storage mechanism)
	// For this example, we'll just log it to the console
	console.log({ name: polygonName, geojson: currentPolygon });

	// Reset for the next polygon
	drawing = false;
	currentPolygon = null;
	polygonCoordinates = [];
	polygonNameInput.value = ''; // Clear the input field

	//Remove the layer and source from the map
	map.removeLayer('polygon-layer');
	map.removeSource('polygon-source');
});
