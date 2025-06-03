document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sucursalId = urlParams.get('sucursal') || '1';
    
    // Configurar botón de volver
    document.getElementById('btn-volver')?.addEventListener('click', () => {
        window.location.href = `crud.html?sucursal=${sucursalId}`;
    });

    // Elementos UI
    const tabla = document.getElementById('tabla-cierres')?.querySelector('tbody');
    const totalProductos = document.getElementById('total-productos');
    const totalGanancias = document.getElementById('total-ganancias');
    const btnFiltrar = document.getElementById('btn-filtrar');

    if (!tabla) return;

    // Cargar cierres iniciales
    async function cargarCierres(fechaInicio = '', fechaFin = '') {
        try {
            let url = `/api/cierres-caja/${sucursalId}`;
            const params = [];
            if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
            if (fechaFin) params.push(`fechaFin=${fechaFin}`);
            if (params.length) url += `?${params.join('&')}`;

            const response = await fetch(url);
            const cierres = await response.json();

            tabla.innerHTML = '';
            let sumaProductos = 0;
            let sumaGanancias = 0;

            cierres.forEach(cierre => {
                const ganancias = Number(cierre.ganancias_totales) || 0;
                const productos = Number(cierre.total_productos) || 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cierre.id}</td>
                    <td>${cierre.sucursal || `Sucursal ${cierre.sucursal_id}`}</td>
                    <td>${productos}</td>
                    <td>$${ganancias.toFixed(2)}</td>
                    <td>${new Date(cierre.fecha_registro).toLocaleString()}</td>
                    <td><button onclick="verDetalles(${cierre.id})" class="boton-pequeno">Ver</button></td>
                `;
                tabla.appendChild(tr);

                sumaProductos += productos;
                sumaGanancias += ganancias;
            });

            if (totalProductos) totalProductos.textContent = sumaProductos;
            if (totalGanancias) totalGanancias.textContent = sumaGanancias.toFixed(2);

        } catch (error) {
            console.error('Error al cargar cierres:', error);
            alert('Error al cargar historial');
        }
    }

    // Eventos
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', () => {
            const fechaInicio = document.getElementById('fecha-inicio')?.value || '';
            const fechaFin = document.getElementById('fecha-fin')?.value || '';
            cargarCierres(fechaInicio, fechaFin);
        });
    }

    // Función global para ver detalles
    window.verDetalles = (cierreId) => {
        alert(`Detalles del cierre ${cierreId}\n(Implementa un modal bonito aquí)`);
    };

    // Carga inicial
    await cargarCierres();
});