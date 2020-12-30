SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for bots
-- ----------------------------
DROP TABLE IF EXISTS `bots`;
CREATE TABLE `bots`  (
  `bot_id` smallint UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `comment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`bot_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for groups
-- ----------------------------
DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups`  (
  `group_id` smallint UNSIGNED NOT NULL AUTO_INCREMENT,
  `bot_id` smallint UNSIGNED NOT NULL,
  `group` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `invite_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`group_id`) USING BTREE,
  UNIQUE INDEX `group`(`group`) USING BTREE,
  INDEX `bot_id`(`bot_id`) USING BTREE,
  CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`bot_id`) REFERENCES `bots` (`bot_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 40 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for moderators
-- ----------------------------
DROP TABLE IF EXISTS `moderators`;
CREATE TABLE `moderators`  (
  `moderator_id` smallint UNSIGNED NOT NULL AUTO_INCREMENT,
  `bot_id` smallint UNSIGNED NOT NULL,
  `number` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `access` tinyint NULL DEFAULT 1,
  PRIMARY KEY (`moderator_id`) USING BTREE,
  INDEX `bot_id`(`bot_id`) USING BTREE,
  CONSTRAINT `moderators_ibfk_1` FOREIGN KEY (`bot_id`) REFERENCES `bots` (`bot_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for operators
-- ----------------------------
DROP TABLE IF EXISTS `operators`;
CREATE TABLE `operators`  (
  `operator_id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `bot_id` smallint UNSIGNED NULL DEFAULT NULL,
  `moderator_id` smallint UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`operator_id`) USING BTREE,
  INDEX `bot_id`(`bot_id`) USING BTREE,
  INDEX `moderator_id`(`moderator_id`) USING BTREE,
  CONSTRAINT `operators_ibfk_1` FOREIGN KEY (`bot_id`) REFERENCES `bots` (`bot_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `operators_ibfk_2` FOREIGN KEY (`moderator_id`) REFERENCES `moderators` (`moderator_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for settings
-- ----------------------------
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings`  (
  `bot_id` smallint UNSIGNED NULL DEFAULT NULL,
  `utm_tag` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '',
  `log_joins` tinyint UNSIGNED NULL DEFAULT 1,
  `group_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `default_group_desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  INDEX `bot_id`(`bot_id`) USING BTREE,
  CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`bot_id`) REFERENCES `bots` (`bot_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for traffic
-- ----------------------------
DROP TABLE IF EXISTS `traffic`;
CREATE TABLE `traffic`  (
  `bot_id` smallint UNSIGNED NULL DEFAULT NULL,
  `group_id` smallint UNSIGNED NULL DEFAULT NULL,
  `type` tinyint NULL DEFAULT NULL,
  `who` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `timestamp` bigint NULL DEFAULT NULL,
  INDEX `bot_id`(`bot_id`) USING BTREE,
  INDEX `group_id`(`group_id`) USING BTREE,
  CONSTRAINT `traffic_ibfk_1` FOREIGN KEY (`bot_id`) REFERENCES `bots` (`bot_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `traffic_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`group_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
