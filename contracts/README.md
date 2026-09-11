# Brick — contratos do MVP

Base em Solidity/Foundry para criar imóveis com cotas transferíveis e oferta fixa.
Esta etapa inclui moeda fictícia, tokens e registro de imóveis. Compra e venda,
aluguel e governança ficam para etapas posteriores.

## Contratos

- `MockBRL`: ERC-20 `mBRL` com 6 casas decimais. Qualquer endereço pode chamar
  `mint(recipient, amount)` para obter saldo de demonstração.
- `PropertyToken`: um ERC-20 por imóvel, com cotas inteiras. Todas as cotas são
  emitidas para o criador, sem emissão adicional ou queima. `initialOwner`
  identifica o criador, não o titular atual. Transferências e aprovações seguem ERC-20.
- `PropertyFactory`: `createProperty(name, symbol, shareCount, propertyValue,
  metadataURI)` cria o token e atribui as cotas a `msg.sender`. Retorna o endereço
  e emite `PropertyCreated`. Consulte `propertyCount()`, `properties(index)` e
  `isProperty(address)` para acessar o registro.

O valor declarado usa unidades mínimas de mBRL: 500.000 mBRL correspondem a
`500000000000`. Com 100 cotas, `initialTokenPrice()` retorna `5000000000`
(5.000 mBRL). A divisão arredonda para baixo; o valor original e a oferta permitem
recuperar a razão exata. O valor deve ser pelo menos igual ao número de cotas,
garantindo preço positivo. Esse preço de referência ainda não executa vendas.

Nome e símbolo são obrigatórios. `metadataURI` é opcional e fixo nesta versão.
Pode apontar para JSON com os dados do imóvel; CEP, número e complemento serão
definidos ao final do MVP. Valor declarado e oferta também são fixos.

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

Os testes cobrem emissão fictícia, oferta variável, preço e arredondamento,
transferências, validação de entradas e isolamento entre imóveis e criadores.

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

O script exibe os endereços de MockBRL e PropertyFactory. Não cadastra imóveis
nem emite saldo automaticamente. Use as chaves de desenvolvimento do Anvil
somente em ambiente local.

## Integração com frontend

1. Conectar a carteira à mesma rede dos contratos.
2. Chamar `MockBRL.mint(carteira, valor)` para obter moeda fictícia.
3. Chamar `PropertyFactory.createProperty(...)` com a carteira do proprietário.
4. Ler `PropertyCreated` no recibo para obter o endereço do token criado.
5. Ler `balanceOf(carteira)`, `totalSupply()` e `initialTokenPrice()` nesse token.
6. Usar `transfer(destinatario, quantidade)` para demonstrar transferência de cotas.

ABIs: `out/MockBRL.sol/MockBRL.json`,
`out/PropertyFactory.sol/PropertyFactory.json` e
`out/PropertyToken.sol/PropertyToken.json`.

Conexão de carteira pertence ao frontend, que não está incluído nesta etapa.
