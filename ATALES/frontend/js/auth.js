// auth.js
window.onload = function() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Por favor, inicia sesión para acceder a esta página.');
        window.location.href = 'login.html'; // Redirigir a la página de inicio de sesión
    }

    // Lógica para el botón de cerrar sesión
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('token'); // Eliminar el token del localStorage
            alert('Has cerrado sesión correctamente');
            window.location.href = 'login.html'; // Redirigir al login
        });
    }
};
