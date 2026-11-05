import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BetaAnalyticsDataClient, protos } from '@google-analytics/data'
import { PrismaService } from '../prisma/prisma.service'

type ReportRequest = protos.google.analytics.data.v1beta.IRunReportRequest
type FilterExpression = protos.google.analytics.data.v1beta.IFilterExpression
type ReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse

export type Linha = { d: string[]; m: number[] }

type DataClient = Pick<BetaAnalyticsDataClient, 'runReport' | 'runRealtimeReport'>

const CACHE_AUDIENCIA_MS = 15 * 60 * 1000
const CACHE_TEMPO_REAL_MS = 60 * 1000
const MAX_DIAS = 400
const CONCORRENCIA = 4

// Eventos enviados pelo blog (src/utils/analytics.js) e pela medição otimizada do GA4.
const EVENTOS_ENGAJAMENTO = ['article_view', 'article_read', 'share', 'search', 'filter_category', 'select_content', 'click', 'file_download']

const CAMPANHAS_IGNORADAS = ['(not set)', '(direct)', '(organic)', '(referral)', '(none)', '']

const MS_DIA = 24 * 60 * 60 * 1000

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
const toIso = (date: Date) => date.toISOString().slice(0, 10)
const num = (value?: string | null) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function periodoAnterior(inicio: string, fim: string) {
  const dias = Math.round((toDate(fim).getTime() - toDate(inicio).getTime()) / MS_DIA) + 1
  const anteriorFim = new Date(toDate(inicio).getTime() - MS_DIA)
  const anteriorInicio = new Date(anteriorFim.getTime() - (dias - 1) * MS_DIA)
  return { dias, anteriorInicio: toIso(anteriorInicio), anteriorFim: toIso(anteriorFim) }
}

export function linhas(response?: ReportResponse | null): Linha[] {
  return (response?.rows || []).map(row => ({
    d: (row.dimensionValues || []).map(v => v.value ?? ''),
    m: (row.metricValues || []).map(v => num(v.value)),
  }))
}

const filtroCampo = (fieldName: string, value: string, matchType: 'EXACT' | 'BEGINS_WITH' = 'EXACT'): FilterExpression => ({
  filter: { fieldName, stringFilter: { matchType, value } },
})
const filtroLista = (fieldName: string, values: string[]): FilterExpression => ({
  filter: { fieldName, inListFilter: { values } },
})
const nao = (expression: FilterExpression): FilterExpression => ({ notExpression: expression })
const todos = (...expressions: FilterExpression[]): FilterExpression => ({ andGroup: { expressions } })

const FILTRO_NOTICIAS = todos(
  filtroCampo('pagePath', '/noticia/', 'BEGINS_WITH'),
  nao(filtroCampo('pagePath', '/noticia/admin', 'BEGINS_WITH')),
)

const idDaNoticia = (path: string) => {
  const match = /^\/noticia\/(\d+)/.exec(path || '')
  return match ? Number(match[1]) : null
}

// Mensagens em português para os erros mais comuns da API do Google.
function descreverErro(error: any): string {
  const code = error?.code
  if (code === 7) return 'A conta de serviço não tem acesso à propriedade do GA4. Adicione o e-mail dela como Leitor.'
  if (code === 16) return 'Credencial do Google inválida ou expirada.'
  if (code === 8) return 'Cota diária da API do Google Analytics esgotada. Tente novamente mais tarde.'
  if (code === 3) return `Consulta recusada pelo GA4: ${error?.details || error?.message || 'parâmetro inválido'}`
  if (code === 5) return 'Propriedade do GA4 não encontrada. Confira o GA4_PROPERTY_ID.'
  return error?.message || 'Erro desconhecido ao consultar o Google Analytics.'
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)
  private readonly cache = new Map<string, { expira: number; valor: unknown }>()
  private client: DataClient | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ---------- configuração ----------

  private credenciais(): { client_email?: string; private_key?: string; project_id?: string } | null {
    const raw = (this.config.get<string>('GA4_CREDENTIALS_JSON') || '').trim()
    if (!raw) return null
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    try {
      const parsed = JSON.parse(json)
      if (parsed.private_key) parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n')
      return parsed
    } catch {
      this.logger.error('GA4_CREDENTIALS_JSON não é um JSON válido (nem em base64).')
      return null
    }
  }

  status() {
    const propertyId = (this.config.get<string>('GA4_PROPERTY_ID') || '').trim()
    const credenciais = this.credenciais()
    const usaArquivo = !!this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')
    const faltando: string[] = []
    if (!/^\d+$/.test(propertyId)) faltando.push('GA4_PROPERTY_ID')
    if (!credenciais && !usaArquivo) faltando.push('GA4_CREDENTIALS_JSON')
    return {
      configurado: faltando.length === 0,
      faltando,
      contaServico: credenciais?.client_email || null,
    }
  }

  private get property() {
    return `properties/${(this.config.get<string>('GA4_PROPERTY_ID') || '').trim()}`
  }

  // Permite injetar um cliente falso nos testes.
  setClient(client: DataClient) {
    this.client = client
  }

  private getClient(): DataClient {
    if (this.client) return this.client
    const credenciais = this.credenciais()
    this.client = credenciais
      ? new BetaAnalyticsDataClient({
          credentials: { client_email: credenciais.client_email, private_key: credenciais.private_key },
          projectId: credenciais.project_id,
        })
      : new BetaAnalyticsDataClient()
    return this.client
  }

  private async cached<T>(chave: string, ttl: number, gerar: () => Promise<T>): Promise<T> {
    const agora = Date.now()
    const hit = this.cache.get(chave)
    if (hit && hit.expira > agora) return hit.valor as T
    const valor = await gerar()
    this.cache.set(chave, { expira: agora + ttl, valor })
    if (this.cache.size > 50) {
      for (const [k, v] of this.cache) if (v.expira <= agora) this.cache.delete(k)
    }
    return valor
  }

  // ---------- audiência ----------

  validarPeriodo(inicio: string, fim: string) {
    const ini = toDate(inicio)
    const end = toDate(fim)
    if (isNaN(ini.getTime()) || isNaN(end.getTime())) throw new BadRequestException('Datas inválidas.')
    if (ini > end) throw new BadRequestException('O início do período deve ser anterior ao fim.')
    const hoje = toDate(toIso(new Date()))
    if (end > hoje) throw new BadRequestException('O período não pode terminar no futuro.')
    const dias = Math.round((end.getTime() - ini.getTime()) / MS_DIA) + 1
    if (dias > MAX_DIAS) throw new BadRequestException(`O período pode ter no máximo ${MAX_DIAS} dias.`)
  }

  async audiencia(inicio: string, fim: string) {
    const status = this.status()
    if (!status.configurado) return status

    this.validarPeriodo(inicio, fim)
    return this.cached(`audiencia:${inicio}:${fim}`, CACHE_AUDIENCIA_MS, () => this.montarAudiencia(inicio, fim))
  }

  private async montarAudiencia(inicio: string, fim: string) {
    const { dias, anteriorInicio, anteriorFim } = periodoAnterior(inicio, fim)
    const atual = { startDate: inicio, endDate: fim, name: 'atual' }
    const anterior = { startDate: anteriorInicio, endDate: anteriorFim, name: 'anterior' }
    const evento = (nome: string) => filtroCampo('eventName', nome)

    const pedidos: Record<string, ReportRequest> = {
      resumo: {
        dateRanges: [atual, anterior],
        metrics: ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'userEngagementDuration'].map(name => ({ name })),
      },
      eventos: {
        dateRanges: [atual, anterior],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: filtroLista('eventName', EVENTOS_ENGAJAMENTO),
      },
      serie: {
        dateRanges: [atual],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: MAX_DIAS,
      },
      paginas: {
        dateRanges: [atual],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'userEngagementDuration' }],
        dimensionFilter: FILTRO_NOTICIAS,
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 1000,
      },
      leituras: {
        dateRanges: [atual],
        dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: todos(FILTRO_NOTICIAS, filtroLista('eventName', ['article_view', 'article_read', 'share'])),
        limit: 3000,
      },
      canais: {
        dateRanges: [atual],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      },
      origens: {
        dateRanges: [atual],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      },
      campanhas: {
        dateRanges: [atual],
        dimensions: [{ name: 'sessionCampaignName' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        dimensionFilter: nao(filtroLista('sessionCampaignName', CAMPANHAS_IGNORADAS)),
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      },
      dispositivos: {
        dateRanges: [atual],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      },
      publico: {
        dateRanges: [atual],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }],
      },
      cidades: {
        dateRanges: [atual],
        dimensions: [{ name: 'city' }, { name: 'region' }],
        metrics: [{ name: 'activeUsers' }],
        dimensionFilter: nao(filtroCampo('city', '(not set)')),
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      },
      horarios: {
        dateRanges: [atual],
        dimensions: [{ name: 'dayOfWeek' }, { name: 'hour' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 200,
      },
      entradas: {
        dateRanges: [atual],
        dimensions: [{ name: 'landingPage' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: nao(filtroCampo('landingPage', '(not set)')),
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      },
      buscas: {
        dateRanges: [atual],
        dimensions: [{ name: 'searchTerm' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: todos(evento('search'), nao(filtroLista('searchTerm', ['(not set)', '']))),
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 15,
      },
      saidas: {
        dateRanges: [atual],
        dimensions: [{ name: 'linkDomain' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: todos(evento('click'), nao(filtroLista('linkDomain', ['(not set)', '']))),
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 10,
      },
      downloads: {
        dateRanges: [atual],
        dimensions: [{ name: 'fileName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: todos(evento('file_download'), nao(filtroLista('fileName', ['(not set)', '']))),
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 10,
      },
      // Depende da dimensão personalizada "list_name" registrada no GA4.
      secoes: {
        dateRanges: [atual],
        dimensions: [{ name: 'customEvent:list_name' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: evento('select_content'),
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      },
    }

    const avisos: { relatorio: string; mensagem: string }[] = []
    const resultados = await this.executar(pedidos, avisos)

    if (!resultados.resumo) {
      const erro = avisos.find(a => a.relatorio === 'resumo')
      throw new ServiceUnavailableException(erro?.mensagem || 'Não foi possível consultar o Google Analytics.')
    }

    const r = (nome: string) => resultados[nome] || []
    const porRange = (rows: Linha[], range: string) => rows.find(l => l.d[l.d.length - 1] === range)?.m || []

    const kpis = (m: number[]) => ({
      usuarios: m[0] || 0,
      novosUsuarios: m[1] || 0,
      sessoes: m[2] || 0,
      visualizacoes: m[3] || 0,
      taxaEngajamento: m[4] || 0,
      tempoMedioEngajamento: m[0] ? (m[5] || 0) / m[0] : 0,
    })

    const contagemEventos = (range: string) => Object.fromEntries(
      EVENTOS_ENGAJAMENTO.map(nome => [nome, r('eventos').find(l => l.d[0] === nome && l.d[1] === range)?.m[0] || 0]),
    )

    const { noticias, categorias } = await this.montarNoticias(r('paginas'), r('leituras'))
    const titulos = new Map(noticias.map(n => [n.id, n.titulo]))
    const titulosEntradas = await this.titulosPorCaminho(r('entradas').map(l => l.d[0]), titulos)

    return {
      configurado: true,
      periodo: { inicio, fim, dias, anteriorInicio, anteriorFim },
      atualizadoEm: new Date().toISOString(),
      resumo: {
        atual: kpis(porRange(r('resumo'), 'atual')),
        anterior: kpis(porRange(r('resumo'), 'anterior')),
      },
      eventos: resultados.eventos ? { atual: contagemEventos('atual'), anterior: contagemEventos('anterior') } : null,
      serie: this.completarSerie(r('serie'), inicio, fim),
      noticias,
      categorias,
      canais: r('canais').map(l => ({ canal: l.d[0], sessoes: l.m[0], usuarios: l.m[1], taxaEngajamento: l.m[2] })),
      origens: r('origens').map(l => ({ origem: l.d[0], midia: l.d[1], sessoes: l.m[0] })),
      campanhas: r('campanhas').map(l => ({ nome: l.d[0], sessoes: l.m[0], usuarios: l.m[1] })),
      dispositivos: r('dispositivos').map(l => ({ tipo: l.d[0], usuarios: l.m[0] })),
      publico: {
        novos: r('publico').find(l => l.d[0] === 'new')?.m[0] || 0,
        recorrentes: r('publico').find(l => l.d[0] === 'returning')?.m[0] || 0,
      },
      cidades: r('cidades').map(l => ({ cidade: l.d[0], regiao: l.d[1], usuarios: l.m[0] })),
      // dayOfWeek do GA4: 0 = domingo ... 6 = sábado
      horarios: r('horarios').map(l => ({ dia: num(l.d[0]), hora: num(l.d[1]), visualizacoes: l.m[0] })),
      entradas: r('entradas').map(l => ({ pagina: l.d[0], titulo: titulosEntradas.get(l.d[0]) || null, sessoes: l.m[0] })),
      buscas: r('buscas').map(l => ({ termo: l.d[0], vezes: l.m[0] })),
      saidas: r('saidas').map(l => ({ dominio: l.d[0], cliques: l.m[0] })),
      downloads: r('downloads').map(l => ({ arquivo: l.d[0], downloads: l.m[0] })),
      secoes: resultados.secoes ? r('secoes').map(l => ({ secao: l.d[0], cliques: l.m[0] })) : null,
      avisos,
    }
  }

  // Executa os relatórios em paralelo (limitado), isolando falhas: um relatório
  // recusado (ex.: dimensão personalizada ainda não registrada) não derruba os demais.
  private async executar(pedidos: Record<string, ReportRequest>, avisos: { relatorio: string; mensagem: string }[]) {
    const client = this.getClient()
    const nomes = Object.keys(pedidos)
    const resultados: Record<string, Linha[] | null> = {}
    let indice = 0

    const trabalhador = async () => {
      while (indice < nomes.length) {
        const nome = nomes[indice++]
        try {
          const [response] = await client.runReport({ property: this.property, ...pedidos[nome] })
          resultados[nome] = linhas(response)
        } catch (error) {
          resultados[nome] = null
          const mensagem = descreverErro(error)
          avisos.push({ relatorio: nome, mensagem })
          this.logger.warn(`Relatório ${nome}: ${mensagem}`)
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, nomes.length) }, trabalhador))
    return resultados
  }

  private completarSerie(rows: Linha[], inicio: string, fim: string) {
    const porData = new Map(rows.map(l => [l.d[0], l.m]))
    const serie: { data: string; usuarios: number; sessoes: number; visualizacoes: number }[] = []
    for (let t = toDate(inicio).getTime(); t <= toDate(fim).getTime(); t += MS_DIA) {
      const iso = toIso(new Date(t))
      const m = porData.get(iso.replace(/-/g, '')) || []
      serie.push({ data: iso, usuarios: m[0] || 0, sessoes: m[1] || 0, visualizacoes: m[2] || 0 })
    }
    return serie
  }

  private async montarNoticias(paginas: Linha[], leituras: Linha[]) {
    type Acumulado = { visualizacoes: number; usuarios: number; engajamento: number; aberturas: number; leituras: number; compartilhamentos: number }
    const porId = new Map<number, Acumulado>()
    const acumulado = (id: number) => {
      if (!porId.has(id)) porId.set(id, { visualizacoes: 0, usuarios: 0, engajamento: 0, aberturas: 0, leituras: 0, compartilhamentos: 0 })
      return porId.get(id)!
    }

    paginas.forEach(l => {
      const id = idDaNoticia(l.d[0])
      if (!id) return
      const a = acumulado(id)
      a.visualizacoes += l.m[0]
      a.usuarios += l.m[1]
      a.engajamento += l.m[2]
    })
    leituras.forEach(l => {
      const id = idDaNoticia(l.d[0])
      if (!id) return
      const a = acumulado(id)
      if (l.d[1] === 'article_view') a.aberturas += l.m[0]
      if (l.d[1] === 'article_read') a.leituras += l.m[0]
      if (l.d[1] === 'share') a.compartilhamentos += l.m[0]
    })

    const ids = [...porId.keys()]
    const posts = ids.length
      ? await this.prisma.post.findMany({
          where: { id: { in: ids } },
          select: { id: true, titulo: true, imagem: true, criadoEm: true, categoria: { select: { nome: true } } },
        })
      : []
    const postsPorId = new Map(posts.map(p => [p.id, p]))

    const noticias = ids
      .map(id => {
        const a = porId.get(id)!
        const post = postsPorId.get(id)
        return {
          id,
          titulo: post?.titulo || `Notícia #${id} (removida)`,
          categoria: post?.categoria?.nome || null,
          imagem: post?.imagem || null,
          publicadoEm: post?.criadoEm?.toISOString() || null,
          visualizacoes: a.visualizacoes,
          usuarios: a.usuarios,
          tempoMedio: a.usuarios ? a.engajamento / a.usuarios : 0,
          aberturas: a.aberturas,
          leituras: a.leituras,
          taxaLeitura: a.aberturas ? Math.min(1, a.leituras / a.aberturas) : null,
          compartilhamentos: a.compartilhamentos,
        }
      })
      .sort((x, y) => y.visualizacoes - x.visualizacoes)

    const categoriasMap = new Map<string, { nome: string; visualizacoes: number; noticias: number }>()
    noticias.forEach(n => {
      const nome = n.categoria || 'Sem categoria'
      const c = categoriasMap.get(nome) || { nome, visualizacoes: 0, noticias: 0 }
      c.visualizacoes += n.visualizacoes
      c.noticias += 1
      categoriasMap.set(nome, c)
    })

    return {
      noticias: noticias.slice(0, 50),
      categorias: [...categoriasMap.values()].sort((x, y) => y.visualizacoes - x.visualizacoes),
    }
  }

  private async titulosPorCaminho(caminhos: string[], conhecidos: Map<number, string>) {
    const resultado = new Map<string, string>()
    const faltando: number[] = []
    caminhos.forEach(caminho => {
      if (caminho === '/') resultado.set(caminho, 'Página inicial')
      const id = idDaNoticia(caminho)
      if (id && conhecidos.has(id)) resultado.set(caminho, conhecidos.get(id)!)
      else if (id) faltando.push(id)
    })
    if (faltando.length) {
      const posts = await this.prisma.post.findMany({ where: { id: { in: faltando } }, select: { id: true, titulo: true } })
      const porId = new Map(posts.map(p => [p.id, p.titulo]))
      caminhos.forEach(caminho => {
        const id = idDaNoticia(caminho)
        if (id && porId.has(id)) resultado.set(caminho, porId.get(id)!)
      })
    }
    return resultado
  }

  // ---------- tempo real ----------

  async tempoReal() {
    const status = this.status()
    if (!status.configurado) return status

    return this.cached('tempo-real', CACHE_TEMPO_REAL_MS, async () => {
      const client = this.getClient()
      try {
        const [[total], [paginas]] = await Promise.all([
          client.runRealtimeReport({ property: this.property, metrics: [{ name: 'activeUsers' }] }),
          client.runRealtimeReport({
            property: this.property,
            dimensions: [{ name: 'unifiedScreenName' }],
            metrics: [{ name: 'activeUsers' }],
            limit: 5,
          }),
        ])
        return {
          configurado: true,
          atualizadoEm: new Date().toISOString(),
          usuariosAtivos: linhas(total)[0]?.m[0] || 0,
          paginas: linhas(paginas).map(l => ({ titulo: l.d[0], usuarios: l.m[0] })),
        }
      } catch (error) {
        throw new ServiceUnavailableException(descreverErro(error))
      }
    })
  }
}
