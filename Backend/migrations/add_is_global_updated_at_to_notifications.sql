
ALTER TABLE `notifications`
ADD COLUMN `is_global` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'True for broadcast notifications sent to all users',
ADD COLUMN `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Index to efficiently query non-global notifications (user-specific delete/read)
CREATE INDEX `idx_notifications_is_global` ON `notifications` (`is_global`);
