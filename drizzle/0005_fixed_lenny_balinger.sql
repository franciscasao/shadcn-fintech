CREATE TABLE `card_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`card_id` integer NOT NULL,
	`from_account_id` integer,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`note` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `cards` ADD `credit_limit` real;--> statement-breakpoint
ALTER TABLE `cards` ADD `apr` real;--> statement-breakpoint
ALTER TABLE `cards` ADD `statement_day` integer;--> statement-breakpoint
ALTER TABLE `cards` ADD `due_day` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `card_payment_id` integer REFERENCES card_payments(id);