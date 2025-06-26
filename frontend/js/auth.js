// auth.js - Sistema completo de autenticación

// Verificación inicial al cargar
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    console.log('🔍 Página actual detectada:', currentPage);
    console.log('🔍 URL completa:', window.location.pathname);
    
    const publicPages = ['login.html', 'register.html', 'olvidastecontraseña.html', 'reset-password.html'];
    
    if (!publicPages.includes(currentPage)) {
        console.log('❌ No es página pública, ejecutando verifyAuth');
        verifyAuth();
    } else {
        console.log('✅ Es página pública, NO ejecutando verifyAuth');
    }
});

async function verifyAuth() {
    const token = localStorage.getItem('token');
    console.log('🔑 Token encontrado:', token ? 'SÍ' : 'NO');
    console.log('🔑 Token (primeros 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
        console.log('❌ No hay token, redirigiendo a login');
        redirectToLogin();
        return;
    }
    
    try {
        console.log('🌐 Haciendo request a:', `${window.API_BASE_URL}/auth/verify`);
        const response = await fetch(`${window.API_BASE_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Error del servidor:', errorText);
            throw new Error('Token inválido');
        }
        
        const data = await response.json();
        console.log('✅ Verificación exitosa:', data);
        
    } catch (error) {
        console.error('❌ Error de autenticación:', error);
        localStorage.removeItem('token');
        redirectToLogin();
    }
}

function redirectToLogin() {
    if (!window.location.pathname.includes('login.html')) {
        sessionStorage.setItem('redirectUrl', window.location.pathname);
        window.location.href = 'login.html';
    }
}

// Función para logout
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }
}

// Función para redirigir después de login
window.redirectAfterLogin = function() {
    const redirectUrl = sessionStorage.getItem('redirectUrl') || 'index.html';
    sessionStorage.removeItem('redirectUrl');
    window.location.href = redirectUrl;
};

// Inicializar logout en páginas que lo necesiten
setupLogout();
