

ALTER TABLE `products` 
ADD COLUMN `is_trend` TINYINT(1) DEFAULT 0 COMMENT 'Marks product as trending',
ADD COLUMN `is_important` TINYINT(1) DEFAULT 0 COMMENT 'Marks product as important';

-- Add index for better performance when filtering by these columns
CREATE INDEX `idx_is_trend` ON `products` (`is_trend`);
CREATE INDEX `idx_is_important` ON `products` (`is_important`);
