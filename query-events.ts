import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    const rows = await sql`SELECT event_type, session_id, star_rating, user_status, created_at, course_tag_id FROM review_events ORDER BY created_at DESC LIMIT 30`;
    fs.writeFileSync('events-dump.json', JSON.stringify(rows, null, 2));
    console.log('✅ Dumped events to events-dump.json');
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

run();
