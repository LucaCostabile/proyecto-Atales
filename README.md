# 🛒 Supermercado Atales - Gestión de Stock Multisucursal

Este proyecto es una aplicación web diseñada para gestionar el stock, ventas y caja de tres sucursales de un supermercado. Permite iniciar sesión, seleccionar la sucursal con un mapa interactivo y realizar operaciones completas de administración de productos y caja.

## 🚀 Funcionalidades Principales

- Inicio de sesión seguro
- Recuperación de contraseña por email (SMTP)
- Selección de sucursal mediante mapa (OpenStreetMap)
- CRUD de productos por sucursal
- Validaciones de stock y ventas
- Cierre e historial de caja por sucursal
- Base de datos centralizada (MySQL)
- Despliegue en Render (backend) y Railway (base de datos)

## 🧰 Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js + Express
- **Base de Datos:** MySQL (Railway)
- **APIs Externas:** 
  - SMTP para recuperación de contraseña
  - Leaflet + OpenStreetMap para mapas
- **Despliegue:** 
  - Backend en [Render](https://render.com/)
  - Base de datos en [Railway](https://railway.app/)
- **Control de versiones:** Git + GitHub

## 🛠️ Instalación y Ejecución Local

### 1. Clonar el Repositorio

```bash
git clone https://github.com/LucaCostabile/proyecto-Atales.git
cd proyecto-Atales
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar las variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables (ajustar según tu configuración):

```
PORT=3000
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_db_name
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
```

### 4. Iniciar el servidor

```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## 🌐 Versión en Producción

🔗 [https://proyecto-atales.onrender.com](https://proyecto-atales.onrender.com)

## 📝 Autores

- Ortiz Juan Cruz  
- Costabile Luca  
- Magnoni Rocio

## 📄 Licencia

Este proyecto es de uso educativo y sin fines comerciales.
