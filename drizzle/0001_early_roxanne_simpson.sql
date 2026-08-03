PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`institution` text NOT NULL,
	`institution_logo` text NOT NULL,
	`account_number` text NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT '₱' NOT NULL,
	`change` real DEFAULT 0 NOT NULL,
	`change_percent` real DEFAULT 0 NOT NULL,
	`last_activity` text NOT NULL,
	`color` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`template_id` text,
	`institution_kind` text,
	`pdic_insured` integer DEFAULT false NOT NULL,
	`interest_rate` real,
	`crediting_frequency` text DEFAULT 'none' NOT NULL,
	`crediting_timing` text,
	`compounding` integer DEFAULT false NOT NULL,
	`maintaining_balance` real,
	`required_adb` real,
	`interest_cap` real,
	`monthly_fee` real,
	`free_transfers_per_month` integer,
	`instapay_fee` real,
	`pesonet_fee` real,
	`daily_transfer_limit` real,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_accounts`("id", "user_id", "name", "type", "institution", "institution_logo", "account_number", "balance", "currency", "change", "change_percent", "last_activity", "color", "created_at") SELECT "id", "user_id", "name", "type", "institution", "institution_logo", "account_number", "balance", "currency", "change", "change_percent", "last_activity", "color", "created_at" FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;