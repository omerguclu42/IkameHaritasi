document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // For now, just log or alert
    console.log("Kullanıcı Adı:", username);
    console.log("Şifre:", password);
    
    alert("Giriş yapılıyor... Google Sheets entegrasyonu sonraki aşamada eklenecek.");
});
