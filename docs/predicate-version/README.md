# 🔐 Guia Completo: Gerando e Publicando Novas Versões de Predicados

## 📚 Índice

1. [Conceitos Fundamentais](#conceitos-fundamentais)
2. [Pré-requisitos](#pré-requisitos)
3. [Passo a Passo: Gerar Nova Versão](#passo-a-passo-gerar-nova-versão)
4. [Passo a Passo: Publicar Versão](#passo-a-passo-publicar-versão)
5. [Verificação e Validação](#verificação-e-validação)
6. [Solução de Problemas](#solução-de-problemas)
7. [Perguntas Frequentes](#perguntas-frequentes)

---

## 🎓 Conceitos Fundamentais

### O que é um Predicado?

Um **predicado** é um tipo especial de contrato inteligente Fuel que funciona como uma função matemática para validar transações. Pense nele como uma "assinatura digital inteligente" que verifica se uma transação atende a certas regras antes de ser executada.

**Analogia:**

- Conta bancária regular: verificação de senha
- Predicado Bako Safe: verificação de múltiplas assinaturas (multi-sig)

### O que é um Predicado Raiz?

Quando você compila código Sway, o compilador gera **bytecode** - que é o código em linguagem de máquina que o Fuel entende. O **predicado raiz** é um identificador único (hash) desse bytecode.

```
Código Sway → Compilação → Bytecode → Hash → Predicado Raiz
                                        (0x0111776e992751...)
```

### O que é versions.json?

É um arquivo que registra todas as versões dos predicados que você criou, mantendo um histórico com:

- Hash da versão (predicado raiz)
- Bytecode compilado
- ABI (Application Binary Interface)
- Metadados (descrição, signatários, redes onde foi implementado)

---

## ✅ Pré-requisitos

Antes de começar, certifique-se de que você tem:

### 1. Fuel Toolchain Instalado

```bash
# Verificar se está instalado
fuel --version
forc --version
fuelup --version

# Se não estiver, instale:
# https://docs.fuel.network/guides/installation/
```

**Versões recomendadas:**

- `fuel-core@0.43.1`
- `forc@0.68.1`
- `fuels-ts@0.101.3`

### 2. Node.js e PNPM

```bash
# Verificar versão do Node
node --version  # Mínimo v18.0.0

# Verificar PNPM
pnpm --version  # Mínimo v8.0.0
```

### 3. Arquivo .env Configurado

```bash
cd packages/sway
cp .env.example .env
```

Edit o `.env` com suas credenciais:

```bash
# .env
# Chave privada da conta que executará a implementação
PRIVATE_KEY=sua_chave_privada_aqui

# URL do provedor para a rede onde o predicado será implementado
# Exemplos:
# - Testnet do Fuel: https://testnet.fuel.network/graphql
# - Mainnet do Fuel: https://mainnet.fuel.network/graphql
# - Node local: http://localhost:4000/graphql
PROVIDER_URL=https://testnet.fuel.network/graphql
```

### 4. Dependências Instaladas

```bash
# Na raiz do projeto
pnpm install

# Ou especificamente em packages/sway
cd packages/sway
pnpm install
```

---

## 🚀 Passo a Passo: Gerar Nova Versão

### O que Você Fará Aqui

Você:

1. ✏️ Modificará o código do predicado (Sway)
2. 🔨 Compilará o novo código
3. 📝 O sistema gerará automaticamente a entrada em `versions.json`
4. ✅ Validará que tudo foi criado corretamente
5. 🏷️ Adicionará origem de carteira e metadados do desenvolvedor
6. 📝 Documentará a mudança com uma descrição
7. 📦 Registrará o bytecode em ENCODING_VERSIONS
8. (Opcional) Atualizará a versão padrão do predicado se esta for a versão mais estável

### Passo 1: Entenda a Estrutura do Predicado

```
packages/sway/
├── predicate/
│   ├── Forc.toml          # Configuração do projeto predicado
│   └── src/
│       └── main.sw         # ← Códimigo principal do predicado que você editará
├── libraries/
│   ├── Forc.toml          # Configuração de bibliotecas compartilhadas
│   └── src/
│       ├── main.sw         # Exportações de bibliotecas
│       ├── entities.sw     # Estruturas de dados e tipos
│       ├── validations.sw  # Lógica de validação
│       ├── utilities.sw    # Funções utilitárias
│       └── webauthn_digest.sw  # Funcionalidade WebAuthn
├── scripts/
│   ├── makeVersion.ts      # ← Script que gera novo versions.json
│   ├── getFuelToolchain.ts
│   └── setNetworkDeployed.ts
fuels.config.ts            # Configuração do Fuel SDK
package.json               # Metadados do pacote npm
```

### Passo 2: Entenda os Arquivos-chave e Faça suas Alterações

Os principais arquivos com os quais você trabalhará:

- **`packages/sway/src/predicate/src/main.sw`** - A lógica do predicado principal (o que você editará)
- **`packages/sway/src/libraries/src/*.sw`** - Bibliotecas de suporte para validação de assinatura, entidades e utilitários

Abra o arquivo principal do predicado no VS Code:

```bash
# No VS Code ou seu editor
code packages/sway/src/predicate/src/main.sw
```

**Exemplo de mudança:** Vamos adicionar um comentário descrevendo o ajuste de auditoria:

```sway
// caminho: packages/sway/src/predicate/src/main.sw

// Código existente antes
// ... código existente ...

// Adicione um comentário descrevendo sua mudança
configurable {
    /// Array de signatários autorizados
    SIGNERS: [b256; 10] = [
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
    ],
    // ... resto do código ...
}

pub fn main() -> bool {
    // Ajuste de auditoria (2025-03-06): Validação de assinatura melhorada
    // Garanta que todos os signatários sejam validados adequadamente antes da execução
    validate_signatures()
}

// ... resto do código ...
```

**⚠️ IMPORTANTE:** Qualquer mudança no código gerará um bytecode diferente, resultando em um **novo predicado raiz**.

### Passo 3: Compile o Código (Build)

Agora vamos compilar para gerar o novo bytecode:

```bash
# Navegue para o diretório sway
cd packages/sway

# Execute a compilação
pnpm fuels build
```

**O que acontece neste comando:**

```
pnpm fuels build
    ↓
1. Forc compila Sway → Gera bytecode
    ↓
2. TypeScript processa o bytecode gerado
    ↓
3. makeVersion.ts é executado automaticamente
    ↓
4. Calcula novo predicado raiz (hash único)
    ↓
5. Verifica se esta versão já existe em versions.json
    ↓
6. Se NÃO existe → CRIA nova entrada
   Se JÁ existe → Não faz nada (para evitar duplicatas)
```

**Saída esperada:**

```bash
$ pnpm fuels build

> @bako-labs/bako-safe-sway@0.1.0 fuels build
> npm run predicate:build && npm run predicate:abi

> • Compilando biblioteca "bako_safe"
> • Compilação concluída para biblioteca "bako_safe"
> • Compilando predicado "bako_safe"
> • Compilação concluída

✅ [BUILD] Nova versão do predicado criada: 0xabcd1234...
```

### Passo 4: Verifique se a Versão Foi Criada

Abra o arquivo `versions.json` e procure pela nova entrada:

```bash
# Visualize o arquivo
cat packages/sdk/src/sway/predicates/versions.json | jq 'keys | .[-1]'

# Ou no VS Code
code packages/sdk/src/sway/predicates/versions.json
```

**Você deve ver algo assim:**

```json
{
  "0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678": {
    "time": 1741207200000,
    "bytecode": "0x1a403000...",
    "abi": {
      "programType": "predicate",
      "specVersion": "1",
      "functions": [
        {
          "name": "main",
          "inputs": [],
          "output": "bool"
        }
      ],
      "configurables": [...]
    },
    "toolchain": {
      "fuelsVersion": "0.101.3",
      "forcVersion": "0.68.1",
      "fuelCoreVersion": "0.43.1"
    },
    "description": "",
    "deployed": []
  }
}
```

### Passo 5: Adicione walletOrigin e developedBy Manualmente (⭐ IMPORTANTE!)

O script gera automaticamente `walletOrigin` e `developedBy` com valores padrão, mas **você deve ajustá-los conforme necessário**.

**Abra o arquivo e edite:**

```json
{
  "0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678": {
    "time": 1741207200000,
    "bytecode": "0x1a403000...",
    "abi": { ... },
    "toolchain": { ... },
    "walletOrigin": ["fuel", "webauthn"],  // ← Defina quais carteiras podem assinar
    "developedBy": "Bako Labs",             // ← Indique quem desenvolveu
    "description": "",
    "deployed": []
  }
}
```

**Campos disponíveis para `walletOrigin`:**

```json
"walletOrigin": [
  "fuel",          // FuelWallet e Fuelet (carteiras nativas do Fuel)
  "webauthn",      // WebAuthn para autenticação biométrica
  "evm"            // Assinaturas Ethereum (EVM)
]
```

**Exemplos:**

```json
// Apenas Fuel
"walletOrigin": ["fuel"]

// Apenas WebAuthn
"walletOrigin": ["webauthn"]

// Fuel + WebAuthn (mais comum)
"walletOrigin": ["fuel", "webauthn"]

// Apenas EVM
"walletOrigin": ["evm"]

// Todos
"walletOrigin": ["fuel", "webauthn", "evm"]
```

**Campos disponíveis para `developedBy`:**

```
"developedBy": "Bako Labs"          // → Predicado criado por Bako Labs
"developedBy": "Fuel Labs"          // → Predicado criado por Fuel Labs
"developedBy": "Community"          // → Predicados contribuídos pela comunidade
"developedBy": "Seu Nome"           // → Poderia ser seu nome em caso de contribuição
```

### Passo 6: Adicione Descrição

A descrição começa vazia. Você deve preenchê-la manualmente para documentar qual foi a mudança:

**Abra o arquivo e edite:**

```json
{
  "0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678": {
    "time": 1741207200000,
    "bytecode": "0x1a403000...",
    "abi": { ... },
    "toolchain": { ... },
    "walletOrigin": ["fuel", "webauthn"],
    "developedBy": "Bako Labs",
    "description": "Ajuste de auditoria: validação de assinatura melhorada e verificações de segurança aprimoradas",
    "deployed": []
  }
}
```

**Boas práticas para descrição:**

- ✅ "Validação de assinatura melhorada"
- ✅ "Adicionadas verificações de validação de entrada"
- ✅ "Otimizado uso de gás na função principal"
- ❌ "v2" (muito vago)
- ❌ "conserto" (sem detalhes)

### Passo 7: Registre Bytecode em ENCODING_VERSIONS

O `ENCODING_VERSIONS` rastreia bytecodes de predicados para compatibilidade de codificação de assinatura. Você precisa adicionar seu novo bytecode ao array apropriado:

**Abra o arquivo:**

```bash
code packages/sdk/src/modules/coders/utils/versionsByEncode.ts
```

**Localize o objeto ENCODING_VERSIONS:**

```typescript
export const ENCODING_VERSIONS = {
  with0xPrefix: [
    '0xbbae06500cd11e6c1d024ac587198cb30c504bf14ba16548f19e21fa9e8f5f95',
    '0xfdac03fc617c264fa6f325fd6f4d2a5470bf44cfbd33bc11efb3bf8b7ee2e938',
  ],
  without0xPrefix: [
    '0x0111776e992751bd0928862c2a2cb9ea34b220c0ca8833ecbe5f8963805ee8c7',
    // ... mais versões
  ],
};
```

**Adicione seu novo bytecode de versão:**

Determine qual array usar baseado no tipo de assinatura:

- **`with0xPrefix`**: Use para assinaturas EVM (compatível com Ethereum)
- **`without0xPrefix`**: Use para assinaturas nativas do Fuel e WebAuthn

**Exemplo (adicionar a without0xPrefix):**

```typescript
without0xPrefix: [
  '0x0111776e992751bd0928862c2a2cb9ea34b220c0ca8833ecbe5f8963805ee8c7',
  // ... entradas existentes
  '0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678', // ← Adicionar aqui
],
```

**⚠️ IMPORTANTE:** O bytecode deve corresponder exatamente ao valor em `versions.json`.

### Passo 8: Atualize DEFAULT_PREDICATE_VERSION (Opcional - apenas para versão mais recente)

Se sua nova versão for a **versão mais recente e estável**, atualize a versão padrão usada pelo SDK:

**Abra o arquivo:**

```bash
code packages/sdk/src/sway/predicates/predicateFinder.ts
```

**Localize a constante:**

```typescript
/** Versão de bytecode predicado padrão usada quando nenhuma é especificada. */
export const DEFAULT_PREDICATE_VERSION =
  `0x0111776e992751bd0928862c2a2cb9ea34b220c0ca8833ecbe5f8963805ee8c7` as const;
```

**Substitua pela sua nova versão:**

```typescript
/** Versão de bytecode predicado padrão usada quando nenhuma é especificada. */
export const DEFAULT_PREDICATE_VERSION =
  `0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678` as const;
```

**⚠️ CUIDADO:** Atualize apenas se:

- ✅ Você testou completamente em testnet
- ✅ O SDK passa em todos os testes com esta versão
- ✅ É compatível com versões anteriores
- ✅ Múltiplas versões ainda estão disponíveis em `versions.json` como fallback

**❌ NÃO atualize se:**

- A versão não foi implementada na mainnet
- Você está apenas fazendo desenvolvimento/testes
- Há problemas conhecidos

---

## 📤 Passo a Passo: Publicar Versão

### O que Você Fará Aqui

Você:

1. 🔓 Desbloqueará credenciais (se necessário)
2. 📡 Enviará o bytecode para a rede Fuel
3. ✅ Registrará a rede em `versions.json`
4. 🎉 Confirmará que a implementação foi bem-sucedida

### Pré-requisito: Configure .env

Abra o arquivo `.env`:

```bash
cd packages/sway
nano .env  # ou use seu editor favorito
```

Configure com suas credenciais:

```bash
# .env
# Chave privada da conta que executará a implementação
# ⚠️ NUNCA commit isso!
PRIVATE_KEY=0x1234567890abcdef...
```

**⚠️ SEGURANÇA:**

- Nunca compartilhe sua `PRIVATE_KEY`
- Nunca faça commit do arquivo `.env`
- Use uma conta testnet para testes
- Para mainnet, considere usar uma conta com fundos mínimos ou hardware wallet

### Passo 1: Verifique o Saldo (se necessário)

Se você está usando testnet, pode solicitar fundos de teste:

```bash
# Não é necessário executar toda vez, mas é bom verificar
# Em Fuel Testnet: https://faucet.testnet.fuel.network/
# Você precisa de ETH em testnet para pagar pela taxa
```

### Passo 2: Execute a Implementação

```bash
cd packages/sway

# Comando de implementação
pnpm predicate:deploy
```

**O que acontece:**

```
pnpm predicate:deploy
    ↓
1. Lê o arquivo .env
    ↓
2. Carrega o bytecode do predicado
    ↓
3. Conecta à rede Fuel especificada
    ↓
4. Envia uma transação com o bytecode
    ↓
5. Aguarda confirmação da rede
    ↓
6. Retorna ID da transação (tx hash)
```

**Saída esperada:**

```bash
$ pnpm predicate:deploy

> @bako-labs/bako-safe-sway@0.1.0 predicate:deploy
> tsx scripts/setNetworkDeployed.ts

✅ Deploy bem-sucedido!
ID da Transação: 0x1a2b3c4d5e6f7g8h...
```

### Passo 3: Verifique a Implementação

O script `setNetworkDeployed.ts` registra automaticamente que seu predicado foi implementado na rede especificada. Simplesmente verifique se a URL da rede foi adicionada com sucesso:

```bash
# Visualize as redes implementadas para seu predicado
jq '.["0xabcd1234..."].deployed' packages/sdk/src/sway/predicates/versions.json

# ou visualize a entrada completa da versão
jq '.["0xabcd1234..."]' packages/sdk/src/sway/predicates/versions.json
```

**Resultado esperado:**

```json
{
  "time": 1741207200000,
  "bytecode": "0x1a403000...",
  "abi": { ... },
  "toolchain": { ... },
  "walletOrigin": ["fuel", "webauthn"],
  "developedBy": "Bako Labs",
  "description": "Ajuste de auditoria: validação de assinatura melhorada e verificações de segurança aprimoradas",
  "deployed": [
    "https://testnet.fuel.network/v1/graphql"
  ]
}
```

✅ Se você vir sua URL de rede no array `deployed`, a implementação foi registrada com sucesso!

### Passo 4: Faça Commit das Mudanças

O script de implementação atualizou automaticamente `versions.json` com sua rede. Agora faça commit dessas mudanças:

```bash
git add packages/sdk/src/sway/predicates/versions.json

git commit -m "chore: adicionar nova versão de predicado e registrar implementação em testnet"

git push origin seu-nome-de-branch
```

**📝 Nota:** Este commit inclui tanto a nova entrada de versão (de `makeVersion.ts`) quanto o registro de implementação (de `setNetworkDeployed.ts`).

### Passo 5: Publique em NPM (Opcional - apenas para lançamentos oficiais)

Se você quiser disponibilizar esta versão para outros desenvolvedores usarem:

```bash
# Atualize a versão do pacote
npm version patch  # 0.1.0 → 0.1.1
# ou
npm version minor  # 0.1.0 → 0.2.0

# Publique em npm
npm publish

# Isso fará push com tags automaticamente
```

**⚠️ Faça isso apenas se você for um mantenedor do projeto!**

---

## ✅ Verificação e Validação

### Como Confirmar que Tudo Funcionou?

#### 1. Verifique versions.json

```bash
# Liste todas as versões criadas
jq 'keys' packages/sdk/src/sway/predicates/versions.json

# Visualize detalhes de uma versão específica
jq '.["0xabcd1234..."]' packages/sdk/src/sway/predicates/versions.json
```

**Resultado esperado:**

```json
{
  "time": 1741207200000,
  "bytecode": "0x1a403000504100...",
  "abi": { "programType": "predicate", ... },
  "toolchain": { "fuelsVersion": "0.101.3", ... },
  "walletOrigin": ["fuel", "webauthn"],
  "developedBy": "Bako Labs",
  "description": "Ajuste de auditoria: validação de assinatura melhorada",
  "deployed": ["https://testnet.fuel.network/v1/graphql"]
}
```

#### 2. Verifique no Explorador Blockchain

```bash
# Vá para o Explorador Fuel (se implementado)
# https://testnet.fuel.network/

# Procure por seu ID de Transação
# Você deve ver a confirmação da transação
```

#### 3. Teste o SDK com a Nova Versão

```bash
# Em seu projeto usando bako-safe SDK
import { BakoSafe } from '@bako-labs/sdk';

// O SDK reconhece automaticamente a nova versão
const vault = new BakoSafe({
  provider,
  predicate: '0xabcd1234...' // sua nova versão
});
```

#### 4. Execute Testes

```bash
cd packages/tests

# Execute testes para garantir compatibilidade
pnpm test

# Ou testes específicos
pnpm test:file predicate.test.ts
```

---

## 🆘 Solução de Problemas

### ❌ Erro: "Não foi possível encontrar predicado raiz"

**Causa:** O bytecode não foi gerado corretamente.

**Solução:**

```bash
# Limpe cache e recompile
rm -rf packages/sway/out
pnpm install
pnpm fuels build
```

---

### ❌ Erro: "Versão já existe"

**Causa:** Você não fez mudanças reais no código, o bytecode é o mesmo.

**Solução:**

```bash
# Faça uma mudança real no código Sway
# Por exemplo, adicione um comentário ou altere lógica

# Depois execute novamente
pnpm fuels build
```

---

### ❌ Erro: "Chave privada não encontrada em .env"

**Causa:** O arquivo `.env` não foi configurado corretamente.

**Solução:**

```bash
# Verifique se .env existe
cat packages/sway/.env

# Se não existir, crie:
cd packages/sway
cp .env.example .env

# Edite com suas credenciais
nano .env
```

---

### ❌ Erro: "Saldo insuficiente para taxa"

**Causa:** Sua conta não tem saldo suficiente na testnet.

**Solução:**

```bash
# Para testnet, solicite financiamento gratuito da faucet
# https://faucet.testnet.fuel.network/

# Cole seu endereço público
# Aguarde para receber ETH de teste
```

---

### ❌ Erro: "Falha ao compilar predicado"

**Causa:** Há um erro de sintaxe no código Sway.

**Solução:**

```bash
# Verifique o erro de compilação
pnpm fuels build 2>&1 | grep -i error

# Corrija a sintaxe
# Documentação Sway: https://docs.fuel.network/
```

---

## ❓ Perguntas Frequentes

### P: Quantas versões posso ter?

**R:** Quantas você quiser! Cada mudança de código = nova versão. Você pode ter 100+ versões diferentes.

---

### P: Posso reverter para uma versão antiga?

**R:** Sim! Cada versão tem seu próprio hash. Você pode especificar qual versão usar ao criar um vault:

```typescript
const vault = BakoSafe.deploy({
  provider,
  predicate: '0x[hash-da-versao-antiga]',
});
```

---

### P: Qual é a diferença entre testnet e mainnet?

| Aspecto      | Testnet                  | Mainnet        |
| ------------ | ------------------------ | -------------- |
| Propósito    | Testes e desenvolvimento | Produção real  |
| Fundos reais | Não (ETH falso)          | Sim (ETH real) |
| Risco        | Nenhum                   | Alto           |
| Velocidade   | Mais rápida              | Depende        |
| Custo tx     | Gratuito/testnet         | Dinheiro real  |

---

### P: O que significa "walletOrigin"?

**R:** Quais carteiras suportadas podem assinar com seu predicado.

```json
"walletOrigin": ["fuel", "webauthn"]
// Significa: FuelWallet e WebAuthn podem assinar
```

---

### P: Preciso fazer deploy toda vez que faço uma mudança?

**R:** Não! Você:

1. ✅ **Deve** executar `pnpm fuels build` (sempre)
2. ❓ **Pode** fazer deploy (apenas quando pronto)
3. ✅ **Deve** atualizar `versions.json` (sempre)

O deploy é opcional - você só faz quando quer publicar em uma rede.

---

### P: Posso ter múltiplas versões implementadas em redes diferentes?

**R:** Sim! Exemplo:

```json
{
  "0xversao1": {
    "deployed": ["https://testnet.fuel.network/v1/graphql"]
  },
  "0xversao2": {
    "deployed": [
      "https://testnet.fuel.network/v1/graphql",
      "https://mainnet.fuel.network/v1/graphql"
    ]
  }
}
```

---

### P: O que fazer antes de fazer deploy em mainnet?

**R:** Checklist de segurança:

- [ ] Teste completamente em testnet
- [ ] Execute: `pnpm test`
- [ ] Revisão de código com outro dev
- [ ] Verifique o bytecode duas vezes
- [ ] Comece com pequeno volume
- [ ] Use carteira com fundos mínimos
- [ ] Documente todas as mudanças
- [ ] Faça backup das chaves privadas

---

## 📚 Recursos Adicionais

- [Documentação Fuel](https://docs.fuel.network/)
- [Linguagem Sway](https://docs.fuel.network/guides/intro-to-sway/)
- [Combustíveis Predicados](https://docs.fuel.network/guides/intro-to-predicates/)
- [Especificação WebAuthn](https://webauthn.io/)
- [Documentação Bako Safe](https://docs.bako.global/)

---

## 🤝 Precisa de Ajuda?

- Abra uma issue: [GitHub Issues](https://github.com/Bako-Labs/bako-safe/issues)
- Junte-se à comunidade: [Fuel Discord](https://discord.gg/fuel-labs)
- Leia o código-fonte: `/packages/sway/`

---

**Última Atualização:** 9 de março de 2026
**Versão do Guia:** 1.0.0
