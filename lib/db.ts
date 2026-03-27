import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  max: 3,                 // Reduce aggressive max connections per serverless instance
  idle_timeout: 5,        // Drop idle connections quickly to free up Supabase pool
  connect_timeout: 10,
  prepare: false,         // CRITICAL: Disable prepared statements for Transaction Mode (PgBouncer/Supavisor) compatibility
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default sql;
