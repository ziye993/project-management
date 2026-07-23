-- =====================================================
-- 用户认证与能力授权（Capability Grant）
-- MySQL 8.0+
-- 开发环境可整文件重建；不兼容旧 sys_user_org / sys_user_project
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `sys_capability_grant`;
DROP TABLE IF EXISTS `sys_audit_log`;
DROP TABLE IF EXISTS `sys_user_project`;
DROP TABLE IF EXISTS `sys_user_org`;
DROP TABLE IF EXISTS `sys_user`;

-- ===========================
-- 系统用户
-- ===========================
CREATE TABLE `sys_user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username` VARCHAR(64) NOT NULL COMMENT '用户名',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt 密码哈希',
  `email` VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0=禁用 1=正常',
  `is_super_admin` TINYINT NOT NULL DEFAULT 0 COMMENT '是否平台超管 0=否 1=是',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户';

-- ===========================
-- 能力授权
-- ===========================
CREATE TABLE `sys_capability_grant` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '被授权用户',
  `capability` VARCHAR(64) NOT NULL COMMENT '能力标识',
  `scope_type` ENUM('org','project') NOT NULL COMMENT '作用域类型',
  `scope_id` BIGINT UNSIGNED NOT NULL COMMENT '作用域ID；平台级模块能力用 org+0',
  `can_delegate` TINYINT NOT NULL DEFAULT 1 COMMENT '可否再授权',
  `can_revoke_peer` TINYINT NOT NULL DEFAULT 0 COMMENT '可否收回他人同权',
  `granted_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '授权人',
  `grant_source` VARCHAR(32) NOT NULL DEFAULT 'manual' COMMENT 'manual|tenant_bootstrap',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_cap_scope` (`user_id`, `capability`, `scope_type`, `scope_id`),
  KEY `idx_scope` (`scope_type`, `scope_id`),
  KEY `idx_capability` (`capability`),
  KEY `idx_granted_by` (`granted_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='能力授权';

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
VALUES (
  'admin',
  '$2b$10$6F29medG9aAJUcb8v/l9Lu5zM.Wj1hm8FBWfFXjvWlcEmba/wsAZy',
  'admin@local',
  1,
  1
);
