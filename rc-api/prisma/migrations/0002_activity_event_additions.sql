-- Adds two ActivityEventType values and a new standalone archive table.
-- No migration-history tooling runs in CI for this project (see rc-api's
-- Dockerfile/package.json — schema changes are applied by hand), so this
-- file is a record of intent, not something applied automatically. Run
-- every statement below directly against the production database before
-- deploying an rc-api build that references them.

-- 1) staff_registered — logged on every staff sign-in (rc-admin/
--    institution/employer), previously missing entirely, and on a
--    learner-app sign-in that turns out to be a staff member's
--    first-ever touch on the platform.
-- 2) account_deleted — logged just before a full account deletion, so
--    the platform keeps a permanent record of everyone who has ever
--    registered even after their account is removed.
ALTER TYPE "ActivityEventType" ADD VALUE 'staff_registered';
ALTER TYPE "ActivityEventType" ADD VALUE 'account_deleted';

-- 3) learner_archives — a full structured snapshot (every Sub Module
--    status/COL score, certificate and access grant) taken immediately
--    before a learner's account is deleted. No foreign keys at all,
--    deliberately: it must keep existing, and stay queryable for
--    benchmarking curriculum/content changes over time, independent of
--    the User/Learner rows it was copied from.
CREATE TABLE "learner_archives" (
    "id" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedBy" TEXT NOT NULL,
    "originalUserId" TEXT NOT NULL,
    "originalLearnerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "platformRole" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL,
    "lastSignInAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3),
    "institutionName" TEXT,
    "cohortName" TEXT,
    "smProgress" JSONB NOT NULL,
    "certificates" JSONB NOT NULL,
    "accessGrants" JSONB NOT NULL,

    CONSTRAINT "learner_archives_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "learner_archives_email_idx" ON "learner_archives"("email");
CREATE INDEX "learner_archives_archivedAt_idx" ON "learner_archives"("archivedAt");
