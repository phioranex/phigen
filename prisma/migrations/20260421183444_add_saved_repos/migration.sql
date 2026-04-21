-- CreateTable
CREATE TABLE "SavedRepo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "repoOwner" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRepo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedRepo_userId_repoOwner_repoName_key" ON "SavedRepo"("userId", "repoOwner", "repoName");

-- AddForeignKey
ALTER TABLE "SavedRepo" ADD CONSTRAINT "SavedRepo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
