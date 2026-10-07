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

// Özel ikon oluşturma (Resimli köyler için iptal edildi, yerine dinamik resim kullanılacak)

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
    
    places.forEach(place => {
        // Eğer filtre listesi doluysa ve bu yerin id'si filtrede yoksa atla
        if (filterIds.length > 0 && !filterIds.includes(place.id)) {
            return;
        }

        // Resmi varsa özel ikon kullan
        const markerOptions = {};
        if (place.images && place.images.length > 0) {
            markerOptions.icon = L.divIcon({
                className: 'custom-photo-marker',
                html: `<div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.5); background-color: #fff;"><img src="${place.images[0]}" style="width: 100%; height: 100%; object-fit: cover;"></div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });
        }

        const marker = L.marker([place.lat, place.lng], markerOptions).addTo(map);
        
        // Eğer resim varsa tooltip'e küçük bir fotoğraf simgesi ekle
        let tooltipText = place.name;
        if (place.images && place.images.length > 0) {
            tooltipText += ` 🖼️ (${place.images.length})`;
        }
        marker.bindTooltip(tooltipText, { permanent: false, direction: 'top' });
        
        marker.on('click', () => {
            if (place.images && place.images.length > 0) {
                const imagesStr = encodeURIComponent(JSON.stringify(place.images));
                const infoStr = encodeURIComponent(place.info || '');
                window.openGallery(imagesStr, 0, place.name, infoStr);
            } else {
                showModal(place.name, `<p>${place.info}</p>`);
            }
        });
        
        markers.push(marker);
    });
}

// Büyütülmüş resim galerisi için fonksiyon
window.openGallery = function(imagesStr, startIndex, placeName = '', placeInfoStr = '') {
    const images = JSON.parse(decodeURIComponent(imagesStr));
    const placeInfo = placeInfoStr ? decodeURIComponent(placeInfoStr) : '';
    let currentIndex = startIndex;

    const enlargedContainer = document.createElement('div');
    enlargedContainer.className = 'enlarged-image-overlay';
    
    function renderGallery() {
        let navLeft = '';
        let navRight = '';
        if (images.length > 1) {
            navLeft = `<button class="gallery-nav prev-btn" style="background:none; color:white; border:none; cursor:pointer; font-size:40px; padding:0 20px; outline:none; transition:transform 0.2s;">&#10094;</button>`;
            navRight = `<button class="gallery-nav next-btn" style="background:none; color:white; border:none; cursor:pointer; font-size:40px; padding:0 20px; outline:none; transition:transform 0.2s;">&#10095;</button>`;
        }
        
        const counterHtml = images.length > 1 ? `<div style="font-size:14px; color:#ccc; margin-bottom:5px;">${currentIndex + 1} / ${images.length}</div>` : '';

        let infoHtml = '';
        if (placeName || placeInfo) {
             infoHtml = `
                ${placeName ? `<h2 style="margin:0 0 5px 0; font-size:22px;">${placeName}</h2>` : ''}
                ${(placeInfo && placeInfo !== placeName) ? `<p style="margin:0; font-size:14px; max-width:800px; display:inline-block; line-height:1.4;">${placeInfo}</p>` : ''}
             `;
        }

        const bottomBarHtml = `
            <div style="display:flex; flex-direction:row; justify-content:center; align-items:center; width:100%; background:rgba(0,0,0,0.85); padding:15px; flex-shrink:0;">
                ${navLeft}
                <div style="display:flex; flex-direction:column; align-items:center; flex:1; text-align:center; color:white;">
                    ${counterHtml}
                    ${infoHtml}
                </div>
                ${navRight}
            </div>
        `;
        
        enlargedContainer.innerHTML = `
            <span class="close-enlarged" style="position:absolute; top:20px; right:30px; font-size:40px; color:white; cursor:pointer; z-index:1001;">&times;</span>
            <div style="flex:1; display:flex; align-items:center; justify-content:center; width:100%; overflow:hidden; padding:20px;">
                <img src="${images[currentIndex]}" class="enlarged-image" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            </div>
            ${bottomBarHtml}
        `;
        enlargedContainer.style.display = 'flex';
        enlargedContainer.style.flexDirection = 'column';
        enlargedContainer.style.justifyContent = 'space-between';
        
        enlargedContainer.querySelector('.close-enlarged').onclick = (e) => {
            e.stopPropagation();
            document.body.removeChild(enlargedContainer);
        };
        
        if (images.length > 1) {
            enlargedContainer.querySelector('.prev-btn').onclick = (e) => {
                e.stopPropagation();
                currentIndex = (currentIndex > 0) ? currentIndex - 1 : images.length - 1;
                renderGallery();
            };
            enlargedContainer.querySelector('.next-btn').onclick = (e) => {
                e.stopPropagation();
                currentIndex = (currentIndex < images.length - 1) ? currentIndex + 1 : 0;
                renderGallery();
            };
        }
    }
    
    // Clicking on background closes it
    enlargedContainer.onclick = (e) => {
        if (e.target === enlargedContainer) {
            document.body.removeChild(enlargedContainer);
        }
    };
    
    document.body.appendChild(enlargedContainer);
    renderGallery();
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
        const imagesStr = encodeURIComponent(JSON.stringify(place.images));
        place.images.forEach((imgUrl, index) => {
            html += `<img src="${imgUrl}" class="gallery-thumbnail" onclick="openGallery('${imagesStr}', ${index})" alt="${place.name} Resmi">`;
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
        show: false,
        createMarker: function() { return null; }
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
