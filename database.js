const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la conexión MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'atalesdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función para inicializar la base de datos
async function initializeDB() {
  let connection;
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

    // 2. Insertar sucursales
    await connection.query(`
      INSERT IGNORE INTO sucursales (id, nombre, direccion) VALUES
      (1, 'ATAL Centro', 'Paso de los Andes 1794, Mendoza'),
      (2, 'ATAL Godoy Cruz', 'Talcahuano 2845, Godoy Cruz'),
      (3, 'ATAL Guaymallén', 'Elpidio González 2250, Guaymallén')
    `);

    // 3. Modificar tabla de productos para incluir relación con sucursales
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

    console.log('✅ Base de datos inicializada correctamente');
    console.log('   - 3 sucursales creadas por defecto');
    console.log('   - Relación productos-sucursales establecida');

  } catch (err) {
    console.error('❌ Error al inicializar la base de datos:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      console.error('   🔍 Asegúrate de que las sucursales por defecto existan');
    }
  } finally {
    if (connection) connection.release();
  }
}

// Verificar conexión e inicializar
pool.getConnection()
  .then(conn => {
    console.log('🔌 Conectado a MySQL correctamente');
    conn.release();
    initializeDB();
  })
  .catch(err => {
    console.error('❌ Error de conexión a MySQL:', err.message);
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('   🔍 ¿La base de datos existe? ¿Usuario tiene permisos?');
    }
  });

module.exports = pool;