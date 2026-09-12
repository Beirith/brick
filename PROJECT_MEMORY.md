# Brick — memória de retomada

Atualizado em 12/09/2026. Este arquivo registra contexto recuperado dos arquivos
e da conversa atual; não é uma recuperação da conversa perdida.

## Objetivo e restrições

- Compra investigada na HSK Testnet: a oferta 0 foi criada com 10 cotas e a
  transação `0x1aac80c897e1e35d9b1f53d44bb3d04ce4125a220c381c3346975a031cc13f96`
  comprou 5; as 5 exibidas depois eram o saldo correto, não dados antigos.
- Após compra confirmada, o frontend agora redireciona para
  `/properties/[id]/purchase/success` com quantidade, preço unitário, total,
  confirmação no explorer e botões para portfólio/imóvel. O cache Brick é
  invalidado e recarregado para refletir o saldo atualizado da oferta.

- Verificação posterior da venda por porcentagem: consulta RPC confirmou imóvel
  ID 1, “Apartamento Córrego Grande”, com 10.000 cotas, todas disponíveis na
  carteira informada. 49% corresponde corretamente a 4.900 cotas. Não atribuir
  esse resultado a bug de locale. A tela agora explicita a base, a conversão e
  o saldo restante, exibe erros de quantidade e recalcula a quantidade no envio.
  Casos de 49% sobre 100, 90 e 10.000 cotas cobertos por testes.

- Preferência explícita: aplicação inteiramente em inglês; manter Geist e Geist
  Mono. Não alterar idioma ou remover fontes sem solicitação do usuário.
- EAG Global Buildathon, Florianópolis, 12/09/2026; submissão às 15h.
- Usuário trabalha sozinho e tem menos de um dia para finalizar o MVP.
- Segundo o usuário, é permitido levar projeto pronto.
- Objetivo: MVP de participações imobiliárias, distribuição proporcional de
  aluguel e votação ponderada; preparar também pitch de 3 minutos e perguntas.
- Priorizar entrega demonstrável e evitar inflar o escopo.

## Estado verificado no repositório

- Solidity/Foundry, OpenZeppelin; Node 24 indicado em `.nvmrc`.
- `MockBRL`: moeda fictícia com 6 decimais e emissão pública para demonstração.
- `PropertyToken`: ERC-20 por imóvel, cotas inteiras, oferta fixa definida na
  criação, transferíveis; referências à factory, ao criador e ao ID.
- `PropertyFactory`: cadastro livre, valor inicial e URI de metadados; não
  verifica documentos ou propriedade. Não há atualização de valor implementada.
- `PropertyMarketplace`: anúncios a preço fixo com custódia das cotas,
  compra parcial/total, cancelamento e revenda; pagamento direto ao vendedor.
- `Deploy.s.sol`: publica moeda, factory e marketplace; não cria dados de demo.
- `web/` agora contém Next.js 16, React 19, Wagmi 3 e Viem. Carteira MetaMask
  conectada com sucesso pelo usuário antes da integração abaixo.
- Aluguel não está implementado. A governança foi adicionada posteriormente,
  conforme a seção mais recente deste arquivo. CEP/número/complemento continuam pendentes.
- Nenhum endereço de deployment foi identificado nos arquivos de configuração lidos.
- Verificação em 11/09: 24 testes passaram, zero falhas, incluindo fuzz tests.
  Comando: `/home/isaque.beirith/.foundry/bin/forge test --root contracts`.
  `forge` não está no PATH desta sessão, mas está instalado nesse caminho.
- Alterações preexistentes preservadas: `contracts/README.md` e
  `contracts/script/Deploy.s.sol` modificados; contrato e teste do marketplace
  ainda não rastreados pelo Git. Isso indica trabalho local de marketplace como
  provável ponto de retomada, sem presumir detalhes da conversa perdida.

## Texto do usuário para discutir posteriormente

Pedido explícito: apenas guardar esta ideia por enquanto, sem implementar ou
decidir a estrutura jurídica. O trecho abaixo é uma hipótese do usuário, não
uma conclusão jurídica validada:

> O que eu pensei:
>
> 1 - Podemos abstrair da questão jurídica, mas não sei o quão bom isso será para os jurados.
> ou
> 2 - Podemos abordar o problema da seguinte maneira:
> Criar uma base de apoio para a parte legal (compliance) por meio da criação de um CNPJ (a SPE) e colocar o imóvel no nome dessa empresa. Isso o cartório e a lei brasileira aceitam perfeitamente. Tokenizar as **cotas dessa empresa** na blockchain.
>
> Mas também não sei o quanto isso pode inflar o MVP

## Próximos trabalhos sugeridos, ainda não executados

1. Retomar a integração do marketplace com uma interface e um fluxo demonstrável.
2. Implementar distribuição de aluguel considerando transferências e cotas em
   custódia no marketplace, para não perder direitos econômicos do vendedor.
3. Preparar a demonstração da votação ponderada já implementada.
4. Preparar dados fictícios, execução da demo, pitch e respostas aos jurados.

Rede de implantação, stack do frontend e corte final de funcionalidades ainda
não foram definidos pelo usuário nesta conversa. A hipótese da SPE permanece
pendente e não deve ser tratada como requisito aprovado.

## Estado atual do frontend — refatoração de navegação em 12/09/2026

Esta seção substitui a antiga experiência de página única e deployment no navegador.

- Pedido explícito: produto para leigos, aplicação em inglês, fontes Geist e
  Geist Mono preservadas, laranja + cinza escuro/preto como cores principais.
- Rotas: `/`, `/properties/new`, `/properties/[id]`,
  `/properties/[id]/sell`, `/portfolio`. Header persistente com navegação e wallet.
- Deployment pelo navegador, formulários de endereços, persistência em localStorage
  e bytecode nos assets do frontend removidos. Deployment deve ser feito pelo
  desenvolvedor usando Foundry antes de usar o produto.
- Frontend lê apenas NEXT_PUBLIC_MOCK_BRL_ADDRESS,
  NEXT_PUBLIC_PROPERTY_FACTORY_ADDRESS e NEXT_PUBLIC_PROPERTY_MARKETPLACE_ADDRESS.
- HSK Testnet apenas, ID 133. Sem fundos reais. Portfolio permite mint de mBRL.
- Cadastro recebe nome, valor e cotas; calcula referência e redireciona pelo ID
  do evento PropertyCreated confirmado. Compra/venda mantêm as duas transações
  existentes com progresso em linguagem de produto e confirmação por recibo.
- Portfolio inclui cotas reservadas para venda no total/percentual, separando
  saldo disponível, reservado e ofertas ativas canceláveis.
- Componentes: SiteHeader, ConnectWallet, Transactions, DataBoundary, ui,
  Marketplace, Portfolio e componentes em components/properties.
- Leitura compartilhada em lib/brick.ts e hooks/useBrick.ts; sem truncar resultados
  em 30 registros. Consultas em lotes de oito; sem indexador/paginação por enquanto.
- Design tokens semânticos em globals.css, componentes visuais compartilhados,
  foco de teclado, skip link, reduced motion e mensagens de transação acessíveis.
- Verificado: lint, TypeScript, build com as cinco rotas e quatro testes de
  precisão/validação de valores. Chrome desktop (1280px) e mobile (390px): todas
  as rotas renderizam, header presente, idioma/fontes corretos, sem overflow ou
  controles de deployment. Verificação de navegador feita sem carteira e sem
  endereços configurados; compra com MetaMask nas novas telas ainda não exercitada.
- Na refatoração descrita acima os contratos ainda não haviam sido alterados; a
  governança foi implementada na etapa posterior registrada abaixo.
- Localização opcional somente via JSON inline; cadastro não coleta localização
  ou fotos. Histórico completo de ofertas/transações ainda não implementado.
- Documentação atual em web/README.md. A hipótese jurídica/SPE continua pendente.

## Configuração recuperada da HSK Testnet

- Criado `web/.env.local` com os três endereços públicos, ignorado pelo Git.
- MockBRL: `0x7562303577ba9144e4be9588e608535b702a02ba`.
- PropertyFactory: `0x45326872fd350c3c209b7bd71fc062760d1d45df`.
- PropertyMarketplace: `0x064c4aa257235fc923aff9c24c7961e80e154ac4`.
- Verificados via RPC: chain ID 133, vínculos factory/currency do marketplace,
  moeda Mock Brazilian Real / mBRL / 6 decimais. Cadastro e marketplace tinham
  um imóvel e uma oferta registrada na consulta (não implica oferta ativa).
- Usuário deve reiniciar `npm run dev` para carregar a configuração; se usar
  build de produção, refazer build antes de iniciar. Nenhuma transação enviada.


## Ajuste de venda e valor — 12/09/2026

- Campo `Property value` em `/properties/new` agora exibe separadores de milhar
  com pontos (ex.: `500.000`) enquanto digita; o parser remove os pontos antes
  de converter para unidades mínimas de mBRL.
- `/properties/[id]/sell` ganhou modo `By percentage`, além de `By shares`. A
  porcentagem aceita 0.01–100%, calcula cotas inteiras com arredondamento para baixo
  e mostra quantas cotas serão listadas; porcentagens menores que uma cota são
  rejeitadas. O contrato continua recebendo apenas quantidade inteira.
- Adicionados estilos para abas de seleção e testes do formatador. Lint, TypeScript
  e build de produção passaram após a alteração.


## Correção de venda por porcentagem — 12/09/2026

- Causa provável: input HTML `type=number` em locale pt-BR podia rejeitar/limpar
  decimais com vírgula antes do React receber o valor.
- `SellShares` agora usa input textual com `inputMode=decimal`; `percentageToShares`
  aceita ponto ou vírgula, valida 0.01–100% e converte com precisão para cotas
  inteiras.
- Testes, lint, TypeScript e build passaram.

## AI-assisted Property Governance — 12/09/2026

- Cada novo `PropertyToken` usa checkpoints do OpenZeppelin `ERC20Votes`. O poder
  é autoatribuído ao próprio holder e delegação foi desabilitada para manter a
  relação direta de uma cota para um voto.
- A factory cria um `PropertyGovernance` por imóvel e expõe
  `governanceByToken`. Criador e AI agent opcional podem publicar propostas; a
  IA não pode votar, transferir fundos ou alterar balances.
- Cada proposta fixa o poder de voto no bloco da criação. Transferências
  posteriores não permitem reutilizar as mesmas cotas. Maioria simples aprova;
  empate rejeita; não há quorum no MVP.
- A página de imóvel possui análise por IA, revisão, publicação assinada pelo
  usuário, votos YES/NO, percentuais e finalização. A rota Next.js
  `/api/governance/analyze` mantém `OPENAI_API_KEY` somente no servidor e valida
  Structured Outputs antes da transação.
- Novos deploys exigem `PropertyFactory(address aiAgent)`. Os endereços antigos
  da HSK Testnet não possuem governança e precisam ser substituídos em
  `.env.local` após um novo deployment.
- Validação: 34 testes Foundry, lint, TypeScript, testes de produto e build Next.js
  passaram. O smoke local foi atualizado para o novo construtor e para votação.

## Rental income e portfolio — 12/09/2026

- Criado `PropertyIncomeDistributor`, separado da factory, para preservar os
  imóveis já publicados. O criador deposita mBRL fictício e cada holder resgata
  sua parcela proporcional às cotas no snapshot do depósito.
- Snapshots de `ERC20Votes` impedem duplicação da renda após transferência;
  `hasClaimed` limita cada carteira a um resgate por distribuição.
- O portfolio agora começa com um painel compacto de wallet/saldo/faucet e usa
  cards inteiramente clicáveis. Cada card mostra cotas, participação, valor
  estimado, renda total do imóvel e renda disponível para a carteira.
- A página do imóvel mostra renda total, renda pessoal, histórico, resgate e,
  para o criador, o fluxo de geração em duas confirmações de produto. Governança
  ganhou um resumo explícito de decisões pendentes.
- Ativação na HSK Testnet ainda exige publicar apenas `DeployIncome.s.sol` e
  configurar `NEXT_PUBLIC_PROPERTY_INCOME_ADDRESS`. Não recriar a factory.
- Limitações: cotas em custódia do marketplace não recebem renda para o vendedor
  naquele snapshot; arredondamento inteiro pode deixar uma pequena sobra.
- Validação da etapa: 42 testes Foundry, lint, TypeScript e build Next.js passaram.
