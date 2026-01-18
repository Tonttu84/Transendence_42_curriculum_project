DROP INDEX `users_email_unique`;--> statement-breakpoint
ALTER TABLE `users` ADD `two_fa_token` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `two_fa`;