document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('loginContainer');
    const adminPanel = document.getElementById('adminPanel');
    const loginBtn = document.getElementById('loginBtn');
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('loginError');

    // Element references
    const placeName = document.getElementById('placeName');
    const placeLat = document.getElementById('placeLat');
    const placeLng = document.getElementById('placeLng');
    const placeInfo = document.getElementById('placeInfo');
    const saveBtn = document.getElementById('savePlaceBtn');
    const placesList = document.getElementById('placesList');
    
    // Login
    loginBtn.addEventListener('click', () => {
        if (passwordInput.value === '1984') {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'block';
            loadPlaces();
        } else {
            errorMsg.textContent = 'Hatalı şifre!';
        }
    });

    // Default data if none exists
    const defaultData = [
        { id: 1, name: "Şehreküstü", lat: 40.9080, lng: 35.8950, info: "Şehreküstü mahallesi Ladik'in eski yerleşim yerlerinden biridir." },
        { id: 2, name: "Kızılsini", lat: 40.8920, lng: 35.8420, info: "Kızılsini köyü tarım ve hayvancılıkla geçinen şirin bir köydür." }
    ];

    function getPlaces() {
        const data = localStorage.getItem('ladik_places');
        if (!data) {
            localStorage.setItem('ladik_places', JSON.stringify(defaultData));
            return defaultData;
        }
        return JSON.parse(data);
    }

    function savePlaces(places) {
        localStorage.setItem('ladik_places', JSON.stringify(places));
        loadPlaces();
    }

    function loadPlaces() {
        const places = getPlaces();
        placesList.innerHTML = '';
        places.forEach(place => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${place.name}</strong><br>
                    <small>Koord: ${place.lat}, ${place.lng}</small>
                </div>
                <button class="delete-btn" onclick="deletePlace(${place.id})">Sil</button>
            `;
            placesList.appendChild(li);
        });
    }

    // Expose delete to global window object
    window.deletePlace = function(id) {
        let places = getPlaces();
        places = places.filter(p => p.id !== id);
        savePlaces(places);
    };

    saveBtn.addEventListener('click', () => {
        if (!placeName.value || !placeLat.value || !placeLng.value) {
            alert("Lütfen ad, enlem ve boylam giriniz.");
            return;
        }
        
        const places = getPlaces();
        const newPlace = {
            id: Date.now(),
            name: placeName.value,
            lat: parseFloat(placeLat.value),
            lng: parseFloat(placeLng.value),
            info: placeInfo.value
        };
        
        places.push(newPlace);
        savePlaces(places);
        
        // Clear inputs
        placeName.value = '';
        placeLat.value = '';
        placeLng.value = '';
        placeInfo.value = '';
    });

    // Export to notepad (TXT/JSON format)
    document.getElementById('exportBtn').addEventListener('click', () => {
        const data = localStorage.getItem('ladik_places');
        const blob = new Blob([data], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "ladik_verileri.txt";
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import from notepad
    document.getElementById('importFile').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    savePlaces(data);
                    alert("Veriler başarıyla yüklendi!");
                } else {
                    alert("Geçersiz veri formatı.");
                }
            } catch (err) {
                alert("Dosya okunamadı. Geçerli bir veri dosyası olduğundan emin olun.");
            }
        };
        reader.readAsText(file);
    });
});
