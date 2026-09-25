const ladikMahalleleri = [
    "Akpınar", "Aktaş", "Alıçlı", "Alıçlıseki", "Arslantaş", "Aşağıgölyeri", "Ayvalısofra", 
    "Bahşi", "Başlamış", "Bolat", "Budakdere", "Büyükkızoğlu", "Çadırkaya", "Çakırgümüş", 
    "Çamlıköy", "Çınarlı", "Çukurhan", "Deliahmetoğlu", "Derebaşal", "Dikilitaş", "Doğankaş", 
    "Eğriköy", "Gürün", "Güvenli", "Hasırcı", "Hızarbaşı", "İbi", "İskaniye", "Kabacagöz", 
    "Kadıyakası", "Karakaya", "Karapınar", "Karga", "Kızılsini", "Koğa", "Köprübaşı", "Körfez", 
    "Kuyucak", "Küçükkızoğlu", "Mazlumoğlu", "Meşepınarı", "Nusret", "Oymapınar", "Özlüce", 
    "Paşa", "Salur", "Sanayi", "Saray", "Sarıgazel", "Şehreküstü", "Şıhlı", "Soğanlı", 
    "Söğütlü", "Tatlıcak", "Tepecik", "Teberoğlu", "Tüfekçidere", "Yenicami", "Yeniköy", 
    "Yolapa", "Yukarıgölyeri"
];

function generateDefaultData() {
    return ladikMahalleleri.map((name, index) => {
        // Dağıtılmış koordinatlar oluştur (Ladik merkez etrafında rastgele)
        const offsetLat = (Math.random() - 0.5) * 0.1;
        const offsetLng = (Math.random() - 0.5) * 0.1;
        
        return {
            id: index + 1,
            name: name,
            lat: (40.9167 + offsetLat).toFixed(4),
            lng: (35.8833 + offsetLng).toFixed(4),
            info: `${name} mahallesi/köyü hakkında detaylı bilgileri yönetici panelinden düzenleyebilirsiniz.`
        };
    });
}

function getPlaces() {
    const data = localStorage.getItem('ladik_places');
    if (!data) {
        const defaultData = generateDefaultData();
        localStorage.setItem('ladik_places', JSON.stringify(defaultData));
        return defaultData;
    }
    return JSON.parse(data);
}

function savePlaces(places) {
    localStorage.setItem('ladik_places', JSON.stringify(places));
}

function getRoutes() {
    const data = localStorage.getItem('ladik_routes');
    return data ? JSON.parse(data) : [];
}

function saveRoutes(routes) {
    localStorage.setItem('ladik_routes', JSON.stringify(routes));
}
