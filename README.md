# Blog VCA API

API em NestJS com Prisma e MySQL.

## Resumo da alteracao em grupos

Agora o integrante de grupo nao depende mais de usuario do sistema.

Antes:
- GrupoIntegrante gravava grupoId + userId

Agora:
- GrupoIntegrante grava grupoId + nome + email + telefone
- O campo userId foi removido da tabela de integrantes

Objetivo:
- Permitir lista de destinatarios para notificacoes (email/whatsapp) sem criar usuario no sistema

## Como rodar local

1. Instale dependencias:

```bash
npm install
```

2. Configure o arquivo .env com DATABASE_URL (MySQL).

Exemplo:

```env
DATABASE_URL="mysql://blog_user:BlogUserPassword2026@localhost:3306/blog_vca"
PORT=3000
```

3. Aplique migracoes:

```bash
npx prisma migrate dev
npx prisma generate
```

4. Suba a API:

```bash
npm run start:dev
```

5. Abra a documentacao:
- http://localhost:3000/docs

## Teste no Insomnia (novo fluxo de grupos)

Base URL local:
- http://localhost:3000

### 1) Criar grupo

Metodo:
- POST /grupos

Body JSON:

```json
{
  "nome": "Clientes SP",
  "descricao": "Clientes para notificacoes de campanha"
}
```

### 2) Listar grupos

Metodo:
- GET /grupos

Opcional:
- GET /grupos?ativo=true

### 3) Buscar grupo por id (com integrantes ativos)

Metodo:
- GET /grupos/:id

### 4) Adicionar integrante no grupo

Metodo:
- POST /grupos/:id/integrantes

Body JSON (exemplo 1):

```json
{
  "nome": "Maria Silva",
  "email": "maria@cliente.com",
  "telefone": "+5511999999999"
}
```

Body JSON (exemplo 2 - sem email):

```json
{
  "nome": "Joao Souza",
  "telefone": "+5511888888888"
}
```

Regra importante:
- Precisa informar pelo menos email ou telefone

### 5) Remover integrante do grupo (desativacao logica)

Metodo:
- DELETE /grupos/:id/integrantes/:integranteId

Observacao:
- O integrante nao e apagado fisicamente, apenas marcado como inativo

### 6) Desativar grupo

Metodo:
- PATCH /grupos/:id/desativar

## Deploy seguro na VPS sem perder banco

Esta secao e o fluxo recomendado para producao.

## Regra de ouro

Nunca use estes comandos em producao:
- prisma db push
- prisma migrate reset

Use sempre:
- prisma migrate deploy

## Passo a passo seguro (Docker Compose)

### 1) Fazer backup antes de qualquer alteracao

Se estiver usando o container MySQL do projeto (nome padrao blog_vca_mysql):

```bash
docker exec -i blog_vca_mysql sh -c 'mysqldump -uroot -proot --databases blog_vca --routines --triggers --single-transaction' > backup_blog_vca_$(date +%F_%H-%M-%S).sql
```

Validacao rapida do backup:

```bash
ls -lh backup_blog_vca_*.sql
head -n 20 backup_blog_vca_*.sql
```

### 2) Atualizar codigo

```bash
git pull origin main
```

### 3) Build da API com codigo novo

```bash
docker compose build api
```

### 4) Aplicar migracoes de forma segura

Suba apenas banco e rode migrate deploy em container temporario:

```bash
docker compose up -d mysql
docker compose run --rm api npx prisma migrate deploy
docker compose run --rm api npx prisma generate
```

### 5) Subir API atualizada

```bash
docker compose up -d api
```

### 6) Verificacao pos deploy

```bash
docker compose ps
docker compose logs -f api
```

Teste os endpoints:
- GET /docs
- GET /grupos
- POST /grupos/:id/integrantes

## Plano de rollback (se der problema)

### Opcao A: rollback de aplicacao (sem mexer no banco)

- Voltar para commit/tag anterior da API
- Rebuild e restart da API
- Manter banco como esta

Isso resolve a maioria dos problemas de codigo sem risco de perda de dados.

### Opcao B: restaurar backup do banco (ultimo recurso)

Apenas se necessario e com janela de manutencao.

1. Pare a API para evitar escrita:

```bash
docker compose stop api
```

2. Restaure dump:

```bash
cat backup_blog_vca_YYYY-MM-DD_HH-MM-SS.sql | docker exec -i blog_vca_mysql sh -c 'mysql -uroot -proot'
```

3. Suba novamente a API:

```bash
docker compose up -d api
```

## Checklist rapido de seguranca

Antes de subir:
- Backup gerado e validado
- Janela de manutencao definida
- Comando de migracao sera migrate deploy

Depois de subir:
- API em pe
- Endpoint /docs respondendo
- Teste de criar grupo e adicionar integrante funcionando

## Arquivos alterados nesta entrega

- prisma/schema.prisma
- prisma/migrations/20260408120000_alter_grupo_integrante_contato/migration.sql
- src/grupos/dto/adicionar-usuario-grupo.dto.ts
- src/grupos/grupos.controller.ts
- src/grupos/grupos.service.ts

## Modulo de Backup Reutilizavel (Cron + API)

O projeto agora possui um modulo de backup desacoplado, pensado para reuso em outros projetos.

Estrutura criada:

```bash
backup-module/
├── scripts/
│   ├── backup.sh
│   ├── restore.sh
├── storage/
│   ├── backups/
│   ├── temp/
├── logs/
│   ├── backup.log
├── config/
│   ├── backup.config.json
```

Arquivos de API:

- src/backups/backups.module.ts
- src/backups/backups.controller.ts
- src/backups/backups.service.ts
- src/backups/guards/backup-admin.guard.ts
- src/backups/dto/restore-backup.dto.ts

### Configuracao

1. Ajuste o arquivo `backup-module/config/backup.config.json` com os dados reais da VPS.
2. Defina em producao a variavel de ambiente `BACKUP_MODULE_ROOT=/srv/backup-module`.

Observacao:
- O arquivo versionado vem com placeholders em user/password.
- Nao deixe credencial real commitada no git.

### Scripts

- `backup.sh`: gera dump, comprime (opcional), aplica retencao, registra log
- `restore.sh`: restaura a partir de `.sql` ou `.sql.gz` e registra log

No Linux/VPS, lembre de permissao de execucao:

```bash
chmod +x /srv/backup-module/scripts/backup.sh
chmod +x /srv/backup-module/scripts/restore.sh
```

### Cron (obrigatorio)

Edite o crontab:

```bash
crontab -e
```

Exemplo diario (02:00):

```bash
0 2 * * * BACKUP_MODULE_ROOT=/srv/backup-module /srv/backup-module/scripts/backup.sh >> /srv/backup-module/logs/backup.log 2>&1
```

Exemplo semanal (domingo 03:00):

```bash
0 3 * * 0 BACKUP_MODULE_ROOT=/srv/backup-module /srv/backup-module/scripts/backup.sh >> /srv/backup-module/logs/backup.log 2>&1
```

### Endpoints da API

Base route:
- `/api/backups`

Autenticacao:
- JWT obrigatorio
- Apenas usuario com role `Admin`

1. Listar backups

```http
GET /api/backups
```

2. Download de backup

```http
GET /api/backups/:filename
```

3. Restore

```http
POST /api/backups/restore
Content-Type: application/json

{
  "filename": "backup_2026-04-07_02-00-00.sql.gz"
}
```

4. Gerar backup manual (opcional, admin)

```http
POST /api/backups/generate
```

### Seguranca implementada

- Endpoint protegido com JWT
- Restricao para role admin
- Bloqueio de path traversal no filename
- Scripts fora da camada de endpoint (infra-first)

### Fluxo recomendado na VPS (sem perder banco)

1. Gerar backup manual antes do deploy:

```bash
BACKUP_MODULE_ROOT=/srv/backup-module /srv/backup-module/scripts/backup.sh
```

2. Atualizar aplicacao e migracoes:

```bash
git pull origin main
docker compose build api
docker compose up -d mysql
docker compose run --rm api npx prisma migrate deploy
docker compose up -d api
```

3. Validar:

```bash
docker compose logs -f api
```

4. Em caso de incidente, restore com arquivo especifico:

```bash
BACKUP_MODULE_ROOT=/srv/backup-module /srv/backup-module/scripts/restore.sh /srv/backup-module/storage/backups/backup_YYYY-MM-DD_HH-MM-SS.sql.gz
```
