import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
  console.log('🚀 Starting migration: adding user_status to fallback_templates...');
  try {
    // 1. Add column
    await sql`ALTER TABLE fallback_templates ADD COLUMN IF NOT EXISTS user_status VARCHAR(20)`;
    console.log('✅ Added user_status column.');

    // 2. Update existing rows to have a default (e.g., 'pursuing' or null)
    await sql`UPDATE fallback_templates SET user_status = 'pursuing' WHERE user_status IS NULL`;
    console.log('✅ Set default user_status for existing rows.');

    // 3. Drop old unique constraint if it exists and create new one
    // Note: This part is tricky because we don't know the constraint name for sure.
    // Usually it's fallback_templates_course_tag_id_star_rating_option_number_key
    try {
      await sql`ALTER TABLE fallback_templates DROP CONSTRAINT IF EXISTS fallback_templates_course_tag_id_star_rating_option_number_key`;
      await sql`ALTER TABLE fallback_templates ADD CONSTRAINT fallback_templates_course_tg_rating_opt_status_key UNIQUE(course_tag_id, star_rating, option_number, user_status)`;
      console.log('✅ Updated unique constraint.');
    } catch (e) {
      console.warn('⚠️ Could not update unique constraint (might already be updated or name differs):', e);
    }

    // 4. Ensure we have a 'completed' template for 5 stars if not exists
    await sql`
      INSERT INTO fallback_templates (star_rating, option_number, user_status, template_text)
      VALUES (5, 1, 'completed', 'I have completed the course and it was a great experience. Highly recommended for students!')
      ON CONFLICT DO NOTHING
    `;
    console.log('✅ Inserted default "completed" template.');

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await sql.end();
  }
}

migrate();
