-- CreateEnum
CREATE TYPE "RoomMode" AS ENUM ('PROJECTOR', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('DRAFT', 'LOBBY', 'COUNTDOWN', 'PLAYING', 'PAUSED', 'ROUND_RESULTS', 'FINISHED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('WAITING', 'PREPARING_AUDIO', 'WAITING_FOR_CLIENTS', 'SCHEDULED', 'PLAYING', 'ANSWER_WINDOW', 'REVEALING', 'SCORING', 'ROUND_RESULTS', 'SKIPPED', 'FINISHED');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('DRAFT', 'READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'PLAYER', 'SCREEN');

-- CreateEnum
CREATE TYPE "CellStatus" AS ENUM ('UNMARKED', 'PENDING', 'VALID', 'INVALID');

-- CreateEnum
CREATE TYPE "AudioReadinessStatus" AS ENUM ('NOT_ENABLED', 'TESTING', 'READY', 'PRELOADING', 'ERROR');

-- CreateEnum
CREATE TYPE "TrackSource" AS ENUM ('DEMO', 'SPOTIFY');

-- CreateEnum
CREATE TYPE "ExternalProvider" AS ENUM ('SPOTIFY');

-- CreateEnum
CREATE TYPE "PreviewProviderKind" AS ENUM ('DEMO_LOCAL', 'SPOTIFY_PREVIEW_FINDER');

-- CreateEnum
CREATE TYPE "PreviewStatus" AS ENUM ('AVAILABLE', 'NOT_FOUND', 'RATE_LIMITED', 'INVALID_RESPONSE', 'UNREACHABLE', 'ERROR');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('LINE', 'BINGO');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScoreEventType" AS ENUM ('CORRECT_MARK', 'SPEED_BONUS', 'STREAK_BONUS', 'LINE_BONUS', 'BINGO_BONUS', 'WRONG_MARK', 'WRONG_CLAIM');

-- CreateEnum
CREATE TYPE "HighlightType" AS ENUM ('FASTEST_ANSWER', 'LEADER_CHANGE', 'BEST_STREAK', 'FIRST_LINE', 'BINGO', 'BIGGEST_COMEBACK');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'GUEST', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "albumId" TEXT,
    "durationMs" INTEGER,
    "source" "TrackSource" NOT NULL DEFAULT 'DEMO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalTrackReference" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalTrackReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackPreview" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "provider" "PreviewProviderKind" NOT NULL,
    "status" "PreviewStatus" NOT NULL,
    "url" TEXT,
    "durationMs" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidatedAt" TIMESTAMP(3),

    CONSTRAINT "TrackPreview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicCollectionTrack" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "MusicCollectionTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSettings" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "cardSize" INTEGER NOT NULL DEFAULT 3,
    "freeCenter" BOOLEAN NOT NULL DEFAULT false,
    "snippetDurationMs" INTEGER NOT NULL DEFAULT 15000,
    "answerWindowMs" INTEGER NOT NULL DEFAULT 10000,
    "lineEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bingoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "showLeaderboard" BOOLEAN NOT NULL DEFAULT true,
    "shuffleTracks" BOOLEAN NOT NULL DEFAULT true,
    "correctMarkPoints" INTEGER NOT NULL DEFAULT 100,
    "speedBonusMax" INTEGER NOT NULL DEFAULT 50,
    "streakBonusPoints" INTEGER NOT NULL DEFAULT 50,
    "linePoints" INTEGER NOT NULL DEFAULT 500,
    "bingoPoints" INTEGER NOT NULL DEFAULT 1500,
    "wrongMarkPenalty" INTEGER NOT NULL DEFAULT -50,
    "wrongClaimPenalty" INTEGER NOT NULL DEFAULT -100,

    CONSTRAINT "GameSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "mode" "RoomMode" NOT NULL DEFAULT 'REMOTE',
    "status" "RoomStatus" NOT NULL DEFAULT 'LOBBY',
    "cardAlgorithmVersion" INTEGER NOT NULL DEFAULT 1,
    "lockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'PLAYER',
    "alias" TEXT NOT NULL,
    "aliasNormalized" TEXT NOT NULL,
    "userId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "kickedAt" TIMESTAMP(3),

    CONSTRAINT "RoomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSession" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerDevice" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioReadiness" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "AudioReadinessStatus" NOT NULL DEFAULT 'NOT_ENABLED',
    "errorMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioReadiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoCard" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "seed" TEXT NOT NULL,
    "algorithmVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingoCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoCardCell" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "trackId" TEXT,
    "displayTitle" TEXT NOT NULL,
    "displayArtist" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "status" "CellStatus" NOT NULL DEFAULT 'UNMARKED',
    "markedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),

    CONSTRAINT "BingoCardCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "trackId" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'WAITING',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "revealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMark" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "roundId" TEXT,
    "type" "ClaimType" NOT NULL,
    "status" "ClaimStatus" NOT NULL,
    "detail" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreEvent" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "roundId" TEXT,
    "type" "ScoreEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "entries" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Highlight" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "participantId" TEXT,
    "type" "HighlightType" NOT NULL,
    "roundIndex" INTEGER,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Highlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameResult" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "winnerParticipantId" TEXT,
    "totalRounds" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" TEXT,
    "roomId" TEXT,
    "action" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_normalizedName_key" ON "Artist"("normalizedName");

-- CreateIndex
CREATE INDEX "Track_normalizedTitle_idx" ON "Track"("normalizedTitle");

-- CreateIndex
CREATE INDEX "Track_artistId_idx" ON "Track"("artistId");

-- CreateIndex
CREATE INDEX "ExternalTrackReference_trackId_idx" ON "ExternalTrackReference"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalTrackReference_provider_externalId_key" ON "ExternalTrackReference"("provider", "externalId");

-- CreateIndex
CREATE INDEX "TrackPreview_status_idx" ON "TrackPreview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrackPreview_trackId_provider_key" ON "TrackPreview"("trackId", "provider");

-- CreateIndex
CREATE INDEX "MusicCollection_ownerId_idx" ON "MusicCollection"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicCollectionTrack_collectionId_trackId_key" ON "MusicCollectionTrack"("collectionId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicCollectionTrack_collectionId_position_key" ON "MusicCollectionTrack"("collectionId", "position");

-- CreateIndex
CREATE INDEX "Game_ownerId_idx" ON "Game"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSettings_gameId_key" ON "GameSettings"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE INDEX "Room_expiresAt_idx" ON "Room"("expiresAt");

-- CreateIndex
CREATE INDEX "RoomParticipant_roomId_idx" ON "RoomParticipant"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomParticipant_roomId_aliasNormalized_key" ON "RoomParticipant"("roomId", "aliasNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSession_tokenHash_key" ON "PlayerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PlayerSession_participantId_idx" ON "PlayerSession"("participantId");

-- CreateIndex
CREATE INDEX "PlayerDevice_participantId_idx" ON "PlayerDevice"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "AudioReadiness_participantId_key" ON "AudioReadiness"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "BingoCard_participantId_key" ON "BingoCard"("participantId");

-- CreateIndex
CREATE INDEX "BingoCard_roomId_idx" ON "BingoCard"("roomId");

-- CreateIndex
CREATE INDEX "BingoCardCell_trackId_idx" ON "BingoCardCell"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "BingoCardCell_cardId_position_key" ON "BingoCardCell"("cardId", "position");

-- CreateIndex
CREATE INDEX "GameRound_roomId_status_idx" ON "GameRound"("roomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_roomId_index_key" ON "GameRound"("roomId", "index");

-- CreateIndex
CREATE INDEX "PlayerMark_participantId_idx" ON "PlayerMark"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMark_roundId_cellId_key" ON "PlayerMark"("roundId", "cellId");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_idempotencyKey_key" ON "Claim"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Claim_roomId_type_status_idx" ON "Claim"("roomId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreEvent_idempotencyKey_key" ON "ScoreEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ScoreEvent_roomId_participantId_idx" ON "ScoreEvent"("roomId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardSnapshot_roomId_roundIndex_key" ON "LeaderboardSnapshot"("roomId", "roundIndex");

-- CreateIndex
CREATE INDEX "Highlight_roomId_idx" ON "Highlight"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "GameResult_roomId_key" ON "GameResult"("roomId");

-- CreateIndex
CREATE INDEX "AuditLog_roomId_idx" ON "AuditLog"("roomId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTrackReference" ADD CONSTRAINT "ExternalTrackReference_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackPreview" ADD CONSTRAINT "TrackPreview_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicCollection" ADD CONSTRAINT "MusicCollection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicCollectionTrack" ADD CONSTRAINT "MusicCollectionTrack_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "MusicCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicCollectionTrack" ADD CONSTRAINT "MusicCollectionTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "MusicCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSettings" ADD CONSTRAINT "GameSettings_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipant" ADD CONSTRAINT "RoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipant" ADD CONSTRAINT "RoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSession" ADD CONSTRAINT "PlayerSession_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerDevice" ADD CONSTRAINT "PlayerDevice_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioReadiness" ADD CONSTRAINT "AudioReadiness_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCard" ADD CONSTRAINT "BingoCard_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCard" ADD CONSTRAINT "BingoCard_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCardCell" ADD CONSTRAINT "BingoCardCell_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BingoCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCardCell" ADD CONSTRAINT "BingoCardCell_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMark" ADD CONSTRAINT "PlayerMark_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMark" ADD CONSTRAINT "PlayerMark_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMark" ADD CONSTRAINT "PlayerMark_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "BingoCardCell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardSnapshot" ADD CONSTRAINT "LeaderboardSnapshot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_winnerParticipantId_fkey" FOREIGN KEY ("winnerParticipantId") REFERENCES "RoomParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
