-- AlterTable
ALTER TABLE "MusicCollection" ADD COLUMN     "refreshedAt" TIMESTAMP(3),
ADD COLUMN     "themeKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MusicCollection_themeKey_key" ON "MusicCollection"("themeKey");
