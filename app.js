// Initialize Map
const map = L.map('map').setView([40.9167, 35.8833], 13); // Centered on Ladik, Samsun

// Add OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Data Management
let places = [];
let markers = [];
let routingControl = null;
let customRoutePoints = [];
let customRouteLine = null;
let isDrawingMode = false;

const startSelect = document.getElementById('startPoint');
const endSelect = document.getElementById('endPoint');
const detailBtn = document.getElementById('detailBtn');
const calcRouteBtn = document.getElementById('calcRouteBtn');
const drawOldRouteBtn = document.getElementById('drawOldRouteBtn');
const resultsPanel = document.getElementById('resultsPanel');
const newDistanceEl = document.getElementById('newDistance');
const oldDistanceEl = document.getElementById('oldDistance');

// Modal Elements
const modal = document.getElementById('infoModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const closeBtn = document.querySelector('.close-btn');

closeBtn.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function showModal(title, content) {
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.style.display = "flex";
}

function loadData() {
    const data = localStorage.getItem('ladik_places');
    if (data) {
        places = JSON.parse(data);
    } else {
        // Default Data
        places = [
            { id: 1, name: "Şehreküstü", lat: 40.9080, lng: 35.8950, info: "Şehreküstü mahallesi Ladik'in eski yerleşim yerlerinden biridir." },
            { id: 2, name: "Kızılsini", lat: 40.8920, lng: 35.8420, info: "Kızılsini köyü tarım ve hayvancılıkla geçinen şirin bir köydür." }
        ];
        localStorage.setItem('ladik_places', JSON.stringify(places));
    }
    
    populateDropdowns();
    addMarkers();
}

function populateDropdowns() {
    startSelect.innerHTML = '<option value="">Seçiniz...</option>';
    endSelect.innerHTML = '<option value="">Seçiniz...</option>';
    
    places.forEach(place => {
        const option1 = document.createElement('option');
        option1.value = place.id;
        option1.textContent = place.name;
        
        const option2 = document.createElement('option');
        option2.value = place.id;
        option2.textContent = place.name;
        
        startSelect.appendChild(option1);
        endSelect.appendChild(option2);
    });
}

function addMarkers() {
    // Clear old markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    places.forEach(place => {
        const marker = L.marker([place.lat, place.lng]).addTo(map);
        marker.bindTooltip(place.name, { permanent: false, direction: 'top' });
        
        // Show detailed info on click
        marker.on('click', () => {
            showModal(place.name, `<p>${place.info}</p>`);
        });
        
        markers.push(marker);
    });
}

// Show Detailed Info for Selected Dropdown Items
detailBtn.addEventListener('click', () => {
    const startId = parseInt(startSelect.value);
    const endId = parseInt(endSelect.value);
    
    if (!startId || !endId) {
        alert("Lütfen başlangıç ve varış noktalarını seçin.");
        return;
    }
    
    const startPlace = places.find(p => p.id === startId);
    const endPlace = places.find(p => p.id === endId);
    
    let content = `
        <h3>${startPlace.name}</h3>
        <p>${startPlace.info}</p>
        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #ccc;">
        <h3>${endPlace.name}</h3>
        <p>${endPlace.info}</p>
    `;
    
    showModal("Seçili Yerlerin Bilgisi", content);
});

// Calculate New Route (Blue)
calcRouteBtn.addEventListener('click', () => {
    const startId = parseInt(startSelect.value);
    const endId = parseInt(endSelect.value);
    
    if (!startId || !endId) {
        alert("Lütfen başlangıç ve varış noktalarını seçin.");
        return;
    }
    
    const startPlace = places.find(p => p.id === startId);
    const endPlace = places.find(p => p.id === endId);
    
    if (routingControl) {
        map.removeControl(routingControl);
    }
    
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(startPlace.lat, startPlace.lng),
            L.latLng(endPlace.lat, endPlace.lng)
        ],
        router: L.Routing.osrmv1({
            serviceUrl: 'https://routing.openstreetmap.de/routed-car/route/v1'
        }),
        lineOptions: {
            styles: [{color: 'blue', opacity: 0.7, weight: 5}]
        },
        routeWhileDragging: false,
        addWaypoints: false,
        show: false // Hide the step-by-step panel
    }).addTo(map);

    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        const distanceKm = (summary.totalDistance / 1000).toFixed(2);
        
        resultsPanel.style.display = 'block';
        newDistanceEl.textContent = distanceKm;
    });
});

// Draw Old Route (Red)
drawOldRouteBtn.addEventListener('click', () => {
    isDrawingMode = !isDrawingMode;
    
    if (isDrawingMode) {
        drawOldRouteBtn.textContent = "Çizimi Bitir ve Hesapla";
        drawOldRouteBtn.classList.replace("secondary-btn", "primary-btn");
        customRoutePoints = [];
        
        if (customRouteLine) {
            map.removeLayer(customRouteLine);
            customRouteLine = null;
        }
        
        map.getContainer().style.cursor = 'crosshair';
    } else {
        drawOldRouteBtn.textContent = "Eski Yolu Çiz (Kırmızı)";
        drawOldRouteBtn.classList.replace("primary-btn", "secondary-btn");
        map.getContainer().style.cursor = '';
        
        if (customRoutePoints.length > 1) {
            calculateOldDistance();
        } else {
            alert("En az 2 nokta seçmelisiniz.");
        }
    }
});

map.on('click', function(e) {
    if (!isDrawingMode) return;
    
    customRoutePoints.push(e.latlng);
    
    if (customRouteLine) {
        map.removeLayer(customRouteLine);
    }
    
    customRouteLine = L.polyline(customRoutePoints, {
        color: 'red',
        weight: 5,
        opacity: 0.7,
        dashArray: '10, 10' // Make it look like an old path
    }).addTo(map);
});

function calculateOldDistance() {
    let totalMeters = 0;
    for (let i = 0; i < customRoutePoints.length - 1; i++) {
        totalMeters += customRoutePoints[i].distanceTo(customRoutePoints[i+1]);
    }
    
    const distanceKm = (totalMeters / 1000).toFixed(2);
    resultsPanel.style.display = 'block';
    oldDistanceEl.textContent = distanceKm;
}

// Initial Load
loadData();
