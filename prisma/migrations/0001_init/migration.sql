-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ,
    "refresh_token_hash" VARCHAR(255),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "config_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "config_key" VARCHAR(100),
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "course_type" VARCHAR(50) DEFAULT 'other',
    "faculty_names" VARCHAR(255),
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fallback_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_tag_id" UUID,
    "star_rating" SMALLINT NOT NULL,
    "option_number" SMALLINT NOT NULL,
    "user_status" VARCHAR(20),
    "template_text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "weight" SMALLINT NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewer_type" VARCHAR(20),
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMPTZ,
    "category" VARCHAR(50),

    CONSTRAINT "fallback_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(50) NOT NULL,
    "session_id" UUID NOT NULL,
    "ip_hash" VARCHAR(64),
    "user_agent_category" VARCHAR(20),
    "course_tag_id" UUID,
    "star_rating" INTEGER,
    "user_status" VARCHAR(20),
    "reviewer_type" VARCHAR(20),
    "ai_used" BOOLEAN,
    "option_number_selected" INTEGER,
    "source" VARCHAR(50) DEFAULT 'direct',
    "generated_text" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "account_name" VARCHAR(255),
    "location_name" VARCHAR(255),
    "location_title" VARCHAR(255),
    "connected_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "google_review_id" VARCHAR(255),
    "google_review_name" VARCHAR(500),
    "reviewer_name" VARCHAR(255) NOT NULL,
    "reviewer_photo_url" TEXT,
    "star_rating" SMALLINT NOT NULL,
    "review_text" TEXT,
    "review_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "review_update_time" TIMESTAMPTZ,
    "has_existing_reply" BOOLEAN NOT NULL DEFAULT false,
    "reply_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "google_review_id" UUID NOT NULL,
    "reply_text" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "is_auto" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "posted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "course_tags_name_key" ON "course_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "fallback_templates_course_tag_id_star_rating_option_number__key" ON "fallback_templates"("course_tag_id", "star_rating", "option_number", "user_status");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "google_reviews_google_review_id_key" ON "google_reviews"("google_review_id");

-- AddForeignKey
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_audit_log" ADD CONSTRAINT "config_audit_log_config_key_fkey" FOREIGN KEY ("config_key") REFERENCES "system_config"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_audit_log" ADD CONSTRAINT "config_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fallback_templates" ADD CONSTRAINT "fallback_templates_course_tag_id_fkey" FOREIGN KEY ("course_tag_id") REFERENCES "course_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_course_tag_id_fkey" FOREIGN KEY ("course_tag_id") REFERENCES "course_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_google_review_id_fkey" FOREIGN KEY ("google_review_id") REFERENCES "google_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraints (Prisma does not generate these — added manually)
ALTER TABLE "fallback_templates" ADD CONSTRAINT "fallback_templates_star_rating_check" CHECK ("star_rating" BETWEEN 1 AND 5);
ALTER TABLE "fallback_templates" ADD CONSTRAINT "fallback_templates_option_number_check" CHECK ("option_number" BETWEEN 1 AND 3);
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_star_rating_check" CHECK ("star_rating" BETWEEN 1 AND 5);
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_star_rating_check" CHECK ("star_rating" BETWEEN 1 AND 5);

