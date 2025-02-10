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

const polygons = {};
let drawing = false;
let currentPolygon = null;
let polygonCoordinates = [];

let editing = false;
let markers = [];
let selectedVertexIndex = null; // Track the currently selected vertex

const editorDiv = document.getElementById('lfmde');

const polygonSelect = editorDiv.querySelector('.js-polygon-select');
const polygonNameInput = editorDiv.querySelector('.js-polygon-name');
const createPolygonButton = editorDiv.querySelector('.js-create-polygon-btn');
const savePolygonButton = editorDiv.querySelector('.js-save-polygon-btn');
const editShapeButton = editorDiv.querySelector('.js-edit-shape');

const editInputs = editorDiv.querySelector('.js-edit-inputs');
const latInput = editorDiv.querySelector('.js-lat-input');
const lngInput = editorDiv.querySelector('.js-lng-input');
const updateVertexButton = editorDiv.querySelector('.js-update-vertex');


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
	polygons[polygonName] = currentPolygon;
	
	// Reset for the next polygon
	drawing = false;
	currentPolygon = null;
	polygonCoordinates = [];
	polygonNameInput.value = ''; // Clear the input field

	//Remove the layer and source from the map
	map.removeLayer('polygon-layer');
	map.removeSource('polygon-source');
});

polygonSelect.addEventListener('change', () => {
	const selectedPolygonName = polygonSelect.value;
	if (!selectedPolygonName) {
		return
	}

	const selectedPolygon = polygons[selectedPolygonName];
	if (!selectedPolygon) {
		return
	}

	//Remove the layer and source from the map if they exist
	if (map.getSource('polygon-source')) {
		map.removeLayer('polygon-layer');
		map.removeSource('polygon-source');
	}

	map.addSource('polygon-source', {
		type: 'geojson',
		data: selectedPolygon
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

	// Fit the map to the selected polygon
	const bounds = new mapboxgl.LngLatBounds();
	selectedPolygon.geometry.coordinates[0].forEach(coord => {
		bounds.extend(coord);
	});
	map.fitBounds(bounds, { padding: 50 });  // Add padding for better visualization
});

editShapeButton.addEventListener('click', () => {
	editing = !editing; // Toggle editing mode

	if (!editing) {
		// Remove markers and hide input fields when editing is turned off
		markers.forEach(marker => marker.remove());
		markers = [];
		editInputs.style.display = 'none';
		selectedVertexIndex = null;
		return;
	}

	if (!map.getSource('polygon-source')) { // Ensure a polygon is loaded
		alert("Please load a polygon to edit.");
		editing = false; // Turn editing off since there's no polygon to edit.
		return;
	}

	const polygon = map.getSource('polygon-source')._data; // Get the polygon data

	// Create draggable markers for each vertex
	polygon.geometry.coordinates[0].forEach((coord, index) => {
		const marker = new mapboxgl.Marker({ element: createMarkerElement() , draggable: true })
			.setLngLat(coord)
			.addTo(map);

		markers.push(marker);

		marker.getElement().addEventListener('click', () => {
			selectedVertexIndex = index; // Store the index of the clicked vertex
			editInputs.style.display = 'block'; // Show the input fields
			latInput.value = coord[1]; // Fill in current latitude
			lngInput.value = coord[0]; // Fill in current longitude
		});

		marker.on('dragend', () => {
			const newLngLat = marker.getLngLat();
			polygon.geometry.coordinates[0][index] = [newLngLat.lng, newLngLat.lat];
			map.getSource('polygon-source').setData(polygon); // Update the source
		});
	});
});


function createMarkerElement() {
	const el = document.createElement('div');
	el.className = 'draggable-marker';
	return el;
}

updateVertexButton.addEventListener('click', () => {
	if (selectedVertexIndex === null) {
		return;
	}

	const newLat = parseFloat(latInput.value);
	const newLng = parseFloat(lngInput.value);

	if (isNaN(newLat) || isNaN(newLng)) {
		alert("Please enter valid latitude and longitude values.");
		return;
	}

	const polygon = map.getSource('polygon-source')._data;
	polygon.geometry.coordinates[0][selectedVertexIndex] = [newLng, newLat];
	map.getSource('polygon-source').setData(polygon);
	markers[selectedVertexIndex].setLngLat([newLng, newLat]); // Update Marker
	editInputs.style.display = 'none'; // Hide input fields after update
});
