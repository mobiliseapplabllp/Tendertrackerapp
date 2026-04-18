import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

// Azure MySQL connection pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'tendertrack_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Azure REQUIRES SSL - configure SSL for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    // Azure CA certificate path if required
    ca: process.env.AZURE_SSL_CA || undefined
  } : {
    // For development, Azure may still require SSL but with less strict validation
    rejectUnauthorized: false
  }
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    logger.info('✅ Database connected successfully to Azure MySQL');
    connection.release();
  })
  .catch(err => {
    logger.error({ message: '❌ Database connection failed', error: err.message });
    if (err.code === 'ECONNREFUSED') {
      logger.error('   Check if Azure MySQL server is accessible and firewall rules allow connections');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.error('   Check database credentials in .env file');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      logger.error('   Database does not exist. Run database setup script first.');
    }
    // Don't exit in development - allow app to start and handle errors gracefully
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

// Health check function
export async function healthCheck(): Promise<boolean> {
  try {
    const [rows] = await pool.query('SELECT 1 as health');
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    logger.error({ message: 'Database health check failed', error });
    return false;
  }
}

export default pool;

