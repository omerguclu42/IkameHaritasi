const GOOGLE_SHEET_ID = "11dBNRMU2aRsBd6Dccg8mk661ywGxhnGhpDg2ikI9KAk";
const JSONP_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=responseHandler:handleSupplierData`;

// Tüm veriyi tutacağımız global değişkenler
let provinceData = {}; // Örn: { "adana": { name: "Adana", suppliers: ["Forrent", "Araç Yedekle", ...] } }
let allSuppliers = new Set();
let plateToProvinceCode = {};

const PLATE_MAP = {
    "01": "Adana", "02": "Adıyaman", "03": "Afyonkarahisar", "04": "Ağrı", "05": "Amasya", "06": "Ankara", "07": "Antalya", "08": "Artvin", "09": "Aydın", "10": "Balıkesir", "11": "Bilecik", "12": "Bingöl", "13": "Bitlis", "14": "Bolu", "15": "Burdur", "16": "Bursa", "17": "Çanakkale", "18": "Çankırı", "19": "Çorum", "20": "Denizli", "21": "Diyarbakır", "22": "Edirne", "23": "Elazığ", "24": "Erzincan", "25": "Erzurum", "26": "Eskişehir", "27": "Gaziantep", "28": "Giresun", "29": "Gümüşhane", "30": "Hakkari", "31": "Hatay", "32": "Isparta", "33": "Mersin", "34": "İstanbul", "35": "İzmir", "36": "Kars", "37": "Kastamonu", "38": "Kayseri", "39": "Kırklareli", "40": "Kırşehir", "41": "Kocaeli", "42": "Konya", "43": "Kütahya", "44": "Malatya", "45": "Manisa", "46": "Kahramanmaraş", "47": "Mardin", "48": "Muğla", "49": "Muş", "50": "Nevşehir", "51": "Niğde", "52": "Ordu", "53": "Rize", "54": "Sakarya", "55": "Samsun", "56": "Siirt", "57": "Sinop", "58": "Sivas", "59": "Tekirdağ", "60": "Tokat", "61": "Trabzon", "62": "Tunceli", "63": "Şanlıurfa", "64": "Uşak", "65": "Van", "66": "Yozgat", "67": "Zonguldak", "68": "Aksaray", "69": "Bayburt", "70": "Karaman", "71": "Kırıkkale", "72": "Batman", "73": "Şırnak", "74": "Bartın", "75": "Ardahan", "76": "Iğdır", "77": "Yalova", "78": "Karabük", "79": "Kilis", "80": "Osmaniye", "81": "Düzce"
};

// Türkçe karakterleri normalize et (eşleştirme kolaylığı için)
function normalizeString(text) {
    if (!text) return "";
    return text.toString().trim()
        .replace(/I/g, 'ı').replace(/İ/g, 'i')
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');
}

// Google Sheets Callback Fonksiyonu
window.handleSupplierData = function(response) {
    if (response.status === "error") {
        alert("Veri çekilirken hata oluştu: " + response.errors[0].message);
        return;
    }

    const rows = response.table.rows;
    
    // Verileri işle
    rows.forEach((row, index) => {
        // Satırın A sütunu il adıdır
        if (!row.c || !row.c[0] || !row.c[0].v) return;
        
        // Eğer başlık satırı ise atla (İller yazıyorsa)
        if (row.c[0].v.toString().toLowerCase().includes("iller")) return;

        const originalProvinceName = row.c[0].v.toString().trim();
        const normProv = normalizeString(originalProvinceName);
        
        let suppliers = [];
        // Geri kalan sütunlar (B'den itibaren)
        for (let i = 1; i < row.c.length; i++) {
            if (row.c[i] && row.c[i].v) {
                const supplierName = row.c[i].v.toString().trim();
                // Sayısal değerleri (1, 2, 3...) tedarikçi listesinden hariç tut
                if (supplierName && isNaN(supplierName)) {
                    suppliers.push(supplierName);
                    allSuppliers.add(supplierName);
                }
            }
        }

        if (suppliers.length > 0) {
            provinceData[normProv] = {
                name: originalProvinceName,
                suppliers: suppliers
            };
        }
    });

    initDashboard();
};

function initDashboard() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';

    // SVG Haritayı Ekle
    document.getElementById('mapContainer').innerHTML = turkeyMapSVG;

    // KKTC ve diğer data-plate olmayan gereksiz kısımları gizle/sil
    const svgMap = document.querySelector('#mapContainer svg');
    svgMap.querySelectorAll('g:not([data-plate])').forEach(g => {
        if (!g.querySelector('g[data-plate]')) {
            g.style.display = 'none';
        }
    });

    // Filtreleri Doldur
    populateSupplierFilter();
    populateProvinceFilter();

    // Harita etkileşimlerini ayarla
    setupMapInteractions();

    // Event Listener'lar
    document.getElementById('supplierFilter').addEventListener('change', handleSupplierFilterChange);
    document.getElementById('provinceFilter').addEventListener('change', handleProvinceFilterChange);
    document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
}

function populateSupplierFilter() {
    const select = document.getElementById('supplierFilter');
    const sortedSuppliers = Array.from(allSuppliers).sort();
    
    sortedSuppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier;
        option.textContent = supplier;
        select.appendChild(option);
    });
}

function populateProvinceFilter(selectedSupplier = "") {
    const select = document.getElementById('provinceFilter');
    
    // Mevcut seçenekleri temizle (Tüm İller hariç)
    select.innerHTML = '<option value="">Tüm İller</option>';
    
    // Sadece datasında tedarikçi olan illeri listele
    let provinces = Object.values(provinceData);
    
    if (selectedSupplier) {
        provinces = provinces.filter(p => p.suppliers.includes(selectedSupplier));
    }
    
    provinces = provinces.map(p => p.name).sort((a, b) => a.localeCompare(b, 'tr'));
    
    provinces.forEach(provName => {
        const option = document.createElement('option');
        const normProv = normalizeString(provName);
        option.value = normProv;
        option.textContent = provName;
        select.appendChild(option);
    });
}

function setupMapInteractions() {
    const svgMap = document.querySelector('#mapContainer svg');
    const plates = svgMap.querySelectorAll('g[data-plate]');
    const tooltip = document.getElementById('mapTooltip');

    // Tooltip hareketi
    svgMap.addEventListener('mousemove', (e) => {
        tooltip.style.left = e.pageX + 'px';
        tooltip.style.top = e.pageY + 'px';
    });

    plates.forEach(plate => {
        const plateNo = plate.getAttribute('data-plate');
        const provName = PLATE_MAP[plateNo];
        if (!provName) return;

        const normProv = normalizeString(provName);
        
        // Eğer datasında tedarikçi yoksa tamamen pasif yap
        if (!provinceData[normProv]) {
            plate.classList.add('no-data');
            return;
        }

        const supplierCount = provinceData[normProv].suppliers.length;

        // Hover olayları
        plate.addEventListener('mouseenter', () => {
            if (plate.classList.contains('no-data')) return;
            tooltip.textContent = `${provName} (${supplierCount} Tedarikçi)`;
            tooltip.classList.add('visible');
        });

        plate.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });

        // Click olayı
        plate.addEventListener('click', () => {
            if (plate.classList.contains('no-data')) return;
            
            const provSelect = document.getElementById('provinceFilter');
            let optionExists = Array.from(provSelect.options).some(opt => opt.value === normProv);
            
            if (!optionExists) {
                document.getElementById('supplierFilter').value = "";
                populateProvinceFilter("");
            }

            provSelect.value = normProv;
            provSelect.dispatchEvent(new Event('change'));
        });
    });

    // --- ŞEHİR İSMİ VE SAYISINI HARİTAYA KALICI YAZDIRMA (ÜST KATMAN) ---
    // Bütün yazıları en üstte göstermek için haritanın sonuna yeni bir katman ekliyoruz
    const labelsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    labelsLayer.setAttribute("id", "map-labels-layer");
    
    // Katmanı plates'in parent'ına ekliyoruz ki coordinate transformları eşleşsin ve yazılar kaybolmasın!
    if (plates.length > 0) {
        plates[0].parentNode.appendChild(labelsLayer);
    } else {
        svgMap.appendChild(labelsLayer);
    }

    plates.forEach(plate => {
        const plateNo = plate.getAttribute('data-plate');
        const provName = PLATE_MAP[plateNo];
        if (!provName) return;

        const normProv = normalizeString(provName);
        if (!provinceData[normProv]) return; // datası yoksa yazı ekleme

        const supplierCount = provinceData[normProv].suppliers.length;

        try {
            const bbox = plate.getBBox();
            let centerX = bbox.x + bbox.width / 2;
            let centerY = bbox.y + bbox.height / 2;
            
            // Text öğesini plate içine değil, en üst katmana (labelsLayer) ekliyoruz
            const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textNode.setAttribute("x", centerX);
            textNode.setAttribute("y", centerY);
            textNode.setAttribute("text-anchor", "middle");
            textNode.setAttribute("alignment-baseline", "middle");
            textNode.setAttribute("class", "map-province-label");
            textNode.setAttribute("data-label-plate", plateNo);

            const tspanName = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspanName.setAttribute("x", centerX);
            tspanName.setAttribute("dy", "-0.2em");
            tspanName.textContent = provName;

            const tspanCount = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspanCount.setAttribute("x", centerX);
            tspanCount.setAttribute("dy", "1.2em");
            tspanCount.setAttribute("class", "map-supplier-count");
            tspanCount.textContent = `(${supplierCount})`;

            textNode.appendChild(tspanName);
            textNode.appendChild(tspanCount);
            labelsLayer.appendChild(textNode);
        } catch (e) {
            console.error("Text eklenirken hata:", e);
        }
    });
    // ----------------------------------------------------
}

function handleSupplierFilterChange() {
    const selectedSupplier = document.getElementById('supplierFilter').value;
    
    // Tedarikçi filtreleme yapıldıysa, il filtresini sadece o tedarikçinin hizmet verdiği illerle güncelle
    populateProvinceFilter(selectedSupplier);
    
    // Tedarikçi değiştiğinde il seçimi sıfırlanır
    document.getElementById('provinceFilter').value = "";
    document.getElementById('tableSection').classList.remove('active');
    
    updateMapColors();
}

function handleProvinceFilterChange() {
    const selectedProvince = document.getElementById('provinceFilter').value;
    
    if (selectedProvince) {
        // Tabloyu göster ve doldur
        renderTable(selectedProvince);
    } else {
        document.getElementById('tableSection').classList.remove('active');
    }
    
    updateMapColors();
}

function updateMapColors() {
    const selectedSupplier = document.getElementById('supplierFilter').value;
    const selectedProvince = document.getElementById('provinceFilter').value;
    
    const svgMap = document.querySelector('#mapContainer svg');
    const plates = svgMap.querySelectorAll('g[data-plate]');

    plates.forEach(plate => {
        const plateNo = plate.getAttribute('data-plate');
        const provName = PLATE_MAP[plateNo];
        if (!provName) return;

        const normProv = normalizeString(provName);
        const data = provinceData[normProv];
        
        const labelNode = svgMap.querySelector(`text[data-label-plate="${plateNo}"]`);

        if (!data) {
            plate.classList.add('no-data');
            plate.classList.add('inactive');
            if (labelNode) labelNode.style.display = 'none';
            return;
        }

        let isMatch = true;

        if (selectedSupplier && !data.suppliers.includes(selectedSupplier)) {
            isMatch = false;
        }

        if (selectedProvince && selectedProvince !== normProv) {
            isMatch = false;
        }

        if (isMatch) {
            plate.classList.remove('inactive');
            if (labelNode) labelNode.style.display = '';
        } else {
            plate.classList.add('inactive');
            if (labelNode) labelNode.style.display = 'none';
        }
    });
}

function renderTable(normProv) {
    const tableSection = document.getElementById('tableSection');
    const tbody = document.getElementById('suppliersTableBody');
    const badge = document.getElementById('selectedProvinceBadge');
    
    tbody.innerHTML = '';
    
    const data = provinceData[normProv];
    if (!data) return;

    badge.textContent = `${data.name} İçin Sıralama`;

    data.suppliers.forEach((supplier, index) => {
        const tr = document.createElement('tr');
        
        const tdRank = document.createElement('td');
        tdRank.innerHTML = `<span class="rank-badge">${index + 1}</span>`;
        
        const tdInfo = document.createElement('td');
        // İsimdeki tek tırnak (eğer varsa) JS hatasına yol açmasın diye kaçış (escape) işlemi
        const safeSupplier = supplier.replace(/'/g, "\\'");
        tdInfo.innerHTML = `<i class="fa-solid fa-circle-info info-icon" onclick="showSupplierInfo('${safeSupplier}')"></i>`;
        
        const tdSupplier = document.createElement('td');
        tdSupplier.textContent = supplier;
        
        tr.appendChild(tdRank);
        tr.appendChild(tdInfo);
        tr.appendChild(tdSupplier);
        tbody.appendChild(tr);
    });

    tableSection.classList.add('active');
    
    // Sayfayı hafifçe aşağı kaydırarak tabloyu göster
    tableSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showSupplierInfo(supplierName) {
    const modal = document.getElementById('supplierModal');
    const modalBody = document.getElementById('modalBody');
    const normName = normalizeString(supplierName);
    const details = supplierDetails[normName];

    if (details) {
        modalBody.innerHTML = `
            <p><strong>Tedarikçi Adı:</strong> ${details.name}</p>
            <p><strong>Telefon No:</strong> ${details.phone}</p>
            <p><strong>Mail:</strong> ${details.mail}</p>
            <p><strong>İl:</strong> ${details.city}</p>
            <p><strong>İlçe:</strong> ${details.district}</p>
            <p><strong>Adres:</strong> ${details.address}</p>
        `;
    } else {
        modalBody.innerHTML = `
            <p style="text-align: center; color: #666; font-style: italic;">
                Tedarikçi bilgileri henüz sisteme eklenmemiştir.<br>
                En kısa sürede süreci tamamlıyor olacağız.
            </p>
        `;
    }

    modal.classList.remove('hidden');
}

function closeSupplierInfo() {
    document.getElementById('supplierModal').classList.add('hidden');
}

function resetFilters() {
    document.getElementById('supplierFilter').value = "";
    document.getElementById('provinceFilter').value = "";
    populateProvinceFilter(""); // Bütün illeri dropdown'a geri yükler
    document.getElementById('tableSection').classList.remove('active');
    updateMapColors();
}

// Global değişken
let supplierDetails = {};
const DETAILS_JSONP_URL = "https://docs.google.com/spreadsheets/d/1G25z1grZbfXOlwvSbr8kR7TiZh-egxzoiyUedx9zBVc/gviz/tq?tqx=responseHandler:handleSupplierDetailsData";

window.handleSupplierDetailsData = function(response) {
    if (response.status === "error") {
        console.error("Detay verisi çekilemedi:", response.errors[0].message);
        return;
    }
    const rows = response.table.rows;
    rows.forEach(row => {
        if (!row.c || !row.c[0] || !row.c[0].v) return;
        
        const originalName = row.c[0].v.toString().trim();
        if (originalName.toLowerCase() === "tedarikçi adı") return; // başlık satırı
        
        const normName = normalizeString(originalName);
        
        supplierDetails[normName] = {
            name: originalName,
            phone: (row.c[1] && row.c[1].v) ? row.c[1].v.toString().trim() : "-",
            mail: (row.c[2] && row.c[2].v) ? row.c[2].v.toString().trim() : "-",
            city: (row.c[3] && row.c[3].v) ? row.c[3].v.toString().trim() : "-",
            district: (row.c[4] && row.c[4].v) ? row.c[4].v.toString().trim() : "-",
            address: (row.c[5] && row.c[5].v) ? row.c[5].v.toString().trim() : "-"
        };
    });
};

// Veri Çekme İşlemini Başlat
document.addEventListener("DOMContentLoaded", () => {
    // Harita verisi
    const script = document.createElement('script');
    script.src = JSONP_URL + "&_=" + Date.now();
    
    // Detay verisi
    const scriptDetails = document.createElement('script');
    scriptDetails.src = DETAILS_JSONP_URL + "&_=" + Date.now();

    // Timeout
    const tId = setTimeout(() => {
        const loadingE = document.getElementById('loadingState');
        if(loadingE) loadingE.innerHTML = `<p style="color:red">Veri çekilemedi (Zaman Aşımı).</p>`;
    }, 10000);

    script.onload = () => clearTimeout(tId);
    script.onerror = () => {
        clearTimeout(tId);
        const loadingE = document.getElementById('loadingState');
        if(loadingE) loadingE.innerHTML = `<p style="color:red">Google bağlantı hatası.</p>`;
    };
    
    document.body.appendChild(script);
    document.body.appendChild(scriptDetails);
});
