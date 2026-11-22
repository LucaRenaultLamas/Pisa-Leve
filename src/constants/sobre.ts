export type ItemSobre = {
  titulo: string;
  detalhe?: string; // rota ou arquivo, em fonte mono
  texto: string;
  passos?: string[]; // aparecem numerados, um por linha
};

export type ParteSobre = {
  id: string;
  rotulo: string;
  intro: string;
  itens: ItemSobre[];
};

export const PARTES_SOBRE: ParteSobre[] = [
  {
    id: 'telas',
    rotulo: 'Telas',
    intro:
      'O Pisa Leve mostra animais peçonhentos e ligados às suas alergias registrados perto de você e nas trilhas da região.',
    itens: [
      {
        titulo: 'Entrar e Criar conta',
        detalhe: '/login · /registrar',
        texto:
          'Conta salva no aparelho, com senha guardada só como hash (SHA-256 + sal). Mostra a força da senha, confere se o usuário está livre e tem "Manter conectado".',
      },
      {
        titulo: 'Alergias',
        detalhe: '/onboarding (popup)',
        texto:
          'Abre no 1º login. As alergias marcadas (abelhas, formigas, ácaros...) entram nos avisos, no risco das trilhas e nos alertas. Dá para pular e editar depois no Perfil.',
      },
      {
        titulo: 'Explorar',
        detalhe: '/ (aba)',
        texto:
          'Mapa com os avistamentos recentes perto de você, com a foto do animal no pino. Filtros de raio, grupo, risco e período, aviso de alergias e carrossel de cartões. Tocar abre o detalhe do animal.',
      },
      {
        titulo: 'Trilhas',
        detalhe: '/trilhas (aba)',
        texto:
          'Trilhas perto de você ou nas 5 cidades mais próximas que têm trilha. Cada trilha é cortada em trechos de ~500 m: trecho com peçonhento é risco alto, com alergia é médio. Busca, filtros e favoritas.',
      },
      {
        titulo: 'Detalhe da trilha',
        detalhe: '/trilha/[id]',
        texto:
          'Mapa com o caminho tracejado na cor do risco de cada trecho, os registros perto dele e o botão "Monitorar esta trilha".',
      },
      {
        titulo: 'Buscar animais',
        detalhe: '/busca (aba)',
        texto:
          'Busca por nome popular ou científico. Com o campo vazio, lista os animais que pedem cuidado perto de você. Guarda as buscas recentes.',
      },
      {
        titulo: 'Detalhe do animal',
        detalhe: '/animal/[id]',
        texto:
          'Fotos, data, horário e local do avistamento, orientações de segurança do Ministério da Saúde e do Butantan e o botão "ligar SAMU 192". Dá para salvar o animal.',
      },
      {
        titulo: 'Alertas',
        detalhe: '/alertas (aba) · /alertas/local/[id] · /alertas/salvos',
        texto:
          'Até 10 locais monitorados (casa, trabalho, trilha). O app confere registros novos de peçonhentos e alergias em cada um e mostra o total no sino. Também lista os animais e trilhas salvos.',
      },
      {
        titulo: 'Novo local',
        detalhe: '/local/novo (modal)',
        texto: 'Escolhe o ponto arrastando o mapa, o tipo e o raio (0,5 a 5 km).',
      },
      {
        titulo: 'Perfil',
        detalhe: '/perfil (aba)',
        texto: 'Dados da conta, alergias, números de locais e salvos e o botão de sair.',
      },
    ],
  },
  {
    id: 'apis',
    rotulo: 'APIs',
    intro:
      'Todas as consultas usam o fetch nativo com async/await e ficam em src/services. Cada uma tem tempo limite (AbortController), mensagem de erro em português e estado de carregando na tela.',
    itens: [
      {
        titulo: 'iNaturalist API v1',
        detalhe: 'api.inaturalist.org/v1 · GET',
        texto:
          '/observations (avistamentos no raio, confirmados, locale=pt-BR, período em d1), /observations/{id}, /observations/species_counts ("pedem cuidado"), /taxa/{id}, /taxa/autocomplete (busca) e /places/nearby (nome da cidade).',
      },
      {
        titulo: 'iNaturalist API v2',
        detalhe: 'api.inaturalist.org/v2/observations · GET',
        texto:
          'Risco das trilhas. Com o parâmetro fields= vêm só os campos usados, e a resposta fica muito menor.',
      },
      {
        titulo: 'Overpass API (OpenStreetMap)',
        detalhe: 'POST, 4 servidores',
        texto:
          'Lista completa de trilhas com o desenho. Os servidores públicos são lentos: o app chama um, depois o próximo, fica com a primeira resposta boa e cancela os outros.',
      },
      {
        titulo: 'Nominatim (OpenStreetMap)',
        detalhe: 'nominatim.openstreetmap.org/search · GET',
        texto:
          'Busca rápida de trilhas (aparece em segundos) e contorno dos municípios. Uma fila respeita a regra de 1 pedido por segundo.',
      },
      {
        titulo: 'Recursos do aparelho e mapas',
        detalhe: 'expo-location · react-native-maps',
        texto:
          'Localização com permissão do usuário (sem ela, usa o centro de Juiz de Fora). No celular, react-native-maps; na web, mapa próprio com os tiles do OpenStreetMap.',
      },
      {
        titulo: 'Cache no aparelho',
        detalhe: 'AsyncStorage',
        texto:
          'A lista de trilhas e as cidades com trilha ficam salvas por 7 dias e aparecem na hora, enquanto a versão nova chega.',
      },
    ],
  },
  {
    id: 'avaliacao',
    rotulo: 'Funcionalidades',
    intro: 'Onde encontrar cada requisito do trabalho e como testar.',
    itens: [
      {
        titulo: 'Telas e navegação',
        detalhe: 'src/app',
        texto:
          '13 rotas com Expo Router. Stack na raiz (Stack.Protected separa quem entrou de quem não entrou), abas embaixo (NativeTabs no celular, expo-router/ui na web), Stack dentro de Alertas, modais e rotas dinâmicas [id].',
      },
      {
        titulo: 'Requisições, carregando e erro',
        detalhe: 'src/services',
        texto:
          'fetch em inaturalist.ts, risco.ts, overpass.ts e nominatim.ts. Nas telas: ActivityIndicator, AvisoErro com "Tentar de novo" e puxar para atualizar.',
      },
      {
        titulo: 'Persistência local',
        detalhe: 'AsyncStorage',
        texto:
          'Contas, sessão, alergias, trilhas favoritas, animais salvos, locais monitorados, buscas recentes e cache de trilhas.',
      },
      {
        titulo: 'Hooks e componentes',
        detalhe: 'src/components · src/contexts',
        texto:
          'useState e useEffect em todas as telas, contextos de sessão, favoritas e alertas, e componentes reutilizáveis (BarraFiltros, CartaoTrilha, Botao, PopupConfirmacao...).',
      },
      {
        titulo: 'Layout',
        detalhe: 'StyleSheet · Flexbox',
        texto:
          'Estilos com StyleSheet.create e Flexbox. SafeAreaProvider na raiz e SafeAreaView em cada tela (react-native-safe-area-context).',
      },
      {
        titulo: 'Roteiro de teste',
        texto: 'Um caminho rápido para ver tudo funcionando:',
        passos: [
          'Crie uma conta e marque uma alergia (ex.: Abelhas e vespas).',
          'Permita a localização.',
          'Explorar: troque o raio e o período.',
          'Trilhas: abra uma trilha e veja os trechos.',
          'Buscar: digite "jararaca" e abra um resultado.',
          'Alertas: adicione um local.',
        ],
      },
      {
        titulo: 'Bom saber',
        texto:
          'Os dados são reais e mudam com o tempo e o lugar. O app foi testado em Juiz de Fora (MG). A busca completa de trilhas pode levar até 40 s; a busca rápida mostra uma lista antes. As contas ficam só no aparelho e não há notificação com o app fechado.',
      },
    ],
  },
];
