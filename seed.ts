import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env or .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL as string;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const sql = postgres(connectionString);

async function seed() {
  console.log('🌱 Starting database seed to:', connectionString.split('@')[1] || 'database');

  try {
    // ── 1. Create Tables ───────────────────────────────────────────────────
    console.log('1️⃣ Creating tables if they do not exist...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login_at TIMESTAMPTZ,
        refresh_token_hash VARCHAR(255)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS config_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        config_key VARCHAR(100) REFERENCES system_config(key),
        old_value TEXT,
        new_value TEXT,
        changed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS course_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        course_type VARCHAR(50) DEFAULT 'other',
        faculty_names VARCHAR(255),
        aliases TEXT[] DEFAULT '{}',
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS fallback_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_tag_id UUID REFERENCES course_tags(id) ON DELETE CASCADE,
        star_rating SMALLINT NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
        option_number SMALLINT NOT NULL CHECK (option_number BETWEEN 1 AND 3),
        user_status VARCHAR(20),
        template_text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        weight SMALLINT DEFAULT 1,
        tags TEXT[] DEFAULT '{}',
        reviewer_type VARCHAR(20),
        usage_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMPTZ,
        category VARCHAR(50),
        UNIQUE(course_tag_id, star_rating, option_number, user_status)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE NOT NULL,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS review_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(50) NOT NULL,
        session_id UUID NOT NULL,
        ip_hash VARCHAR(64),
        user_agent_category VARCHAR(20),
        course_tag_id UUID REFERENCES course_tags(id) ON DELETE SET NULL,
        star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
        user_status VARCHAR(20),
        reviewer_type VARCHAR(20),
        ai_used BOOLEAN,
        option_number_selected INTEGER,
        source VARCHAR(50) DEFAULT 'direct',
        generated_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // ── Auto-Reply Tables ────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS google_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        account_name VARCHAR(255),
        location_name VARCHAR(255),
        location_title VARCHAR(255),
        connected_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS google_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_review_id VARCHAR(255) UNIQUE,
        google_review_name VARCHAR(500),
        reviewer_name VARCHAR(255) NOT NULL,
        reviewer_photo_url TEXT,
        star_rating SMALLINT NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
        review_text TEXT,
        review_date TIMESTAMPTZ DEFAULT NOW(),
        review_update_time TIMESTAMPTZ,
        has_existing_reply BOOLEAN DEFAULT false,
        reply_status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS review_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_review_id UUID REFERENCES google_reviews(id) ON DELETE CASCADE NOT NULL,
        reply_text TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        is_auto BOOLEAN DEFAULT false,
        approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        posted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // ── Migrations (safe to re-run) ──────────────────────────────────────
    await sql`
      ALTER TABLE google_reviews ADD COLUMN IF NOT EXISTS review_update_time TIMESTAMPTZ
    `;

    console.log('✅ Tables created.');

    // ── 2. Seed Admin User ─────────────────────────────────────────────────
    console.log('2️⃣ Seeding default admin user...');
    
    const defaultAdmins = [
      { email: 'mukesh.jain@netsecretsgroup.com', password: 'password123' },
      { email: 'suresh.agrawal@netsecretsgroup.com', password: 'password123' }
    ];

    console.log('2️⃣ Seeding default admin users...');
    for (const admin of defaultAdmins) {
      const existing = await sql`SELECT id FROM admin_users WHERE email = ${admin.email}`;
      if (existing.length === 0) {
        const hash = await bcrypt.hash(admin.password, 10);
        await sql`
          INSERT INTO admin_users (email, password_hash)
          VALUES (${admin.email}, ${hash})
        `;
        console.log(`✅ Admin created: ${admin.email} / ${admin.password}`);
      } else {
        console.log(`ℹ️ Admin ${admin.email} already exists. Skipping.`);
      }
    }
    console.log('⚠️ PLEASE CHANGE THESE PASSWORDS AFTER LOGIN!');

    // ── 3. Seed Fallback Templates ─────────────────────────────────────────
    console.log('3️⃣ Seeding initial fallback templates...');
    
    const templatesList = [
      { star: 5, user_status: 'pursuing', text: 'This academy is fantastic! The teaching quality is excellent and the environment is very supportive. Highly recommended!' },
      { star: 5, user_status: 'completed', text: 'I have completed the course and it was a great experience. Highly recommended for students! Thank you NSG.' },
      { star: 4, user_status: 'pursuing', text: 'I had a great experience here. The instructors are knowledgeable and the study materials are very helpful.' }
    ];

    for (const t of templatesList) {
      // We only insert generic templates (course_tag_id = null), option_number = 1
      await sql`
        INSERT INTO fallback_templates (star_rating, option_number, user_status, template_text)
        VALUES (${t.star}, 1, ${t.user_status}, ${t.text})
        ON CONFLICT (course_tag_id, star_rating, option_number, user_status)
        WHERE course_tag_id IS NULL DO NOTHING
      `;
    }
    console.log('✅ Fallback templates seeded.');

    // ── 4. Initial Config ──────────────────────────────────────────────────
    console.log('4️⃣ Seeding initial config...');
    await sql`
      INSERT INTO system_config (key, value)
      VALUES 
        ('google_review_url', 'https://search.google.com/local/writereview?placeid=ChIJP9Nka3LAwjsRUuKwiB04abo'),
        ('academy_name', 'NSG Academy'),
        ('whatsapp_number', '919000000000'),
        ('poster_tagline', 'Share your experience!'),
        ('poster_color', '#1a1a2e'),
        ('academy_aliases', '[]'),
        ('autoreply_enabled', 'false'),
        ('autoreply_star_threshold', '4'),
        ('autoreply_tone', 'friendly'),
        ('autoreply_delay_min', '5'),
        ('autoreply_delay_max', '30')
      ON CONFLICT (key) DO NOTHING
    `;
    console.log('✅ Initial config seeded.');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    console.log('🏁 Closing DB connection...');
    await sql.end();
  }
}

seed();
