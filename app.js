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
let savedOldRouteLine = null;

// Özel ikon oluşturma (Resimli köyler için)
const photoIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/10422/10422409.png', // Harita üstü foto ikon simgesi
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const startSelect = document.getElementById('startPoint');
const endSelect = document.getElementById('endPoint');
const detailBtn = document.getElementById('detailBtn');
const calcRouteBtn = document.getElementById('calcRouteBtn');
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

function initApp() {
    places = getPlaces();
    populateDropdowns();
    addMarkers();
}

function populateDropdowns() {
    startSelect.innerHTML = '<option value="">Seçiniz...</option>';
    endSelect.innerHTML = '<option value="">Seçiniz...</option>';
    
    const sortedPlaces = [...places].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    sortedPlaces.forEach(place => {
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

function addMarkers(filterIds = []) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    // Yalnızca seçili yerleşim yeri varsa haritada göster
    if (filterIds.length === 0) return;
    
    places.forEach(place => {
        // Eğer bu yerin id'si filtrede yoksa atla
        if (!filterIds.includes(place.id)) {
            return;
        }

        // Resmi varsa özel ikon kullan
        const markerOptions = {};
        if (place.images && place.images.length > 0) {
            markerOptions.icon = photoIcon;
        }

        const marker = L.marker([place.lat, place.lng], markerOptions).addTo(map);
        
        // Eğer resim varsa tooltip'e küçük bir fotoğraf simgesi ekle
        let tooltipText = place.name;
        if (place.images && place.images.length > 0) {
            tooltipText += ` 🖼️ (${place.images.length})`;
        }
        marker.bindTooltip(tooltipText, { permanent: false, direction: 'top' });
        
        marker.on('click', () => {
            // Modal'da resimleri oluştur
            let imagesHtml = '';
            if (place.images && place.images.length > 0) {
                imagesHtml = '<div class="gallery-container">';
                place.images.forEach(imgUrl => {
                    imagesHtml += `<img src="${imgUrl}" class="gallery-thumbnail" onclick="enlargeImage(this.src)" alt="${place.name} Resmi">`;
                });
                imagesHtml += '</div>';
            }
            showModal(place.name, `<p>${place.info}</p>${imagesHtml}`);
        });
        
        markers.push(marker);
    });
}

// Büyütülmüş resim için fonksiyon
window.enlargeImage = function(src) {
    const enlargedContainer = document.createElement('div');
    enlargedContainer.className = 'enlarged-image-overlay';
    enlargedContainer.innerHTML = `<img src="${src}" class="enlarged-image"><span class="close-enlarged">&times;</span>`;
    enlargedContainer.onclick = () => document.body.removeChild(enlargedContainer);
    document.body.appendChild(enlargedContainer);
};

// Açılır kutu değişimlerinde haritayı filtrele
function updateMapVisibility() {
    const startId = parseInt(startSelect.value);
    const endId = parseInt(endSelect.value);
    
    let filterIds = [];
    if (startId && endId && startId !== endId) {
        filterIds = [startId, endId];
    } else if (startId) {
        filterIds = [startId];
    } else if (endId) {
        filterIds = [endId];
    }
    
    addMarkers(filterIds);
}

startSelect.addEventListener('change', updateMapVisibility);
endSelect.addEventListener('change', updateMapVisibility);

// Show Detailed Info for Selected Dropdown Items
detailBtn.addEventListener('click', () => {
    const startId = parseInt(startSelect.value);
    const endId = parseInt(endSelect.value);
    
    if (!startId || !endId) {
        alert("Lütfen başlangıç ve varış noktalarını seçin.");
        return;
    }

    if (startId === endId) {
        alert("Başlangıç ve varış noktaları birbirinden farklı olmalıdır.");
        return;
    }
    
    const startPlace = places.find(p => p.id === startId);
    const endPlace = places.find(p => p.id === endId);
    
    // Check if an old route exists between these points
    const allRoutes = getRoutes();
    const oldRouteData = allRoutes.find(r => 
        (r.startId === startId && r.endId === endId) || 
        (r.startId === endId && r.endId === startId)
    );

    let routeInfoHtml = "";
    if (oldRouteData && oldRouteData.info) {
        routeInfoHtml = `
            <hr style="margin: 15px 0; border: 0; border-top: 2px dashed var(--primary-color);">
            <h3 style="color: var(--secondary-color);">Eski Yol Bilgisi (Kırmızı Rota)</h3>
            <p><i>${oldRouteData.info}</i></p>
        `;
    }

    // Resim Galerisi Oluşturma Fonksiyonu
    function getGalleryHtml(place) {
        if (!place.images || place.images.length === 0) return '';
        let html = '<div class="gallery-container">';
        place.images.forEach(imgUrl => {
            html += `<img src="${imgUrl}" class="gallery-thumbnail" onclick="enlargeImage(this.src)" alt="${place.name} Resmi">`;
        });
        html += '</div>';
        return html;
    }

    let content = `
        <h3>${startPlace.name}</h3>
        <p>${startPlace.info}</p>
        ${getGalleryHtml(startPlace)}
        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #ccc;">
        <h3>${endPlace.name}</h3>
        <p>${endPlace.info}</p>
        ${getGalleryHtml(endPlace)}
        ${routeInfoHtml}
    `;
    
    showModal("Seçili Yerlerin Bilgisi", content);
});

// Calculate New Route (Blue) and Show Old Route (Red)
calcRouteBtn.addEventListener('click', () => {
    const startId = parseInt(startSelect.value);
    const endId = parseInt(endSelect.value);
    
    if (!startId || !endId) {
        alert("Lütfen başlangıç ve varış noktalarını seçin.");
        return;
    }

    if (startId === endId) {
        alert("Lütfen iki FARKLI yerleşim yeri seçin.");
        return;
    }
    
    const startPlace = places.find(p => p.id === startId);
    const endPlace = places.find(p => p.id === endId);
    
    // 1. OSRM Yeni Yol (Mavi)
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
        show: false
    }).addTo(map);

    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        const distanceKm = (summary.totalDistance / 1000).toFixed(2);
        
        resultsPanel.style.display = 'block';
        newDistanceEl.textContent = distanceKm;
    });

    // 2. Kayıtlı Eski Yolu (Kırmızı) Göster
    if (savedOldRouteLine) {
        map.removeLayer(savedOldRouteLine);
        savedOldRouteLine = null;
        oldDistanceEl.textContent = "Bulunamadı";
    }

    const allRoutes = getRoutes();
    const oldRouteData = allRoutes.find(r => 
        (r.startId === startId && r.endId === endId) || 
        (r.startId === endId && r.endId === startId)
    );

    if (oldRouteData && oldRouteData.points.length > 0) {
        const latlngs = oldRouteData.points.map(p => L.latLng(p.lat, p.lng));
        savedOldRouteLine = L.polyline(latlngs, {
            color: 'red',
            weight: 5,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(map);

        // Calculate distance
        let totalMeters = 0;
        for (let i = 0; i < latlngs.length - 1; i++) {
            totalMeters += latlngs[i].distanceTo(latlngs[i+1]);
        }
        oldDistanceEl.textContent = (totalMeters / 1000).toFixed(2);
    } else {
        oldDistanceEl.textContent = "Kayıtlı yol yok";
    }
});

// Start
initApp();
