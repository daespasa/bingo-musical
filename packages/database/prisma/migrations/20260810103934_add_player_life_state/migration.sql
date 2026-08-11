-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HighlightType" ADD VALUE 'FIRST_ELIMINATION';
ALTER TYPE "HighlightType" ADD VALUE 'LAST_SURVIVOR';
ALTER TYPE "HighlightType" ADD VALUE 'MULTIPLE_ELIMINATION';
ALTER TYPE "HighlightType" ADD VALUE 'SURVIVED_ON_ONE_LIFE';

-- CreateTable
CREATE TABLE "PlayerLifeState" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "lives" INTEGER NOT NULL,
    "eliminatedAtRound" INTEGER,
    "eliminationOrder" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerLifeState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerLifeState_participantId_key" ON "PlayerLifeState"("participantId");

-- CreateIndex
CREATE INDEX "PlayerLifeState_roomId_idx" ON "PlayerLifeState"("roomId");

-- AddForeignKey
ALTER TABLE "PlayerLifeState" ADD CONSTRAINT "PlayerLifeState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerLifeState" ADD CONSTRAINT "PlayerLifeState_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
