ALTER TABLE `cards` ADD `account_id` integer REFERENCES accounts(id);--> statement-breakpoint
ALTER TABLE `cards` ADD `issuer` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `cards` ADD `issuer_logo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `cards` ADD `issuer_template_id` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `product` text DEFAULT 'debit' NOT NULL;