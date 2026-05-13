-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentName" TEXT NOT NULL,
    "assignmentTitle" TEXT NOT NULL,
    "className" TEXT NOT NULL DEFAULT '',
    "originalText" TEXT NOT NULL,
    "fixedText" TEXT NOT NULL,
    "corrections" TEXT NOT NULL,
    "score" TEXT NOT NULL,
    "scoreNum" REAL NOT NULL,
    "feedback" TEXT NOT NULL,
    "overallRating" TEXT NOT NULL,
    "processingTimeMs" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
