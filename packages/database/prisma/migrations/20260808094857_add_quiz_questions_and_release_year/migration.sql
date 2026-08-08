-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SONG_TITLE', 'ARTIST', 'RELEASE_YEAR', 'DECADE', 'ALBUM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HighlightType" ADD VALUE 'ONLY_CORRECT';
ALTER TYPE "HighlightType" ADD VALUE 'ALL_CORRECT';
ALTER TYPE "HighlightType" ADD VALUE 'NOBODY_CORRECT';
ALTER TYPE "HighlightType" ADD VALUE 'POPULAR_DISTRACTOR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ScoreEventType" ADD VALUE 'CORRECT_ANSWER';
ALTER TYPE "ScoreEventType" ADD VALUE 'WRONG_ANSWER';

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "releaseYear" INTEGER;

-- CreateTable
CREATE TABLE "RoundQuestion" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "correctText" TEXT NOT NULL,

    CONSTRAINT "RoundQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAnswer" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "optionId" TEXT,
    "freeText" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoundQuestion_roundId_key" ON "RoundQuestion"("roundId");

-- CreateIndex
CREATE INDEX "AnswerOption_questionId_idx" ON "AnswerOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerOption_questionId_position_key" ON "AnswerOption"("questionId", "position");

-- CreateIndex
CREATE INDEX "PlayerAnswer_participantId_idx" ON "PlayerAnswer"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAnswer_roundId_participantId_attempt_key" ON "PlayerAnswer"("roundId", "participantId", "attempt");

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RoundQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAnswer" ADD CONSTRAINT "PlayerAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAnswer" ADD CONSTRAINT "PlayerAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RoundQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAnswer" ADD CONSTRAINT "PlayerAnswer_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAnswer" ADD CONSTRAINT "PlayerAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AnswerOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
