import { BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes } from 'crypto'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { AdminRoleGuard } from '../auth/guard/admin-role.guard'
import { AuthTokenGuard } from '../auth/guard/auth-token-guard'
import { PrismaService } from '../prisma/prisma.service'
import { GruposController } from './grupos.controller'
import { GruposService } from './grupos.service'

const jwtSecret = randomBytes(32).toString('hex')
const jwtAudience = 'vca-news-tests'
const jwtIssuer = 'vca-news-tests'
const route = '/grupos/1/importar-integrantes'
const xlsxMime =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function createWorkbook(bookType: 'xlsx' | 'biff8'): Buffer {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['nome', 'email', 'telefone'],
    ['Ana Teste', 'ana@example.test', '71999990000'],
  ])
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Integrantes')
  return XLSX.write(workbook, { type: 'buffer', bookType }) as Buffer
}

describe('POST /grupos/:id/importar-integrantes security', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>
  let jwtService: JwtService
  let gruposService: { importarIntegrantes: jest.Mock }
  let prisma: { user: { findUnique: jest.Mock } }

  beforeAll(async () => {
    gruposService = {
      importarIntegrantes: jest.fn().mockResolvedValue({
        totalLinhas: 1,
        inseridos: 1,
        erros: [],
      }),
    }
    prisma = {
      user: {
        findUnique: jest.fn(async ({ where }: { where: { id: number } }) =>
          where.id === 7
            ? { active: true, role: 'admin' }
            : { active: true, role: 'editor' },
        ),
      },
    }

    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: jwtSecret,
          signOptions: { audience: jwtAudience, issuer: jwtIssuer },
        }),
      ],
      controllers: [GruposController],
      providers: [
        AuthTokenGuard,
        AdminRoleGuard,
        { provide: GruposService, useValue: gruposService },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                JWT_SECRET: jwtSecret,
                JWT_TOKEN_AUDIENCE: jwtAudience,
                JWT_TOKEN_ISSUER: jwtIssuer,
              })[key],
          },
        },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
    jwtService = moduleRef.get(JwtService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    gruposService.importarIntegrantes.mockResolvedValue({
      totalLinhas: 1,
      inseridos: 1,
      erros: [],
    })
  })

  async function tokenFor(userId: number): Promise<string> {
    return jwtService.signAsync({ sub: userId })
  }

  it('rejects requests without a bearer token', async () => {
    await request(app.getHttpServer())
      .post(route)
      .expect(401)

    expect(gruposService.importarIntegrantes).not.toHaveBeenCalled()
  })

  it('rejects authenticated users without the admin role', async () => {
    const token = await tokenFor(8)

    await request(app.getHttpServer())
      .post(route)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(gruposService.importarIntegrantes).not.toHaveBeenCalled()
  })

  it('accepts an admin upload with the existing CSV contract', async () => {
    const token = await tokenFor(7)
    const csv = Buffer.from('nome,email\nAna Teste,ana@example.test\n')

    await request(app.getHttpServer())
      .post(route)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', csv, {
        filename: 'integrantes.csv',
        contentType: 'text/csv',
      })
      .expect(201)

    expect(gruposService.importarIntegrantes).toHaveBeenCalledWith(1, csv)
  })

  it('rejects unsupported upload types', async () => {
    const token = await tokenFor(7)

    await request(app.getHttpServer())
      .post(route)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not a spreadsheet'), {
        filename: 'integrantes.txt',
        contentType: 'text/plain',
      })
      .expect(400)

    expect(gruposService.importarIntegrantes).not.toHaveBeenCalled()
  })

  it('rejects an XLSX filename whose content is not a ZIP workbook', async () => {
    const token = await tokenFor(7)

    await request(app.getHttpServer())
      .post(route)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not a zip workbook'), {
        filename: 'integrantes.xlsx',
        contentType: xlsxMime,
      })
      .expect(400)

    expect(gruposService.importarIntegrantes).not.toHaveBeenCalled()
  })
})

describe('GruposService spreadsheet compatibility', () => {
  let service: GruposService
  let prisma: {
    grupo: { findUnique: jest.Mock }
    grupoIntegrante: { create: jest.Mock }
  }

  beforeEach(() => {
    prisma = {
      grupo: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, ativo: true }),
      },
      grupoIntegrante: {
        create: jest.fn().mockResolvedValue({ id: 25 }),
      },
    }
    service = new GruposService(prisma as unknown as PrismaService)
  })

  it.each([
    ['.xlsx', () => createWorkbook('xlsx')],
    ['.xls', () => createWorkbook('biff8')],
    [
      '.csv',
      () => Buffer.from('nome,email\nAna Teste,ana@example.test\n'),
    ],
  ])('imports the existing %s spreadsheet format', async (_extension, makeFile) => {
    await expect(service.importarIntegrantes(1, makeFile())).resolves.toEqual({
      totalLinhas: 1,
      inseridos: 1,
      erros: [],
    })
    expect(prisma.grupoIntegrante.create).toHaveBeenCalledTimes(1)
    expect(prisma.grupoIntegrante.create).toHaveBeenCalledWith({
      data: {
        grupoId: 1,
        nome: 'Ana Teste',
        telefone: _extension === '.csv' ? undefined : '71999990000',
        email: 'ana@example.test',
        ativo: true,
      },
    })
  })

  it('returns a client error for malformed workbook bytes', async () => {
    await expect(
      service.importarIntegrantes(1, Buffer.from('not a workbook')),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
