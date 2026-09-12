# Brick — contratos do MVP

Base em Solidity/Foundry para criar imóveis com cotas transferíveis e oferta fixa.
Esta etapa inclui moeda fictícia, tokens, registro de imóveis e marketplace.
Aluguel, governança e atualização do valor do imóvel ficam para etapas posteriores.

## Contratos

- `MockBRL`: ERC-20 `mBRL` com 6 casas decimais. Qualquer endereço pode chamar
  `mint(recipient, amount)` para obter saldo de demonstração.
- `PropertyToken`: um ERC-20 por imóvel, com cotas inteiras e oferta fixa,
  inicialmente atribuída ao criador. Armazena `initialOwner`, `factory` e
  `propertyId`. Transferências e aprovações seguem ERC-20.
- `PropertyFactory`: `createProperty(name, symbol, shareCount, initialPropertyValue,
  metadataURI)` cria o token e atribui as cotas a `msg.sender`. Retorna o endereço
  e emite `PropertyCreated`. `properties(index)` retorna os campos `token`,
  `creator`, `initialPropertyValue` e `metadataURI`; `propertyCount()` retorna o total.

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

Os testes cobrem emissão fictícia, oferta variável, transferências, validação de
entradas, referências ao registro, cotas superiores ao valor e isolamento entre
imóveis e criadores.

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

O script exibe os endereços de MockBRL, PropertyFactory e PropertyMarketplace. Não cadastra imóveis
nem emite saldo automaticamente. Use as chaves de desenvolvimento do Anvil
somente em ambiente local.

## Integração com frontend

1. Conectar a carteira à mesma rede dos contratos.
2. Chamar `MockBRL.mint(carteira, valor)` para obter moeda fictícia.
3. Chamar `PropertyFactory.createProperty(...)` com a carteira do proprietário.
4. Ler `PropertyCreated` no recibo para obter o endereço do token criado.
5. Ler `balanceOf(carteira)`, `totalSupply()`, `factory()` e `propertyId()` no token.
6. Consultar `properties(propertyId)` na factory para obter os dados do imóvel.
7. Usar `transfer(destinatario, quantidade)` para demonstrar transferência de cotas.

ABIs: `out/MockBRL.sol/MockBRL.json`,
`out/PropertyFactory.sol/PropertyFactory.json` e
`out/PropertyToken.sol/PropertyToken.json` e
`out/PropertyMarketplace.sol/PropertyMarketplace.json`.

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
