const mysql = require('mysql2/promise');
require('dotenv').config();

// ✅ Configuración para Kubernetes (usando variables de entorno)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql-service',
  user: process.env.DB_USER || 'juan',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'atalesdb',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Función para inicializar la base de datos
async function initializeDB() {
  let connection;
  let retries = 5;
  
  while (retries > 0) {
    try {
      connection = await pool.getConnection();
      
      // 1. Crear tabla de sucursales
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sucursales (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          direccion VARCHAR(200) NOT NULL,
          telefono VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // 2. Insertar sucursales por defecto
      await connection.query(`
        INSERT IGNORE INTO sucursales (id, nombre, direccion) VALUES
        (1, 'ATAL Centro', 'Paso de los Andes 1794, Mendoza'),
        (2, 'ATAL Godoy Cruz', 'Talcahuano 2845, Godoy Cruz'),
        (3, 'ATAL Guaymallén', 'Elpidio González 2250, Guaymallén')
      `);

      // 3. Tabla de productos
      await connection.query(`
        CREATE TABLE IF NOT EXISTS productos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          precio DECIMAL(10, 2) NOT NULL,
          cantidad INT NOT NULL DEFAULT 0,
          categoria VARCHAR(100) DEFAULT 'General',
          sucursal_id INT NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // 4. Tabla de usuarios 
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          reset_token VARCHAR(255) DEFAULT NULL,
          reset_token_expiry BIGINT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // 5. Tabla de cierres de caja
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cierres_caja (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sucursal_id INT NOT NULL,
          total_productos INT NOT NULL,
          ganancias_totales DECIMAL(12, 2) NOT NULL,
          detalles JSON DEFAULT NULL,
          fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      console.log('✅ Base de datos inicializada correctamente');
      console.log('   - 3 sucursales creadas por defecto');
      console.log('   - Relación productos-sucursales establecida');
      console.log('   - Tabla de cierres de caja creada');
      
      break; // Salir del bucle si todo sale bien

    } catch (err) {
      console.error(`❌ Error al inicializar la base de datos (intentos restantes: ${retries-1}):`, err.message);
      retries--;
      
      if (retries === 0) {
        console.error('❌ No se pudo conectar a la base de datos después de varios intentos');
        process.exit(1);
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } finally {
      if (connection) connection.release();
    }
  }
}

// Función para verificar la conexión
async function checkConnection() {
  let retries = 10;
  
  while (retries > 0) {
    try {
      const connection = await pool.getConnection();
      console.log('🔌 Conectado a MySQL correctamente');
      connection.release();
      
      // Inicializar la base de datos
      await initializeDB();
      return;
      
    } catch (err) {
      console.error(`❌ Error de conexión a MySQL (intentos restantes: ${retries-1}):`, err.message);
      retries--;
      
      if (retries === 0) {
        console.error('❌ No se pudo conectar a MySQL después de varios intentos');
        process.exit(1);
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Iniciar verificación de conexión
checkConnection();

module.exports = pool;
