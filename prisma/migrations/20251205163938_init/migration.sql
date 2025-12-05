-- CreateTable
CREATE TABLE "evidence_submissions" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "email" TEXT NOT NULL DEFAULT '',
    "full_name" TEXT NOT NULL DEFAULT '',
    "submission_type" TEXT NOT NULL DEFAULT 'cms_scandal_v1',
    "parent_type" TEXT NOT NULL,
    "children_affected" INTEGER NOT NULL DEFAULT 1,
    "children_covered" INTEGER NOT NULL DEFAULT 1,
    "aged_out_children" INTEGER NOT NULL DEFAULT 0,
    "additional_children" INTEGER NOT NULL DEFAULT 0,
    "impact_statement" TEXT NOT NULL,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "evidence_data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "evidence_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" BIGSERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_violations" (
    "id" BIGSERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_agent" TEXT,
    "attempt_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "rate_limit_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_blocks" (
    "id" BIGSERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "user_agent" TEXT,
    "blocked_until" TIMESTAMPTZ NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'Too many requests',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_submissions_created_at_idx" ON "evidence_submissions"("created_at");

-- CreateIndex
CREATE INDEX "evidence_submissions_parent_type_idx" ON "evidence_submissions"("parent_type");

-- CreateIndex
CREATE INDEX "evidence_submissions_submission_type_idx" ON "evidence_submissions"("submission_type");

-- CreateIndex
CREATE INDEX "evidence_submissions_children_affected_idx" ON "evidence_submissions"("children_affected");

-- CreateIndex
CREATE INDEX "rate_limits_identifier_action_created_at_idx" ON "rate_limits"("identifier", "action", "created_at");

-- CreateIndex
CREATE INDEX "rate_limit_violations_identifier_created_at_idx" ON "rate_limit_violations"("identifier", "created_at");

-- CreateIndex
CREATE INDEX "rate_limit_violations_created_at_idx" ON "rate_limit_violations"("created_at");

-- CreateIndex
CREATE INDEX "rate_limit_blocks_blocked_until_idx" ON "rate_limit_blocks"("blocked_until");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_blocks_identifier_user_agent_key" ON "rate_limit_blocks"("identifier", "user_agent");
