// Configuración compartida
const config = window.ATALES_CONFIG || {
    sucursalId: '1',
    sucursales: {
        '1': { nombre: 'ATAL Centro' },
        '2': { nombre: 'ATAL Godoy Cruz' },
        '3': { nombre: 'ATAL Guaymallén' }
    }
};

const apiUrl = `http://localhost:3000/api/productos?sucursal=${config.sucursalId}`;
console.log('API configurada:', apiUrl);

// Mostrar información de la sucursal actual
document.addEventListener('DOMContentLoaded', () => {
    const sucursalInfo = document.getElementById('sucursal-info');
    if (sucursalInfo) {
        sucursalInfo.textContent = `Sucursal actual: ${config.sucursales[config.sucursalId]?.nombre || `Sucursal ${config.sucursalId}`}`;
    }

    if (document.location.pathname.includes("crud.html")) {
        obtenerProductos();
    }

    // Lógica para el botón de cerrar sesión
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function () {
            localStorage.removeItem('token'); // Eliminar el token del localStorage
            alert('Has cerrado sesión correctamente');
            window.location.href = 'login.html'; // Redirigir al login
        });
    }
});

const obtenerProductos = async () => {
    const tbody = document.getElementById('productos-lista');
    if (!tbody) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Por favor, inicia sesión para acceder a esta página.');
            window.location.href = 'login.html';
            return;
        }

        const res = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || res.statusText);
        }

        const productos = await res.json();
        console.log('Productos obtenidos:', productos);

        if (productos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">No hay productos para mostrar</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        productos.forEach(prod => {
            tbody.innerHTML += `
                <tr>
                    <td><input type="text" id="nombre-${prod.id}" value="${prod.nombre}" disabled></td>
                    <td><input type="number" id="precio-${prod.id}" value="${prod.precio}" disabled></td>
                    <td><input type="number" id="cantidad-${prod.id}" value="${prod.cantidad}" disabled></td>
                    <td>
                      <select id="categoria-${prod.id}" disabled>
                        <option value="General" ${prod.categoria === 'General' ? 'selected' : ''}>General</option>
                        <option value="Electrónica" ${prod.categoria === 'Electrónica' ? 'selected' : ''}>Electrónica</option>
                        <option value="Alimentos" ${prod.categoria === 'Alimentos' ? 'selected' : ''}>Alimentos</option>
                        <option value="Limpieza" ${prod.categoria === 'Limpieza' ? 'selected' : ''}>Limpieza</option>
                        <option value="Bebidas" ${prod.categoria === 'Bebidas' ? 'selected' : ''}>Bebidas</option>
                      </select>
                    </td>
                    <td>
                      <button onclick="habilitarEdicion(${prod.id})">Editar</button>
                      <button id="guardar-${prod.id}" onclick="guardarCambios(${prod.id})" style="display:none;">Guardar</button>
                      <button onclick="eliminarProducto(${prod.id})">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        tbody.innerHTML = `<tr><td colspan="6">Error al cargar productos: ${error.message}</td></tr>`;
    }
};


// Agregar producto
const agregarProducto = async (nombre, precio, cantidad, categoria) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Por favor, inicia sesión para agregar productos.');
            window.location.href = 'login.html';
            return;
        }

        console.log('Intentando agregar producto:', { nombre, precio, cantidad, categoria });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre,
                precio: parseFloat(precio),
                cantidad: parseInt(cantidad),
                categoria,
                sucursal_id: parseInt(config.sucursalId)
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || response.statusText);
        }

        const nuevoProducto = await response.json();
        console.log('Producto agregado:', nuevoProducto);
        return nuevoProducto;
    } catch (error) {
        console.error('Error al agregar producto:', error);
        throw error;
    }
};

// Eliminar producto
const eliminarProducto = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Por favor, inicia sesión para eliminar productos.');
            window.location.href = 'login.html';
            return;
        }

        const urlEliminar = `http://localhost:3000/api/productos/${id}?sucursal=${config.sucursalId}`;
        const response = await fetch(urlEliminar, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Error al eliminar');
        }

        alert('Producto eliminado correctamente');
        obtenerProductos();
    } catch (error) {
        alert(`Error al eliminar producto: ${error.message}`);
        console.error('Error al eliminar producto:', error);
    }
};

// Guardar cambios
const guardarCambios = async (id) => {
    const nombre = document.getElementById(`nombre-${id}`).value;
    const precio = document.getElementById(`precio-${id}`).value;
    const cantidad = document.getElementById(`cantidad-${id}`).value;
    const categoria = document.getElementById(`categoria-${id}`).value;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Por favor, inicia sesión para guardar cambios.');
            window.location.href = 'login.html';
            return;
        }

        const urlActualizar = `http://localhost:3000/api/productos/${id}?sucursal=${config.sucursalId}`;
        const response = await fetch(urlActualizar, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre,
                precio: parseFloat(precio),
                cantidad: parseInt(cantidad),
                categoria,
                sucursal_id: parseInt(config.sucursalId)
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Error al actualizar');
        }

        alert('Producto actualizado correctamente');

        // Deshabilitar inputs y ocultar botón guardar
        document.getElementById(`nombre-${id}`).disabled = true;
        document.getElementById(`precio-${id}`).disabled = true;
        document.getElementById(`cantidad-${id}`).disabled = true;
        document.getElementById(`categoria-${id}`).disabled = true;
        document.getElementById(`guardar-${id}`).style.display = 'none';

        obtenerProductos();
    } catch (error) {
        alert(`Error al guardar cambios: ${error.message}`);
        console.error('Error al guardar cambios:', error);
    }
};

// Habilitar edición
const habilitarEdicion = (id) => {
    document.getElementById(`nombre-${id}`).disabled = false;
    document.getElementById(`precio-${id}`).disabled = false;
    document.getElementById(`cantidad-${id}`).disabled = false;
    document.getElementById(`categoria-${id}`).disabled = false;
    document.getElementById(`guardar-${id}`).style.display = 'inline';
};

// Manejo del formulario de producto
document.getElementById('producto-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const precio = document.getElementById('precio').value.trim();
    const cantidad = document.getElementById('cantidad').value.trim();
    const categoria = document.getElementById('categoria').value;

    if (!nombre || !precio || !cantidad) {
        alert('Por favor complete todos los campos');
        return;
    }

    try {
        const resultado = await agregarProducto(nombre, precio, cantidad, categoria);
        console.log('Producto agregado:', resultado);

        alert('Producto agregado correctamente');
        document.getElementById('producto-form').reset();
        obtenerProductos();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

// Logeo y Registro
document.addEventListener('DOMContentLoaded', function() {
  // Lógica para el inicio de sesión
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
      loginForm.addEventListener('submit', async function(event) {
          event.preventDefault(); // Evitar la recarga de la página

          const email = document.getElementById('email').value; // Recoger el email
          const password = document.getElementById('password').value;

          console.log('Intentando iniciar sesión con:', email, password); // Mensaje de depuración

          const response = await fetch('http://localhost:3000/auth/login', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ email, password })
          });

          const result = await response.json();
          console.log('Resultado de la respuesta de inicio de sesión:', result); // Mensaje de depuración

          if (response.ok) {
              localStorage.setItem('token', result.token); // Guardar el token
              alert('Login exitoso');
              window.location.href = 'index.html'; // Redirigir a la página principal
          } else {
              alert(`Error: ${result.error || result.message}`); // Mostrar mensaje de error
          }
      });
  }

  // Lógica para el registro
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Evitar la recarga de la página

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validar que las contraseñas coincidan
        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        console.log('Intentando registrar usuario:', username, email); // Mensaje de depuración

        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const result = await response.json();
        console.log('Resultado de la respuesta de registro:', result); // Mensaje de depuración

        if (response.ok) {
            alert('Registro exitoso, ahora puedes iniciar sesión.');
            window.location.href = 'login.html'; // Redirigir a la página de inicio de sesión
        } else {
            alert(`Error: ${result.error || result.message}`); // Mostrar mensaje de error
        }
    });
  }
});

// Lógica para el restablecimiento de contraseña
const resetPasswordForm = document.getElementById('reset-password-form');
if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Evitar recarga de página

        const email = document.getElementById('email').value; // Obtener email

        console.log('Solicitando restablecimiento de contraseña para:', email); // Mensaje de depuración

        const response = await fetch('http://localhost:3000/reset/reset-password', {  
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email })
        });

        const result = await response.json();
        console.log('Resultado de la solicitud de restablecimiento:', result); // Mensaje de depuración

        if (response.ok) {
            alert('Te hemos enviado un enlace para restablecer tu contraseña');
            window.location.href = 'login.html'; // Redirigir a login
        } else {
            alert(`Error: ${result.error || result.message}`); // Mostrar error
        }
    });
}

// Lógica para restablecer la contraseña con un token
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('new-password-form');
    const tokenInput = document.getElementById('reset-token');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // Extraer token de la URL
    const getTokenFromURL = () => {
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('token');
        
        if (!token) {
            const pathParts = window.location.pathname.split('/');
            token = pathParts[pathParts.length - 1];
        }

        return token;
    };

    // Validar contraseñas
    const validatePasswords = () => {
        return newPasswordInput.value === confirmPasswordInput.value;
    };

    // Manejar envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validatePasswords()) {
            alert('Las contraseñas no coinciden');
            return;
        }

        const token = tokenInput.value;
        if (!token) {
            alert('Token de restablecimiento no válido');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/reset/confirm-reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resetToken: token,
                    newPassword: newPasswordInput.value
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Contraseña restablecida con éxito');
                window.location.href = '/login.html';
            } else {
                throw new Error(result.error || 'Error al restablecer la contraseña');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Inicialización
    const token = getTokenFromURL();
    if (!token) {
        alert('Token no encontrado en la URL');
        window.location.href = '/login.html';
        return;
    }

    tokenInput.value = token;
    form.addEventListener('submit', handleSubmit);
});

