# Brick — contratos do MVP

Base em Solidity/Foundry para criar imóveis com cotas transferíveis, oferta fixa,
governança e renda específica por imóvel. Esta etapa inclui moeda fictícia,
tokens, registro, marketplace, propostas com recomendação de IA e distribuição
proporcional de renda registrada on-chain.

## Contratos

- `MockBRL`: ERC-20 `mBRL` com 6 casas decimais. Qualquer endereço pode chamar
  `mint(recipient, amount)` para obter saldo de demonstração.
- `PropertyToken`: um ERC-20 por imóvel, com cotas inteiras e oferta fixa,
  inicialmente atribuída ao criador. Armazena `initialOwner`, `factory` e
  `propertyId`. Transferências e aprovações seguem ERC-20. Checkpoints do
  `ERC20Votes` registram o saldo histórico usado pela governança. O voto é
  autoatribuído ao holder e delegação externa foi desabilitada para manter
  uma cota igual a uma unidade de voto do seu próprio holder.
- `PropertyFactory`: `createProperty(name, symbol, shareCount, initialPropertyValue,
  metadataURI)` cria o token e uma instância de `PropertyGovernance`, atribuindo
  as cotas a `msg.sender`. Retorna o endereço do token e emite `PropertyCreated`.
  `properties(index)` retorna os campos `token`,
  `creator`, `initialPropertyValue` e `metadataURI`; `propertyCount()` retorna o total.
- `PropertyGovernance`: registra análises produzidas off-chain, propostas,
  votos YES/NO e o resultado final. O criador recebe `PROPOSER_ROLE` e administração;
  o endereço opcional configurado na factory recebe `AI_AGENT_ROLE`. A IA pode
  propor, mas o contrato não permite que ela vote, mova fundos ou altere tokens.
- `PropertyIncomeDistributor`: recebe mBRL fictício do criador do imóvel e permite
  que cada investidor resgate sua parcela conforme as cotas que possuía no último
  bloco confirmado antes do depósito. Cada depósito mantém seu próprio snapshot.

`propertyIdByToken(token)` retorna o índice do imóvel, começando em zero.
Consulte primeiro `isProperty(token)`: um endereço desconhecido também retorna
zero no mapping de IDs, mas terá `isProperty(token) == false`.

O valor inicial usa unidades mínimas de mBRL: 500.000 mBRL correspondem a
`500000000000`. Valor e quantidade de cotas devem ser positivos, mas são
independentes: a quantidade de cotas pode superar o valor, inclusive em unidades
mínimas. O marketplace usa o preço por cota definido pelo vendedor no anúncio, em unidades
mínimas de mBRL. Ele não calcula esse preço a partir do valor inicial do imóvel.
Para exibição, o frontend pode usar a razão valor/cotas preservando as frações;
divisão inteira pode resultar em zero quando há mais cotas que unidades de valor.

Nome e símbolo são obrigatórios. `metadataURI` é opcional e fica na factory.
CEP, número e complemento serão definidos ao final do MVP. A interface atual
registra apenas o valor inicial: atualização do valor permanece pendente após a
refatoração. O token não expõe `propertyValue`, `tokenPrice`, `metadataURI` ou
`updatePropertyValue`.

O cadastro é livre e não verifica propriedade, documentos ou duplicidade.
Os tokens de demonstração não implementam a estrutura jurídica de uma SPE.
MockBRL é exclusivamente moeda de teste sem lastro ou valor real.

## Preparação e testes

Execute nesta pasta, com Foundry instalado. As dependências são OpenZeppelin e
Forge Std, em `lib/`, com versões registradas em `foundry.lock`.

```bash
forge install
forge fmt --check
forge build --sizes
forge test -vvv
```

Os testes cobrem emissão fictícia, oferta variável, transferências, marketplace,
criação e autorização de propostas, votos ponderados, encerramento, aprovação,
rejeição, proteção contra voto duplicado e distribuição proporcional de renda.

## Publicação

Simule a criação dos contratos sem publicar transações:

```bash
forge script script/Deploy.s.sol:Deploy
```

Para uma rede local, inicie `anvil` em outro terminal. Copie `.env.example` para
`.env` e ajuste `RPC_URL`. Importe uma conta de desenvolvimento financiada no
keystore do Foundry por meio do prompt interativo:

```bash
cast wallet import brick-dev --interactive
source .env
forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC_URL" --account brick-dev --broadcast
```

`AI_AGENT_ADDRESS` é opcional. Use zero para que somente os criadores/autorizados
publiquem as recomendações geradas pelo frontend. O script exibe os endereços de
MockBRL, PropertyFactory, PropertyMarketplace e PropertyIncomeDistributor. Não cadastra imóveis
nem emite saldo automaticamente. Use as chaves de desenvolvimento do Anvil
somente em ambiente local.

## Integração com frontend

1. Conectar a carteira à mesma rede dos contratos.
2. Chamar `MockBRL.mint(carteira, valor)` para obter moeda fictícia.
3. Chamar `PropertyFactory.createProperty(...)` com a carteira do proprietário.
4. Ler `PropertyCreated` no recibo para obter o endereço do token criado.
5. Ler `balanceOf(carteira)`, `totalSupply()`, `factory()` e `propertyId()` no token.
6. Consultar `properties(propertyId)` na factory para obter os dados do imóvel.
7. Ler `governanceByToken(token)` na factory para encontrar a governança do imóvel.
8. Usar `transfer(destinatario, quantidade)` para demonstrar transferência de cotas.

ABIs: `out/MockBRL.sol/MockBRL.json`,
`out/PropertyFactory.sol/PropertyFactory.json` e
`out/PropertyToken.sol/PropertyToken.json` e
`out/PropertyGovernance.sol/PropertyGovernance.json` e
`out/PropertyMarketplace.sol/PropertyMarketplace.json` e
`out/PropertyIncomeDistributor.sol/PropertyIncomeDistributor.json`.

Conexão de carteira pertence ao frontend, que não está incluído nesta etapa.

## Marketplace

O marketplace aceita somente tokens registrados na factory configurada e usa
MockBRL como moeda na publicação padrão. Cada anúncio tem um vendedor, token,
quantidade restante e preço por cota fixo. O pagamento vai diretamente ao vendedor,
sem taxa. As cotas ficam no marketplace até a compra ou o cancelamento.

1. Vendedor chama `PropertyToken.approve(marketplace, quantidade)`.
2. Vendedor chama `createListing(token, quantidade, precoPorCota)` no marketplace.
3. Frontend lê `ListingCreated` para obter o ID do anúncio.
4. Comprador chama `MockBRL.approve(marketplace, quantidade * precoPorCota)`.
5. Comprador chama `buyShares(listingId, quantidade)`; pode comprar parte ou tudo.
6. Vendedor pode chamar `cancelListing(listingId)` para recuperar as cotas restantes.

`listings(id)` retorna vendedor, token, cotas restantes e preço por cota.
`listingCount()` permite enumerar os anúncios. Quantidade restante zero significa
anúncio encerrado; eventos `SharesPurchased` e `ListingCancelled` detalham o motivo.
`reservedSharesAt(token, vendedor, bloco)` devolve quantas cotas daquele vendedor
estavam reservadas (anunciadas e ainda não vendidas) num bloco passado — é o que
permite ao `PropertyIncomeDistributor` atribuir renda ao vendedor mesmo com as
cotas em custódia do marketplace (ver seção "Renda do imóvel").
Os anúncios não podem ser editados: para trocar preço, cancele e crie outro.
Qualquer titular pode anunciar, inclusive quem comprou cotas anteriormente.
Para oferecer uma porcentagem, o frontend deve convertê-la em uma quantidade inteira
que o vendedor confirme antes de enviar a transação.

Exemplo: 10 cotas a 5.000 mBRL cada usam `quantidade = 10`,
`precoPorCota = 5000000000` e aprovação de pagamento de `50000000000`.
Preço deve ser positivo e representável nas 6 casas decimais da moeda. Uma razão
valor/cotas inferior a uma unidade mínima não pode ser usada como preço unitário
neste marketplace; o vendedor precisa escolher um preço representável. Isso não
restringe a quantidade de cotas permitida no cadastro do imóvel.

Os testes do marketplace cobrem o fluxo integrado desde a criação do imóvel,
compras parciais e completas, revenda, cancelamento, permissões, aprovações,
saldo insuficiente, reserva de cotas e conservação de saldos após compra/cancelamento.

## Governança assistida por IA

Cada proposta usa o bloco de criação como snapshot. Os votos são consultados nos
checkpoints daquele bloco, por isso transferir cotas depois não aumenta o voto do
destinatário naquela proposta. Cada endereço vota uma vez. Após o prazo, qualquer
conta pode finalizar; `votesFor > votesAgainst` aprova e empate rejeita. Não há
quorum no MVP.

`markExecuted` registra que uma proposta aprovada foi realizada fora da blockchain,
mas não transfere moeda nem tokens. Cotas anunciadas ficam em custódia do marketplace;
se o snapshot ocorrer durante o anúncio, elas pertencem ao endereço do marketplace
para fins de checkpoint e não participam daquela votação. Essa limitação permanece
para governança (o `PropertyMarketplace` não expõe poder de voto por vendedor, só
cotas reservadas — ver seção seguinte); em produção, a custódia deverá preservar
separadamente o poder de governança do vendedor.

## Renda do imóvel

Qualquer endereço registra uma renda de demonstração em duas transações: autoriza
o valor em mBRL e chama `createDistribution` para um imóvel cadastrado — não há
verificação de papel/role, então o próprio inquilino pode pagar diretamente (por
exemplo, escaneando o QR code de pagamento gerado pelo frontend), sem passar pela
carteira do criador. O contrato guarda o valor e o último bloco já confirmado como
snapshot. Cada holder chama `claim` para receber `renda × cotas no snapshot ÷
total de cotas`. Transferir cotas depois do depósito não transfere nem duplica o
direito sobre aquela distribuição.

Cotas com anúncio ativo (ainda não vendidas) contam para a renda do vendedor: o
`PropertyMarketplace` guarda, por vendedor e por imóvel, um checkpoint das cotas
reservadas ao longo do tempo (`reservedSharesAt`, mesmo padrão de `Checkpoints`
usado por `ERC20Votes`), atualizado em `createListing`, `buyShares` e
`cancelListing`. No cálculo de `claim`/`claimable`, o distribuidor soma
`getPastVotes(investidor, snapshot)` (cotas na própria carteira) com
`marketplace.reservedSharesAt(token, investidor, snapshot)` (cotas dele ainda não
vendidas naquele bloco). Como a leitura é sempre no bloco do snapshot, listar
cotas novas depois de um depósito não infla o valor daquele depósito antigo — o
total somado entre todos os holders continua batendo exatamente com
`totalShares`. Divisões inteiras ainda podem deixar uma pequena sobra de
arredondamento no contrato; o destino dessa sobra permanece em aberto para uma
versão de produção.

Por isso o construtor de `PropertyIncomeDistributor` agora recebe o endereço do
`PropertyMarketplace`, além da factory e da moeda. Configure
`PROPERTY_FACTORY_ADDRESS`, `MOCK_BRL_ADDRESS` e `PROPERTY_MARKETPLACE_ADDRESS` no
`.env` e execute, nessa ordem, sem recriar a factory nem os imóveis existentes:

```bash
source .env
# Só necessário se o marketplace também estiver sendo substituído (ex.: para obter
# reservedSharesAt em um marketplace publicado antes dessa funcionalidade). Anúncios
# ativos no marketplace antigo continuam funcionando lá, mas ficam de fora do novo
# endereço — cancele-os no contrato antigo e recrie-os no novo antes de divulgar.
forge script script/DeployMarketplace.s.sol:DeployMarketplace \
  --rpc-url "$RPC_URL" \
  --account brick-deployer \
  --broadcast

forge script script/DeployIncome.s.sol:DeployIncome \
  --rpc-url "$RPC_URL" \
  --account brick-deployer \
  --broadcast
```

Copie os endereços exibidos como `PropertyMarketplace` (se substituído) e
`PropertyIncomeDistributor` para `NEXT_PUBLIC_PROPERTY_MARKETPLACE_ADDRESS` e
`NEXT_PUBLIC_PROPERTY_INCOME_ADDRESS` no `.env.local` do frontend.

### Publicação por cotistas

`PropertyGovernance.canPropose(account)` aceita titulares com saldo positivo do
respectivo `PropertyToken`, além das contas explicitamente autorizadas por role.
`createProposal` aplica a mesma verificação na transação; possuir tokens de outro
imóvel não concede permissão. Cotas em custódia de anúncios não são saldo da
carteira: cancele uma oferta para recuperar cotas antes de propor, se necessário.

Esta mudança exige novos deployments para alterar o comportamento na rede.
Os contratos de governança existentes não são proxies e continuam com a regra
anterior. A interface detecta a ausência de `canPropose` e mantém a leitura e a
votação existentes, exibindo a limitação para publicação. Nenhuma migração foi
executada automaticamente; preservar os endereços e o histórico existentes ao
planejar a publicação de uma nova factory e dos contratos associados.
