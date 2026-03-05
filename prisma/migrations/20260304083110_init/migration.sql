-- CreateTable
CREATE TABLE `Printer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'available',
    `endTime` DATETIME(3) NULL,
    `bufferEndTime` DATETIME(3) NULL,
    `brokenReason` VARCHAR(191) NULL,
    `currentUser` JSON NULL,
    `nextReservation` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsageLog` (
    `id` VARCHAR(191) NOT NULL,
    `printerId` VARCHAR(191) NOT NULL,
    `printerName` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `usageTime` INTEGER NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `photoUrl` VARCHAR(191) NULL,
    `stopReason` VARCHAR(191) NULL,
    `statusAtEnd` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabSettings` (
    `id` VARCHAR(191) NOT NULL,
    `isManuallyClosed` BOOLEAN NOT NULL DEFAULT false,
    `openTime` VARCHAR(191) NOT NULL DEFAULT '08:00',
    `closeTime` VARCHAR(191) NOT NULL DEFAULT '17:00',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
