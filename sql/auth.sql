-- =====================================================
-- 用户认证与权限（Auth Service）
-- MySQL 8.0+
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ===========================
-- 系统用户
-- ===========================
DROP TABLE IF EXISTS `sys_audit_log`;
DROP TABLE IF EXISTS `sys_user_project`;
DROP TABLE IF EXISTS `sys_user_org`;
DROP TABLE IF EXISTS `sys_user`;

CREATE TABLE `sys_user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username` VARCHAR(64) NOT NULL COMMENT '用户名',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt 密码哈希',
  `email` VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0=禁用 1=正常',
  `is_super_admin` TINYINT NOT NULL DEFAULT 0 COMMENT '是否超管 0=否 1=是',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户';

-- ===========================
-- 用户-组织授权
-- ===========================
CREATE TABLE `sys_user_org` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `org_id` BIGINT UNSIGNED NOT NULL,
  `role` ENUM('manage','view') NOT NULL DEFAULT 'view' COMMENT 'manage=管理 view=查看',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_org` (`user_id`, `org_id`),
  KEY `idx_org` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户组织权限';

-- ===========================
-- 用户-项目授权
-- ===========================
CREATE TABLE `sys_user_project` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `project_id` BIGINT UNSIGNED NOT NULL,
  `role` ENUM('manage','view') NOT NULL DEFAULT 'view',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_project` (`user_id`, `project_id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户项目权限';

-- ===========================
-- 审计日志
-- ===========================
CREATE TABLE `sys_audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED DEFAULT NULL,
  `username` VARCHAR(64) DEFAULT NULL,
  `action` VARCHAR(64) NOT NULL COMMENT '操作类型',
  `target_type` VARCHAR(64) DEFAULT NULL COMMENT '目标类型',
  `target_id` VARCHAR(64) DEFAULT NULL COMMENT '目标ID',
  `detail` JSON DEFAULT NULL COMMENT '详情',
  `client_ip` VARCHAR(45) DEFAULT NULL,
  `channel` VARCHAR(16) DEFAULT NULL COMMENT 'local/lan/public',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审计日志';

SET FOREIGN_KEY_CHECKS = 1;

-- ===========================
-- 种子数据：admin / 123456
-- bcrypt cost=10
-- ===========================
INSERT INTO `sys_user` (`username`, `password_hash`, `email`, `status`, `is_super_admin`)
VALUES ('admin', '', 'admin@local', 1, 1);
