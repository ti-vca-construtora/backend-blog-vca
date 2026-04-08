import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BackupFileResponseDto } from './dto/backup-file-response.dto';

const execFileAsync = promisify(execFile);

type BackupConfig = {
  database: {
    type: 'mysql';
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  backup: {
    path: string;
    retention_days: number;
    compression: boolean;
  };
  docker: {
    enabled: boolean;
    container_name: string;
  };
};

@Injectable()
export class BackupsService {
  private readonly rootPath =
    process.env.BACKUP_MODULE_ROOT ?? path.resolve(process.cwd(), 'backup-module');

  private readonly configPath = path.join(this.rootPath, 'config', 'backup.config.json');
  private readonly scriptsPath = path.join(this.rootPath, 'scripts');

  async listBackups(): Promise<BackupFileResponseDto[]> {
    const config = await this.readConfig();
    await fs.mkdir(config.backup.path, { recursive: true });

    const files = await fs.readdir(config.backup.path);

    const backupFiles = await Promise.all(
      files
        .filter((file) => this.isAllowedBackupName(file))
        .map(async (name) => {
          const fullPath = path.join(config.backup.path, name);
          const stats = await fs.stat(fullPath);

          return {
            name,
            bytes: stats.size,
            createdAt: stats.birthtime,
          };
        }),
    );

    return backupFiles
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((item) => ({
        name: item.name,
        size: this.humanFileSize(item.bytes),
        created_at: item.createdAt.toISOString(),
      }));
  }

  async getBackupFileForDownload(filename: string) {
    const config = await this.readConfig();
    const fullPath = this.resolveBackupPath(config.backup.path, filename);

    await this.ensureFileExists(fullPath, filename);

    return {
      name: path.basename(fullPath),
      path: fullPath,
    };
  }

  async restoreBackup(filename: string) {
    const config = await this.readConfig();
    const fullPath = this.resolveBackupPath(config.backup.path, filename);

    await this.ensureFileExists(fullPath, filename);

    try {
      const { stdout, stderr } = await this.runShellScript('restore.sh', [fullPath]);

      return {
        message: 'Restore executado com sucesso.',
        output: (stdout || stderr || '').trim(),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Falha ao executar restore.',
        error: this.parseExecError(error),
      });
    }
  }

  async generateBackup() {
    try {
      const { stdout, stderr } = await this.runShellScript('backup.sh');

      return {
        message: 'Backup gerado com sucesso.',
        output: (stdout || stderr || '').trim(),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Falha ao gerar backup.',
        error: this.parseExecError(error),
      });
    }
  }

  private async runShellScript(scriptName: string, args: string[] = []) {
    const scriptPath = path.join(this.scriptsPath, scriptName);
    const env = {
      ...process.env,
      BACKUP_MODULE_ROOT: this.rootPath,
    };

    const shellCandidates = this.getShellCandidates();
    let lastError: unknown;

    for (const shell of shellCandidates) {
      try {
        return await execFileAsync(shell, [scriptPath, ...args], { env });
      } catch (error) {
        const execError = error as { code?: string };
        if (execError?.code === 'ENOENT') {
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    throw new InternalServerErrorException({
      message:
        'Nao foi possivel localizar shell para executar scripts (.sh). Instale Git Bash ou rode no Linux.',
      error: this.parseExecError(lastError),
    });
  }

  private getShellCandidates(): string[] {
    if (process.platform !== 'win32') {
      return ['sh'];
    }

    const candidates = [
      process.env.BASH_PATH,
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
      'bash',
      'sh',
    ].filter((item): item is string => Boolean(item));

    return candidates.filter((shell) => {
      if (shell.includes('\\') || shell.includes('/')) {
        return existsSync(shell);
      }

      return true;
    });
  }

  private async readConfig(): Promise<BackupConfig> {
    try {
      const rawConfig = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(rawConfig) as BackupConfig;

      if (!config?.backup?.path) {
        throw new BadRequestException('backup.path nao configurado.');
      }

      return config;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Nao foi possivel ler backup.config.json em ${this.configPath}`,
      );
    }
  }

  private resolveBackupPath(basePath: string, filename: string): string {
    if (!this.isAllowedBackupName(filename)) {
      throw new BadRequestException('Nome de arquivo invalido.');
    }

    const resolvedBase = path.resolve(basePath);
    const resolvedFile = path.resolve(resolvedBase, filename);

    if (!resolvedFile.startsWith(resolvedBase + path.sep)) {
      throw new BadRequestException('Path traversal detectado.');
    }

    return resolvedFile;
  }

  private async ensureFileExists(fullPath: string, filename: string) {
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException(`Backup nao encontrado: ${filename}`);
    }
  }

  private isAllowedBackupName(filename: string): boolean {
    return /^[a-zA-Z0-9._-]+\.sql(\.gz)?$/.test(filename);
  }

  private parseExecError(error: unknown): string {
    if (error && typeof error === 'object') {
      const maybeError = error as { stderr?: string; message?: string };
      return (maybeError.stderr || maybeError.message || 'Erro desconhecido').trim();
    }

    return 'Erro desconhecido';
  }

  private humanFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes}B`;
    }

    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)}KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(1)}MB`;
  }
}
