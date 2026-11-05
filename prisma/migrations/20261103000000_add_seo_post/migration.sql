-- AlterTable
ALTER TABLE `Post` ADD COLUMN `seoTitulo` VARCHAR(120) NULL,
    ADD COLUMN `seoDescricao` VARCHAR(300) NULL,
    ADD COLUMN `palavrasChave` VARCHAR(500) NULL;
