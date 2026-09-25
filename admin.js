document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('loginContainer');
    const adminPanel = document.getElementById('adminPanel');
    const loginBtn = document.getElementById('loginBtn');
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('loginError');

    const placeId = document.getElementById('placeId');
    const placeName = document.getElementById('placeName');
    const placeLat = document.getElementById('placeLat');
    const placeLng = document.getElementById('placeLng');
    const placeInfo = document.getElementById('placeInfo');
    const saveBtn = document.getElementById('savePlaceBtn');
    const placesList = document.getElementById('placesList');

    const startSelect = document.getElementById('startPoint');
    const endSelect = document.getElementById('endPoint');
    const drawOldRouteBtn = document.getElementById('drawOldRouteBtn');
    const saveOldRouteBtn = document.getElementById('saveOldRouteBtn');
    const deleteOldRouteBtn = document.getElementById('deleteOldRouteBtn');

    let adminMap = null;
    let markers = [];
    let isDrawingMode = false;
    let customRoutePoints = [];
    let customRouteLine = null;
    let tempPlaces = [];

    // Login
    loginBtn.addEventListener('click', () => {
        if (passwordInput.value === '1984') {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'flex';
            initAdmin();
        } else {
            errorMsg.textContent = 'Hatalı şifre!';
        }
    });

    function initAdmin() {
        tempPlaces = getPlaces();
        
        // Initialize Map
        if (!adminMap) {
            adminMap = L.map('adminMap').setView([40.9167, 35.8833], 13);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(adminMap);

            adminMap.on('click', function(e) {
                if (isDrawingMode) {
                    customRoutePoints.push(e.latlng);
                    if (customRouteLine) adminMap.removeLayer(customRouteLine);
                    customRouteLine = L.polyline(customRoutePoints, {
                        color: 'red', weight: 5, opacity: 0.7, dashArray: '10, 10'
                    }).addTo(adminMap);
                } else {
                    // Just updating coordinates when clicking map (if form is open)
                    placeLat.value = e.latlng.lat.toFixed(4);
                    placeLng.value = e.latlng.lng.toFixed(4);
                }
            });
        }

        loadPlacesList();
        populateRouteDropdowns();
        addMarkersToMap();
    }

    function loadPlacesList() {
        placesList.innerHTML = '';
        tempPlaces.forEach(place => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${place.name}</strong><br>
                    <small>Koord: ${place.lat}, ${place.lng}</small>
                </div>
                <button class="primary-btn" style="width:auto; padding:0.4rem 0.8rem; margin-bottom:0;" onclick="editPlace(${place.id})">Düzenle</button>
            `;
            placesList.appendChild(li);
        });
    }

    window.editPlace = function(id) {
        const p = tempPlaces.find(x => x.id === id);
        if (p) {
            placeId.value = p.id;
            placeName.value = p.name;
            placeLat.value = p.lat;
            placeLng.value = p.lng;
            placeInfo.value = p.info;
            adminMap.setView([p.lat, p.lng], 15);
        }
    };

    saveBtn.addEventListener('click', () => {
        if (!placeName.value) return alert("Yerleşim Yeri Adı zorunludur.");
        
        const id = parseInt(placeId.value) || Date.now();
        const pIndex = tempPlaces.findIndex(x => x.id === id);
        
        const updatedPlace = {
            id: id,
            name: placeName.value,
            lat: parseFloat(placeLat.value || 40.9167),
            lng: parseFloat(placeLng.value || 35.8833),
            info: placeInfo.value
        };

        if (pIndex > -1) {
            tempPlaces[pIndex] = updatedPlace;
        } else {
            tempPlaces.push(updatedPlace);
        }

        savePlaces(tempPlaces);
        loadPlacesList();
        populateRouteDropdowns();
        addMarkersToMap();
        alert("Kaydedildi!");
        
        // Reset form
        placeId.value = '';
        placeName.value = '';
        placeLat.value = '';
        placeLng.value = '';
        placeInfo.value = '';
    });

    function populateRouteDropdowns() {
        startSelect.innerHTML = '<option value="">Seçiniz...</option>';
        endSelect.innerHTML = '<option value="">Seçiniz...</option>';
        tempPlaces.forEach(place => {
            const opt1 = new Option(place.name, place.id);
            const opt2 = new Option(place.name, place.id);
            startSelect.add(opt1);
            endSelect.add(opt2);
        });
    }

    function addMarkersToMap() {
        markers.forEach(m => adminMap.removeLayer(m));
        markers = [];
        tempPlaces.forEach(place => {
            const m = L.marker([place.lat, place.lng]).addTo(adminMap);
            m.bindTooltip(place.name);
            markers.push(m);
        });
    }

    // DRAW ROUTE LOGIC
    drawOldRouteBtn.addEventListener('click', () => {
        if (!startSelect.value || !endSelect.value) {
            return alert("Önce başlangıç ve varış noktalarını seçmelisiniz.");
        }
        isDrawingMode = true;
        customRoutePoints = [];
        if (customRouteLine) adminMap.removeLayer(customRouteLine);
        adminMap.getContainer().style.cursor = 'crosshair';
        drawOldRouteBtn.style.display = 'none';
        saveOldRouteBtn.style.display = 'block';
    });

    saveOldRouteBtn.addEventListener('click', () => {
        isDrawingMode = false;
        adminMap.getContainer().style.cursor = '';
        drawOldRouteBtn.style.display = 'block';
        saveOldRouteBtn.style.display = 'none';

        if (customRoutePoints.length < 2) {
            return alert("Yolu kaydetmek için en az 2 noktaya tıklamalısınız.");
        }

        const startId = parseInt(startSelect.value);
        const endId = parseInt(endSelect.value);
        
        if (startId === endId) {
            return alert("Başlangıç ve varış noktaları aynı olamaz!");
        }

        const routeInfoElement = document.getElementById('routeInfo');
        const defaultRouteText = "Bu eski yol, zamanında bölge halkı tarafından yaylalara çıkmak ve kervan ticareti yapmak amacıyla yoğun olarak kullanılırdı.";
        const routeText = routeInfoElement.value.trim() !== "" ? routeInfoElement.value : defaultRouteText;
        
        let routes = getRoutes();
        // Remove existing route for this pair if any (bidirectional)
        routes = routes.filter(r => !(r.startId === startId && r.endId === endId) && !(r.startId === endId && r.endId === startId));
        
        routes.push({
            startId: startId,
            endId: endId,
            info: routeText,
            points: customRoutePoints.map(p => ({lat: p.lat, lng: p.lng}))
        });

        saveRoutes(routes);
        routeInfoElement.value = ''; // clear
        alert("Eski Yol kaydedildi!");
    });

    deleteOldRouteBtn.addEventListener('click', () => {
        if (!startSelect.value || !endSelect.value) {
            return alert("Silmek istediğiniz yolun başlangıç ve varış noktalarını seçin.");
        }
        
        const startId = parseInt(startSelect.value);
        const endId = parseInt(endSelect.value);
        let routes = getRoutes();
        const initialLen = routes.length;
        
        // Remove the route connecting these two points
        routes = routes.filter(r => !(r.startId === startId && r.endId === endId) && !(r.startId === endId && r.endId === startId));
        
        if (routes.length < initialLen) {
            saveRoutes(routes);
            alert("Kayıtlı eski yol başarıyla silindi.");
        } else {
            alert("Bu iki yer arasında zaten kayıtlı bir eski yol bulunamadı.");
        }
    });

    // EXPORT & IMPORT
    document.getElementById('exportBtn').addEventListener('click', () => {
        const exportData = {
            places: getPlaces(),
            routes: getRoutes()
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "ladik_verileri.txt";
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('importFile').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.places && data.routes) {
                    savePlaces(data.places);
                    saveRoutes(data.routes);
                    alert("Veriler başarıyla yüklendi!");
                    initAdmin(); // reload
                } else if (Array.isArray(data)) {
                    // Fallback for older format
                    savePlaces(data);
                    alert("Eski veri formatı yüklendi.");
                    initAdmin();
                }
            } catch (err) {
                alert("Dosya okunamadı. Geçerli bir veri dosyası olduğundan emin olun.");
            }
        };
        reader.readAsText(file);
    });
});
