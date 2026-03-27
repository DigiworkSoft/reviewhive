import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
  console.log('🚀 Starting migration: adding user_status to review_events...');
  try {
    // 1. Add column
    await sql`ALTER TABLE review_events ADD COLUMN IF NOT EXISTS user_status VARCHAR(20)`;
    console.log('✅ Added user_status column to review_events.');

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await sql.end();
  }
}

migrate();
