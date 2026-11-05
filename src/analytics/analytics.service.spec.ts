import { ServiceUnavailableException } from '@nestjs/common'
import { AnalyticsService, periodoAnterior } from './analytics.service'

const row = (dims: string[], mets: number[]) => ({
  dimensionValues: dims.map(value => ({ value })),
  metricValues: mets.map(value => ({ value: String(value) })),
})

// Respostas no formato da API de dados do GA4, escolhidas pela primeira dimensão pedida.
function fakeClient(overrides: Record<string, unknown> = {}) {
  const responses: Record<string, unknown> = {
    resumo: { rows: [row(['atual'], [120, 80, 150, 400, 0.62, 6000]), row(['anterior'], [100, 70, 130, 300, 0.5, 4000])] },
    eventName: { rows: [row(['article_read', 'atual'], [30]), row(['article_read', 'anterior'], [20]), row(['share', 'atual'], [4])] },
    date: { rows: [row(['20261002'], [10, 12, 40])] },
    pagePath: { rows: [row(['/noticia/141'], [200, 90, 5400]), row(['/noticia/9999'], [10, 5, 50]), row(['/noticia/141'], [20, 10, 600])] },
    'pagePath+eventName': {
      rows: [row(['/noticia/141', 'article_view'], [100]), row(['/noticia/141', 'article_read'], [40]), row(['/noticia/141', 'share'], [3])],
    },
    sessionDefaultChannelGroup: { rows: [row(['Organic Search'], [70, 60, 0.7])] },
    deviceCategory: { rows: [row(['mobile'], [90]), row(['desktop'], [30])] },
    newVsReturning: { rows: [row(['new'], [80]), row(['returning'], [40])] },
    dayOfWeek: { rows: [row(['1', '9'], [25])] },
    landingPage: { rows: [row(['/'], [50]), row(['/noticia/141'], [20])] },
    ...overrides,
  }
  return {
    runReport: jest.fn(async (request: any) => {
      const dims = (request.dimensions || []).map((d: any) => d.name)
      const key = dims.length === 0 ? 'resumo' : dims.length === 2 && dims[0] === 'pagePath' ? 'pagePath+eventName' : dims[0]
      const response = responses[key]
      if (response instanceof Error) throw response
      return [response || { rows: [] }]
    }),
    runRealtimeReport: jest.fn(async () => [{ rows: [row([], [7])] }]),
  }
}

function makeService(env: Record<string, string> = { GA4_PROPERTY_ID: '123456', GA4_CREDENTIALS_JSON: '{"client_email":"leitor@projeto.iam.gserviceaccount.com","private_key":"x"}' }) {
  const prisma = {
    post: {
      findMany: jest.fn(async () => [
        { id: 141, titulo: 'Capacete de Ouro', imagem: 'a.png', criadoEm: new Date('2026-10-01T16:42:00Z'), categoria: { nome: 'Institucional' } },
      ]),
    },
  }
  const config = { get: (key: string) => env[key] }
  return new AnalyticsService(prisma as any, config as any)
}

describe('periodoAnterior', () => {
  it('usa o mesmo número de dias, imediatamente antes', () => {
    expect(periodoAnterior('2026-10-01', '2026-10-28')).toEqual({ dias: 28, anteriorInicio: '2026-09-03', anteriorFim: '2026-09-30' })
  })
})

describe('AnalyticsService', () => {
  it('informa o que falta configurar', async () => {
    const service = makeService({})
    expect(service.status()).toEqual({ configurado: false, faltando: ['GA4_PROPERTY_ID', 'GA4_CREDENTIALS_JSON'], contaServico: null })
    expect(await service.audiencia('2026-10-01', '2026-10-28')).toMatchObject({ configurado: false })
  })

  it('mostra o e-mail da conta de serviço para liberar o acesso no GA4', () => {
    expect(makeService().status().contaServico).toBe('leitor@projeto.iam.gserviceaccount.com')
  })

  it('monta KPIs, notícias e categorias, isolando relatórios que falham', async () => {
    const service = makeService()
    const erroDimensao = Object.assign(new Error('Field customEvent:list_name is not a valid dimension'), { code: 3 })
    service.setClient(fakeClient({ 'customEvent:list_name': erroDimensao }) as any)

    const dados: any = await service.audiencia('2026-10-01', '2026-10-28')

    expect(dados.resumo.atual).toEqual({ usuarios: 120, novosUsuarios: 80, sessoes: 150, visualizacoes: 400, taxaEngajamento: 0.62, tempoMedioEngajamento: 50 })
    expect(dados.resumo.anterior.usuarios).toBe(100)
    expect(dados.eventos.atual.article_read).toBe(30)
    expect(dados.eventos.anterior.article_read).toBe(20)
    expect(dados.eventos.atual.search).toBe(0)

    expect(dados.serie).toHaveLength(28)
    expect(dados.serie[1]).toEqual({ data: '2026-10-02', usuarios: 10, sessoes: 12, visualizacoes: 40 })

    // Duas linhas do mesmo caminho somadas; notícia sem cadastro marcada como removida.
    expect(dados.noticias[0]).toMatchObject({ id: 141, titulo: 'Capacete de Ouro', categoria: 'Institucional', visualizacoes: 220, usuarios: 100, tempoMedio: 60, taxaLeitura: 0.4, compartilhamentos: 3 })
    expect(dados.noticias[1]).toMatchObject({ id: 9999, titulo: 'Notícia #9999 (removida)', taxaLeitura: null })
    expect(dados.categorias[0]).toEqual({ nome: 'Institucional', visualizacoes: 220, noticias: 1 })

    expect(dados.entradas).toEqual([{ pagina: '/', titulo: 'Página inicial', sessoes: 50 }, { pagina: '/noticia/141', titulo: 'Capacete de Ouro', sessoes: 20 }])
    expect(dados.publico).toEqual({ novos: 80, recorrentes: 40 })
    expect(dados.horarios).toEqual([{ dia: 1, hora: 9, visualizacoes: 25 }])

    expect(dados.secoes).toBeNull()
    expect(dados.avisos).toEqual([{ relatorio: 'secoes', mensagem: expect.stringContaining('customEvent:list_name') }])
  })

  it('falha com mensagem clara quando o resumo é recusado', async () => {
    const service = makeService()
    service.setClient(fakeClient({ resumo: Object.assign(new Error('denied'), { code: 7 }) }) as any)
    await expect(service.audiencia('2026-10-01', '2026-10-28')).rejects.toThrow(ServiceUnavailableException)
    await expect(service.audiencia('2026-10-01', '2026-10-28')).rejects.toThrow(/Leitor/)
  })

  it('usa cache para o mesmo período', async () => {
    const service = makeService()
    const client = fakeClient()
    service.setClient(client as any)
    await service.audiencia('2026-10-01', '2026-10-28')
    const chamadas = client.runReport.mock.calls.length
    await service.audiencia('2026-10-01', '2026-10-28')
    expect(client.runReport.mock.calls.length).toBe(chamadas)
  })

  it('recusa períodos inválidos', async () => {
    const service = makeService()
    service.setClient(fakeClient() as any)
    await expect(service.audiencia('2026-10-28', '2026-10-01')).rejects.toThrow(/anterior ao fim/)
    await expect(service.audiencia('2024-01-01', '2026-10-28')).rejects.toThrow(/no máximo/)
  })

  it('retorna as pessoas no site agora', async () => {
    const service = makeService()
    service.setClient(fakeClient() as any)
    expect(await service.tempoReal()).toMatchObject({ configurado: true, usuariosAtivos: 7 })
  })
})
