-- Add contact fields to group members while preserving current user-linked data.
ALTER TABLE `GrupoIntegrante`
  ADD COLUMN `nome` VARCHAR(191) NULL,
  ADD COLUMN `email` VARCHAR(191) NULL,
  ADD COLUMN `telefone` VARCHAR(191) NULL;

UPDATE `GrupoIntegrante` gi
LEFT JOIN `User` u ON u.`id` = gi.`userId`
SET
  gi.`nome` = COALESCE(u.`name`, u.`email`, CONCAT('Integrante ', gi.`id`)),
  gi.`email` = u.`email`,
  gi.`telefone` = u.`phone`
WHERE gi.`nome` IS NULL;

ALTER TABLE `GrupoIntegrante`
  MODIFY COLUMN `nome` VARCHAR(191) NOT NULL;

SET @user_fk := (
  SELECT k.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE k
  WHERE k.TABLE_SCHEMA = DATABASE()
    AND k.TABLE_NAME = 'GrupoIntegrante'
    AND k.COLUMN_NAME = 'userId'
    AND k.REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);
SET @drop_fk_sql := IF(
  @user_fk IS NOT NULL,
  CONCAT('ALTER TABLE `GrupoIntegrante` DROP FOREIGN KEY `', @user_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grupo_user_unique := (
  SELECT s.INDEX_NAME
  FROM information_schema.STATISTICS s
  WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = 'GrupoIntegrante'
  GROUP BY s.INDEX_NAME
  HAVING SUM(CASE WHEN s.COLUMN_NAME = 'grupoId' THEN 1 ELSE 0 END) > 0
     AND SUM(CASE WHEN s.COLUMN_NAME = 'userId' THEN 1 ELSE 0 END) > 0
     AND s.INDEX_NAME <> 'PRIMARY'
  LIMIT 1
);

SET @grupo_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS s
  WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = 'GrupoIntegrante'
    AND s.INDEX_NAME = 'GrupoIntegrante_grupoId_idx'
);
SET @create_grupo_idx_sql := IF(
  @grupo_idx_exists = 0,
  'ALTER TABLE `GrupoIntegrante` ADD INDEX `GrupoIntegrante_grupoId_idx` (`grupoId`)',
  'SELECT 1'
);
PREPARE stmt FROM @create_grupo_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_idx_sql := IF(
  @grupo_user_unique IS NOT NULL,
  CONCAT('ALTER TABLE `GrupoIntegrante` DROP INDEX `', @grupo_user_unique, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @drop_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @user_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS s
  WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = 'GrupoIntegrante'
    AND s.INDEX_NAME = 'GrupoIntegrante_userId_fkey'
);
SET @drop_user_idx_sql := IF(
  @user_idx_exists > 0,
  'ALTER TABLE `GrupoIntegrante` DROP INDEX `GrupoIntegrante_userId_fkey`',
  'SELECT 1'
);
PREPARE stmt FROM @drop_user_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `GrupoIntegrante`
  DROP COLUMN `userId`;
