ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('superadmin', 'seller', 'admin', 'delivery_company')
  DEFAULT 'seller';
