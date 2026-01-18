PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`avatar` text,
	`google_oauth_id` text,
	`two_fa` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "username", "email", "password_hash", "avatar", "google_oauth_id", "two_fa") SELECT "id", "username", "email", "password_hash", "avatar", "google_oauth_id", "two_fa" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);