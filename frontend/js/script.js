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

// reset-password-script.js - Versión completa y segura
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que estamos en la página correcta
    const form = document.getElementById('new-password-form');
    if (!form) return;

    // Elementos del formulario
    const tokenInput = document.getElementById('reset-token');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // Obtener token de la URL
    const getToken = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token') || window.location.pathname.split('/').pop();
    };

    // Validar contraseñas
    const validate = () => {
        if (newPasswordInput.value !== confirmPasswordInput.value) {
            alert('Las contraseñas no coinciden');
            return false;
        }
        return true;
    };

    // Manejar envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validate()) return;

        const token = getToken();
        if (!token) {
            alert('Enlace inválido');
            window.location.href = '/login.html';
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/reset/confirm-reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resetToken: token,
                    newPassword: newPasswordInput.value
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                alert('Contraseña actualizada');
                window.location.href = '/login.html';
            } else {
                throw new Error(result.error || 'Error al actualizar');
            }
        } catch (error) {
            alert(error.message);
        }
    });

    // Asignar token al cargar
    const token = getToken();
    if (token) tokenInput.value = token;
});

// Para el modal de crud

// Variables globales para el cierre de caja
let productosVenta = [];

// Función para abrir el modal de cierre de caja
function abrirCierreCaja() {
    const modal = document.getElementById('cierre-caja-modal');
    modal.style.display = 'block';
    cargarProductosParaVenta();
}

// Función para cerrar el modal
function cerrarModal() {
    const modal = document.getElementById('cierre-caja-modal');
    modal.style.display = 'none';
}

// Función para cargar productos en el modal
async function cargarProductosParaVenta() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Por favor, inicia sesión para acceder a esta función.');
            window.location.href = 'login.html';
            return;
        }

        // Mostrar nombre de sucursal
        document.getElementById('sucursal-modal').textContent = 
            config.sucursales[config.sucursalId]?.nombre || `Sucursal ${config.sucursalId}`;

        const res = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Error al cargar productos');

        productosVenta = await res.json();
        const tbody = document.getElementById('productos-venta');
        tbody.innerHTML = '';

        if (productosVenta.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-productos">No hay productos para mostrar</td></tr>';
            return;
        }

        // Función para crear filas (ahora con columna de precio separada)
        const crearFilaProducto = (prod) => {
            const precio = typeof prod.precio === 'string' ? parseFloat(prod.precio) : prod.precio;
            const stock = parseInt(prod.cantidad);
            
            const tr = document.createElement('tr');
            tr.dataset.nombre = prod.nombre.toLowerCase();
            tr.dataset.categoria = prod.categoria.toLowerCase();
            tr.dataset.id = prod.id;
            
            tr.innerHTML = `
                <td>${prod.id}</td>
                <td class="producto-nombre">${prod.nombre}</td> <!-- Nombre solo -->
                <td class="precio">$${precio.toFixed(2)}</td> <!-- Columna independiente -->
                <td class="stock">${stock}</td>
                <td class="categoria">${prod.categoria}</td>
                <td class="acciones">
                    <input type="number" 
                           id="venta-${prod.id}" 
                           class="input-venta"
                           min="0" 
                           max="${stock}" 
                           value="0"
                           data-precio="${precio}" 
                           data-id="${prod.id}"
                           data-stock="${stock}"
                           oninput="validarVenta(this)">
                    <span class="error-venta" id="error-${prod.id}"></span>
                </td>
            `;
            return tr;
        };

        // Agregar productos
        productosVenta.forEach(prod => {
            tbody.appendChild(crearFilaProducto(prod));
        });

        // Eventos y resumen (sin cambios)
        document.querySelectorAll('.input-venta').forEach(input => {
            input.addEventListener('change', actualizarResumenVenta);
            input.addEventListener('input', function() {
                const errorSpan = document.getElementById(`error-${this.dataset.id}`);
                errorSpan.textContent = '';
            });
        });

        actualizarResumenVenta();

    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('productos-venta');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="error-carga"> <!-- Ajustado a 6 columnas -->
                    Error al cargar productos: ${error.message}
                    <button onclick="cargarProductosParaVenta()" class="boton-reintentar">Reintentar</button>
                </td>
            </tr>
        `;
    }
}

// Función auxiliar para validar ventas
function validarVenta(input) {
    const cantidad = parseInt(input.value) || 0;
    const maxStock = parseInt(input.dataset.stock);
    const errorSpan = document.getElementById(`error-${input.dataset.id}`);

    if (cantidad < 0) {
        input.value = 0;
    } else if (cantidad > maxStock) {
        input.value = maxStock;
        errorSpan.textContent = `Stock máximo: ${maxStock}`;
        errorSpan.style.display = 'inline-block';
        setTimeout(() => errorSpan.style.display = 'none', 3000);
    }
}

// Función para actualizar el resumen de ventas
function actualizarResumenVenta() {
    let totalProductos = 0;
    let gananciasTotales = 0;

    productosVenta.forEach(prod => {
        const input = document.getElementById(`venta-${prod.id}`);
        if (input) {
            const cantidad = parseInt(input.value) || 0;
            totalProductos += cantidad;
            gananciasTotales += cantidad * prod.precio;
        }
    });

    document.getElementById('total-productos').textContent = totalProductos;
    document.getElementById('ganancias-totales').textContent = gananciasTotales.toFixed(2);
}

// Función para aplicar las ventas
async function aplicarVentas() {
    const ventas = [];
    let totalProductos = 0;
    let gananciasTotales = 0;
    const detalles = [];

    // Calcular totales y preparar detalles
    productosVenta.forEach(prod => {
        const input = document.getElementById(`venta-${prod.id}`);
        if (input && input.value > 0) {
            const cantidad = parseInt(input.value);
            const precio = parseFloat(input.dataset.precio);
            const total = cantidad * precio;
            
            ventas.push({ id: prod.id, cantidad });
            detalles.push({
                producto_id: prod.id,
                nombre: prod.nombre,
                cantidad,
                precio_unitario: precio,
                total
            });

            totalProductos += cantidad;
            gananciasTotales += total;
        }
    });

    if (ventas.length === 0) {
        alert('No hay productos vendidos para aplicar');
        return;
    }

    if (!confirm(`¿Registrar cierre de caja?\n\nProductos: ${totalProductos}\nGanancias: $${gananciasTotales.toFixed(2)}`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        
        // 1. Actualizar productos
        for (const venta of ventas) {
            await actualizarProducto(venta.id, venta.cantidad, token);
        }

        // 2. Registrar cierre con detalles
        const cierreResponse = await fetch('/api/cierres-caja', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sucursal_id: parseInt(config.sucursalId),
                total_productos: totalProductos,
                ganancias_totales: gananciasTotales,
                detalles: detalles
            })
        });

        const resultado = await cierreResponse.json();
        if (resultado.id) {
            alert(`✅ Cierre registrado correctamente\n\n• ID: ${resultado.id}\n• Sucursal: ${config.sucursales[config.sucursalId]?.nombre}\n• Fecha: ${new Date(resultado.fecha_registro).toLocaleString()}`);
        } else {
            alert('✅ Cierre registrado (consulta el historial para ver detalles)');
        }
        // Actualizar vista
        cargarProductosParaVenta();
        actualizarResumenVenta();

    } catch (error) {
        console.error('Error:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

async function actualizarProducto(id, cantidadVendida, token) {
    const url = `http://localhost:3000/api/productos/${id}?sucursal=${config.sucursalId}`;
    const producto = productosVenta.find(p => p.id === id);
    
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: producto.cantidad - cantidadVendida,
            categoria: producto.categoria,
            sucursal_id: parseInt(config.sucursalId)
        })
    });

    if (!response.ok) throw new Error(`Producto ID ${id}`);
}

function filtrarProductos() {
    const busqueda = document.getElementById('buscar-producto').value.toLowerCase();
    const filas = document.querySelectorAll('#productos-venta tr');
    
    let resultados = 0;
    
    filas.forEach(fila => {
        // Omitir la fila de "no hay productos"
        if (fila.cells.length < 2) {
            fila.style.display = 'none';
            return;
        }
        
        const nombre = fila.cells[1].textContent.toLowerCase();
        const categoria = fila.cells[3].textContent.toLowerCase();
        
        if (nombre.includes(busqueda) || categoria.includes(busqueda)) {
            fila.style.display = '';
            resultados++;
        } else {
            fila.style.display = 'none';
        }
    });
    
    // Mostrar mensaje si no hay resultados
    const mensajeNoResultados = document.getElementById('no-resultados');
    if (resultados === 0 && busqueda !== '') {
        if (!mensajeNoResultados) {
            const tbody = document.getElementById('productos-venta');
            const tr = document.createElement('tr');
            tr.id = 'no-resultados';
            tr.innerHTML = `<td colspan="5">No se encontraron productos con "${busqueda}"</td>`;
            tbody.appendChild(tr);
        }
    } else if (mensajeNoResultados) {
        mensajeNoResultados.remove();
    }
}

// Event listeners para el filtro
document.addEventListener('DOMContentLoaded', () => {
    const buscarInput = document.getElementById('buscar-producto');
    const limpiarBtn = document.getElementById('limpiar-busqueda');
    
    if (buscarInput) {
        buscarInput.addEventListener('input', filtrarProductos);
        
        // Buscar al presionar Enter
        buscarInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') filtrarProductos();
        });
    }
    
    if (limpiarBtn) {
        limpiarBtn.addEventListener('click', () => {
            buscarInput.value = '';
            filtrarProductos();
            buscarInput.focus();
        });
    }
});

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('abrir-cierre-caja')?.addEventListener('click', abrirCierreCaja);
    document.querySelector('.cerrar-modal')?.addEventListener('click', cerrarModal);
    document.getElementById('aplicar-ventas')?.addEventListener('click', aplicarVentas);
    document.getElementById('cancelar-ventas')?.addEventListener('click', cerrarModal);
    document.getElementById('btn-historial')?.addEventListener('click', () => {
        window.location.href = `cierres.html?sucursal=${window.ATALES_CONFIG.sucursalId}`;
    });
});
