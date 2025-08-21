# 🏦 Miau Bank API

Uma API para transferências PIX, desenvolvida com Node.js e Express, implementando funcionalidades como idempotência, limites diários, e validações de negócio.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Uso](#uso)
- [API Endpoints](#api-endpoints)
- [Testes](#testes)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pipeline CI/CD](#pipeline-cicd)

## 🎯 Sobre o Projeto

Este projeto implementa uma API para processamento de transferências PIX com as seguintes características:

- **Idempotência**: Garantia de que transações duplicadas não sejam processadas
- **Validações**: Verificações de saldo, limites diários e regras de negócio
- **Arquitetura modular**: Estrutura organizada em controllers, routes e middleware
- **Testes**: Suite de testes implementada com Mocha

## ✨ Funcionalidades

### 🔐 Transferências PIX
- Transferências entre contas com validação de saldo
- Sistema de idempotência para evitar duplicatas
- Validação de limites diários por tipo de usuário
- Suporte a usuários comuns e favoritos (diferentes limites)

### 💰 Gestão de Contas
- Consulta de saldo em tempo real
- Extrato de transações

### 🔄 Estornos
- Estorno de transações dentro de 1 minuto
- Validação de prazo e permissões
- Reversão automática de saldos

### 🛡️ Segurança e Validações
- Validação de CPF e dados de entrada
- Controle de limites diários
- Prevenção de transações duplicadas
- Simulação de timeouts para testes

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + Express.js
- **Banco de Dados**: In-Memory Database (para desenvolvimento/testes)
- **Testes**: Mocha + Supertest
- **Documentação**: Swagger/OpenAPI
- **Validações**: Moment.js, UUID
- **CI/CD**: GitHub Actions

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Git

## 🚀 Instalação

1. **Clone o repositório**
```bash
git clone <url-do-seu-repositorio>
cd implementation-day
```

2. **Instale as dependências**
```bash
npm install
```

## 🎮 Uso

### Iniciar o servidor
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

### Executar testes
```bash
# Todos os testes
npm test

# Testes específicos
npx mocha tests/pix.test.js
npx mocha tests/account.test.js
```

### Acessar documentação
Após iniciar o servidor, acesse:
- **Swagger UI**: http://localhost:3000/api-docs
- **API Base**: http://localhost:3000/api

## 🔌 API Endpoints

### Transferências PIX

#### `POST /api/pix/transfer`
Realiza uma transferência PIX entre contas.

**Headers:**
```
X-Idempotency-Key: <chave-única>
```

**Body:**
```json
{
  "senderAccountId": "1",
  "receiverCpf": "222.222.222-22",
  "amount": 100.00
}
```

**Respostas:**
- `200`: Transferência realizada com sucesso
- `400`: Saldo insuficiente, limite excedido ou dados inválidos
- `404`: Conta não encontrada
- `409`: Transação duplicada
- `504`: Timeout (simulado)

#### `POST /api/pix/refund`
Realiza estorno de uma transação PIX.

**Body:**
```json
{
  "transactionId": "uuid-da-transacao",
  "accountId": "1"
}
```

**Respostas:**
- `200`: Estorno realizado com sucesso
- `400`: Prazo de estorno expirado
- `404`: Transação não encontrada

### Contas

#### `GET /api/accounts/:accountId/balance`
Consulta o saldo de uma conta.

**Respostas:**
- `200`: Saldo retornado com sucesso
- `404`: Conta não encontrada

#### `GET /api/accounts/:accountId/statement`
Consulta o extrato de uma conta.

**Respostas:**
- `200`: Extrato retornado com sucesso
- `404`: Conta não encontrada

## 🧪 Testes

O projeto possui uma suite completa de testes implementada com Mocha:

### Executar todos os testes
```bash
npm test
```

### Estrutura dos testes
- **`tests/pix.test.js`**: Testes das funcionalidades PIX
- **`tests/account.test.js`**: Testes das funcionalidades de conta

### Cobertura de testes
- ✅ Transferências PIX (sucesso e falhas)
- ✅ Validação de idempotência
- ✅ Limites diários
- ✅ Estornos
- ✅ Validações de entrada
- ✅ Tratamento de erros

## 📁 Estrutura do Projeto

```
implementation-day/
├── src/
│   ├── controllers/          # Lógica de negócio
│   │   ├── account.controller.js
│   │   └── pix.controller.js
│   ├── data/                # Camada de dados
│   │   └── inMemoryDatabase.js
│   ├── middleware/          # Middlewares
│   │   └── errorHandler.js
│   ├── routes/              # Rotas da API
│   │   ├── account.routes.js
│   │   └── pix.routes.js
│   ├── utils/               # Utilitários
│   │   └── constants.js
│   └── docs/                # Documentação Swagger
│       └── swagger.yaml
├── tests/                   # Testes automatizados
│   ├── account.test.js
│   └── pix.test.js
├── .github/                 # Configurações GitHub Actions
│   └── workflows/
│       └── ci.yml
├── app.js                   # Aplicação principal
├── package.json
└── README.md
```

## 🔄 Pipeline CI/CD

O projeto inclui um pipeline automatizado configurado com GitHub Actions:

### Trigger
- Executa automaticamente em pushes para a branch `main`

### Etapas do Pipeline
1. **Setup**: Clona o repositório e instala Node.js 18
2. **Dependências**: Instala as dependências com `npm install`
3. **Aplicação**: Inicia a aplicação em background
4. **Testes**: Executa a suite completa de testes
5. **Validação**: Garante que todos os testes passem

### Arquivo de configuração
- Localização: `.github/workflows/ci.yml`
- Configuração: Automática para cada push

---

*Última atualização: Agosto 2025*
