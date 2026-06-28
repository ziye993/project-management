-- =====================================================
-- 日志中心（Log Service）
-- MySQL 8.0+
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ===========================
-- 组织表
-- ===========================
DROP TABLE IF EXISTS `sys_org`;

CREATE TABLE `sys_org` (
                           `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',

                           `org_name` VARCHAR(100) NOT NULL COMMENT '组织名称',

                           `contact_name` VARCHAR(50) DEFAULT NULL COMMENT '联系人',

                           `contact_phone` VARCHAR(20) DEFAULT NULL COMMENT '联系电话',

                           `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0=禁用 1=正常',

                           `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',

                           `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

                           `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

                           PRIMARY KEY (`id`),

                           KEY `idx_status` (`status`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组织表';


-- ===========================
-- 项目表
-- ===========================
DROP TABLE IF EXISTS `sys_project`;

CREATE TABLE `sys_project` (
                               `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',

                               `org_id` BIGINT UNSIGNED NOT NULL COMMENT '所属组织ID',

                               `project_name` VARCHAR(100) NOT NULL COMMENT '项目名称',

                               `project_code` VARCHAR(64) NOT NULL COMMENT '项目编码(唯一)',

                               `description` VARCHAR(500) DEFAULT NULL COMMENT '项目说明',

                               `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0=禁用 1=正常',

                               `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                               PRIMARY KEY (`id`),

                               UNIQUE KEY `uk_project_code` (`project_code`),

                               KEY `idx_org` (`org_id`),

                               KEY `idx_status` (`status`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表';


-- ===========================
-- API Key
-- 每个项目可以拥有多个Key
-- ===========================
DROP TABLE IF EXISTS `sys_api_key`;

CREATE TABLE `sys_api_key` (
                               `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',

                               `project_id` BIGINT UNSIGNED NOT NULL COMMENT '所属项目',

                               `api_key` CHAR(64) NOT NULL COMMENT 'API Key（建议存SHA256后的值）',

                               `key_name` VARCHAR(100) DEFAULT NULL COMMENT 'Key名称，如：生产环境、测试环境',

                               `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0=禁用 1=启用',

                               `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间，为NULL表示永久有效',

                               `last_used_time` DATETIME DEFAULT NULL COMMENT '最后使用时间',

                               `last_ip` VARCHAR(45) DEFAULT NULL COMMENT '最后请求IP',

                               `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',

                               `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                               PRIMARY KEY (`id`),

                               UNIQUE KEY `uk_api_key` (`api_key`),

                               KEY `idx_project` (`project_id`),

                               KEY `idx_status` (`status`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API Key';


-- ===========================
-- 日志表
-- ===========================
DROP TABLE IF EXISTS `sys_log`;

CREATE TABLE `sys_log` (
                           `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',

                           `api_key_id` BIGINT UNSIGNED NOT NULL COMMENT 'API Key ID',

                           `org_id` BIGINT UNSIGNED NOT NULL COMMENT '组织ID（冗余）',

                           `project_id` BIGINT UNSIGNED NOT NULL COMMENT '项目ID（冗余）',

                           `level` ENUM('DEBUG','INFO','WARN','ERROR','FATAL')
        NOT NULL DEFAULT 'INFO'
        COMMENT '日志等级',

                           `module` VARCHAR(100) DEFAULT NULL COMMENT '模块',

                           `title` VARCHAR(200) DEFAULT NULL COMMENT '标题',

                           `content` LONGTEXT NOT NULL COMMENT '日志内容',

                           `data` JSON DEFAULT NULL COMMENT '附加JSON数据',

                           `trace_id` VARCHAR(64) DEFAULT NULL COMMENT '链路ID',

                           `client_ip` VARCHAR(45) DEFAULT NULL COMMENT '客户端IP',

                           `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '客户端信息',

                           `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '日志时间',

                           PRIMARY KEY (`id`),

                           KEY `idx_api_key` (`api_key_id`),

                           KEY `idx_project` (`project_id`),

                           KEY `idx_org` (`org_id`),

                           KEY `idx_level` (`level`),

                           KEY `idx_module` (`module`),

                           KEY `idx_trace` (`trace_id`),

                           KEY `idx_create_time` (`create_time`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日志表';

SET FOREIGN_KEY_CHECKS = 1;