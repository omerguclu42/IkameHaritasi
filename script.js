const GOOGLE_SHEET_ID = "1K7VJz00KLl4fOm5OKo0kNDHeLsat95Az3JlQU5vk7sU";
const JSONP_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=responseHandler:handleGoogleSheetData`;

let currentUsernameInput = "";
let currentPasswordInput = "";
let errorDiv = null;
let submitButton = null;

window.handleGoogleSheetData = function(response) {
    try {
        if (response.status === "error") {
            showError("Sunucudan veri alınırken hata oluştu.");
            return;
        }
        
        let isAuthenticated = false;
        const rows = response.table.rows;
        
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].c && rows[i].c.length >= 2) {
                const cellUsername = rows[i].c[0] && rows[i].c[0].v ? String(rows[i].c[0].v).trim() : "";
                const cellPassword = rows[i].c[1] && rows[i].c[1].v ? String(rows[i].c[1].v).trim() : "";
                
                if (cellUsername === currentUsernameInput && cellPassword === currentPasswordInput) {
                    isAuthenticated = true;
                    break;
                }
            }
        }
        
        if (isAuthenticated) {
            localStorage.setItem("loggedInUser", currentUsernameInput);
            const overlay = document.getElementById('loadingOverlay');
            overlay.classList.remove('hidden');
            
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 5000);
        } else {
            showError("Hatalı kullanıcı adı veya şifre.");
        }
    } catch (err) {
        showError("İşlem sırasında hata: " + err.message);
    }
    
    const script = document.getElementById('google-sheet-script');
    if (script) script.remove();
};

function showError(message) {
    if (errorDiv) errorDiv.textContent = message;
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = "Giriş Yap <i class='fa-solid fa-arrow-right'></i>";
    }
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    currentUsernameInput = document.getElementById('username').value.trim();
    currentPasswordInput = document.getElementById('password').value.trim();
    errorDiv = document.getElementById('errorMessage');
    submitButton = document.querySelector('.login-button');
    
    errorDiv.textContent = "";
    submitButton.disabled = true;
    submitButton.innerHTML = "Kontrol ediliyor... <i class='fa-solid fa-spinner fa-spin'></i>";
    
    const scriptId = 'google-sheet-script';
    let oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = JSONP_URL + "&_=" + Date.now(); // Cache busting
    
    // Zaman aşımı kontrolü (5 saniye)
    const timeoutId = setTimeout(() => {
        if (submitButton.disabled) {
            showError("Sunucu yanıt vermedi (Zaman aşımı). Lütfen internet bağlantınızı kontrol edin.");
            if (script.parentNode) script.remove();
        }
    }, 5000);

    script.onload = function() {
        clearTimeout(timeoutId);
    };

    script.onerror = function() {
        clearTimeout(timeoutId);
        showError("Bağlantı hatası oluştu, Google bağlantısı engellenmiş olabilir.");
    };
    
    document.body.appendChild(script);
});
