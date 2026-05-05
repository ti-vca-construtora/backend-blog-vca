-- CreateTable
CREATE TABLE `HistoricoMensagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grupoId` INTEGER NOT NULL,
    `grupoNome` VARCHAR(191) NOT NULL,
    `integranteId` INTEGER NOT NULL,
    `integranteNome` VARCHAR(191) NOT NULL,
    `destinatario` VARCHAR(191) NOT NULL,
    `canal` VARCHAR(191) NOT NULL,
    `assunto` VARCHAR(191) NULL,
    `mensagem` LONGTEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `erro` LONGTEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HistoricoMensagem` ADD CONSTRAINT `HistoricoMensagem_grupoId_fkey` FOREIGN KEY (`grupoId`) REFERENCES `Grupo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
