export const dbConfig = {
  host:            process.env.DB_HOST     || 'localhost',
  port:            parseInt(process.env.DB_PORT || '3306'),
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  database:        process.env.DB_NAME     || 'multichannel_messaging',
  charset:         'utf8mb4',
  connectionLimit: 10,
};
