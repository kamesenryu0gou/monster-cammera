CREATE TABLE `booth_capture_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`eventType` enum('capture_started') NOT NULL DEFAULT 'capture_started',
	`localDateKey` varchar(10) NOT NULL,
	`localHourKey` varchar(13) NOT NULL,
	`jobId` varchar(32),
	`triggeredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `booth_capture_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booth_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenUserAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `booth_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `booth_devices_deviceId_unique` UNIQUE(`deviceId`)
);
