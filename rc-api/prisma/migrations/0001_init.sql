-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('learner', 'institution_admin', 'institution_tutor', 'employer_admin', 'employer_recruiter', 'rc_admin', 'rc_analyst', 'rc_support');

-- CreateEnum
CREATE TYPE "SMStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('active', 'onboarding', 'inactive');

-- CreateEnum
CREATE TYPE "PartnerTier" AS ENUM ('standard', 'premium', 'enterprise');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('interested', 'contacted', 'interviewing', 'offered', 'hired');

-- CreateEnum
CREATE TYPE "RoleStatus" AS ENUM ('open', 'filled', 'paused');

-- CreateEnum
CREATE TYPE "CertificateLevel" AS ENUM ('submodule', 'part', 'module');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('engagement', 'performance', 'system', 'commercial');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('learner_registered', 'learner_completed_sm', 'learner_completed_part', 'learner_completed_module', 'institution_joined', 'employer_joined', 'employer_shortlisted', 'col_score_low');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "azureAdId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSignInAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learners" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT,
    "cohortId" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3),
    "availableToEmployers" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sm_progress" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "smId" INTEGER NOT NULL,
    "smSlug" TEXT NOT NULL,
    "smTitle" TEXT NOT NULL,
    "partNumber" INTEGER NOT NULL,
    "status" "SMStatus" NOT NULL DEFAULT 'not_started',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sm_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "col_scores" (
    "id" TEXT NOT NULL,
    "smProgressId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "col_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "level" "CertificateLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "moduleContext" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "partNumber" INTEGER,
    "partAccent" TEXT,
    "smId" INTEGER,
    "certifyingBody" TEXT,
    "credentialId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#82BC00',
    "status" "PartnerStatus" NOT NULL DEFAULT 'onboarding',
    "partnerSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "logoUrl" TEXT,
    "partnerTier" "PartnerTier" NOT NULL DEFAULT 'standard',
    "status" "PartnerStatus" NOT NULL DEFAULT 'onboarding',
    "partnerSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "jobTitle" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_roles" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "requiredSMs" INTEGER[],
    "minCOLPercent" DOUBLE PRECISION,
    "minSMsCompleted" INTEGER NOT NULL DEFAULT 0,
    "status" "RoleStatus" NOT NULL DEFAULT 'open',
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlisted_candidates" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "roleId" TEXT,
    "stage" "PipelineStage" NOT NULL DEFAULT 'interested',
    "notes" TEXT NOT NULL DEFAULT '',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortlisted_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'analyst',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_alerts" (
    "id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedCount" INTEGER NOT NULL DEFAULT 0,
    "category" "AlertCategory" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "platform_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_activity_events" (
    "id" TEXT NOT NULL,
    "type" "ActivityEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_azureAdId_key" ON "users"("azureAdId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "learners_userId_key" ON "learners"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sm_progress_learnerId_smId_key" ON "sm_progress"("learnerId", "smId");

-- CreateIndex
CREATE UNIQUE INDEX "col_scores_smProgressId_key" ON "col_scores"("smProgressId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_credentialId_key" ON "certificates"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "institution_users_userId_key" ON "institution_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employer_users_userId_key" ON "employer_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shortlisted_candidates_employerId_learnerId_key" ON "shortlisted_candidates"("employerId", "learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_userId_key" ON "admin_users"("userId");

-- CreateIndex
CREATE INDEX "platform_activity_events_timestamp_idx" ON "platform_activity_events"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "platform_activity_events_type_idx" ON "platform_activity_events"("type");

-- AddForeignKey
ALTER TABLE "learners" ADD CONSTRAINT "learners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learners" ADD CONSTRAINT "learners_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learners" ADD CONSTRAINT "learners_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sm_progress" ADD CONSTRAINT "sm_progress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "col_scores" ADD CONSTRAINT "col_scores_smProgressId_fkey" FOREIGN KEY ("smProgressId") REFERENCES "sm_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_users" ADD CONSTRAINT "institution_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_users" ADD CONSTRAINT "institution_users_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_users" ADD CONSTRAINT "employer_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_users" ADD CONSTRAINT "employer_users_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "employers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "employers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlisted_candidates" ADD CONSTRAINT "shortlisted_candidates_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "employers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlisted_candidates" ADD CONSTRAINT "shortlisted_candidates_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlisted_candidates" ADD CONSTRAINT "shortlisted_candidates_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
