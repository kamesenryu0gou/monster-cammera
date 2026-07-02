CREATE TABLE `booth_daily_counters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dateKey` varchar(8) NOT NULL,
	`lastSequence` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `booth_daily_counters_id` PRIMARY KEY(`id`),
	CONSTRAINT `booth_daily_counters_dateKey_unique` UNIQUE(`dateKey`)
);
--> statement-breakpoint
CREATE TABLE `booth_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` varchar(32) NOT NULL,
	`dateKey` varchar(8) NOT NULL,
	`sequenceNumber` int NOT NULL,
	`displayNumber` varchar(16) NOT NULL,
	`status` enum('prepared','processing','completed','failed') NOT NULL DEFAULT 'prepared',
	`sourceImageKey` text,
	`sourceImageUrl` text,
	`generatedImageKey` text,
	`generatedImageUrl` text,
	`subjectCount` int NOT NULL DEFAULT 0,
	`assignedVariantsJson` text,
	`promptSummaryJson` text,
	`errorCode` varchar(64),
	`errorMessage` text,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `booth_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `booth_jobs_jobId_unique` UNIQUE(`jobId`)
);
