
const request = require('supertest');
const app = require('../app');
const { users, transactions, initializeDatabase } = require('../src/data/inMemoryDatabase');

describe('Account API', () => {
  let initialUsersData;

  beforeEach(() => {
    initializeDatabase(); // Inicializa o banco de dados antes de cada teste
    // Os dados iniciais para 'users' são definidos aqui para garantir consistência
    initialUsersData = JSON.parse(JSON.stringify([
      {
        id: '1',
        name: 'Alice',
        cpf: '111.111.111-11',
        account: {
          agency: '0001',
          number: '12345-6',
          balance: 9000.00,
          dailyPixLimit: 1000.00,
          favoritePixLimit: 5000.00,
          isFavorite: false
        }
      },
      {
        id: '2',
        name: 'Bob',
        cpf: '222.222.222-22',
        account: {
          agency: '0001',
          number: '78901-2',
          balance: 500.00,
          dailyPixLimit: 1000.00,
          favoritePixLimit: 5000.00,
          isFavorite: false
        }
      },
      {
        id: '3',
        name: 'Charlie',
        cpf: '333.333.333-33',
        account: {
          agency: '0001',
          number: '34567-8',
          balance: 2000.00,
          dailyPixLimit: 1000.00,
          favoritePixLimit: 5000.00,
          isFavorite: true
        }
      }
    ]));
    // Limpa o array users e adiciona os dados iniciais
    users.length = 0;
    initialUsersData.forEach(user => users.push(user));
  });

  describe('GET /api/accounts/:accountId/balance', () => {
    test('Deve retornar o saldo da conta para um accountId válido', async () => {
      const accountId = '1';
      const res = await request(app).get(`/api/accounts/${accountId}/balance`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('balance');
      expect(res.body.balance).toEqual(10000.00);
    });

    test('Deve retornar 404 se o accountId não for encontrado', async () => {
      const accountId = '999';
      const res = await request(app).get(`/api/accounts/${accountId}/balance`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.error.message).toEqual('Conta de origem não encontrada.');
    });
  });

  describe('GET /api/accounts/:accountId/statement', () => {
    test('Deve retornar o extrato da conta para um accountId válido', async () => {
      // Adiciona uma transação de teste
      transactions.push({
        id: 'trans1',
        type: 'PIX_TRANSFER',
        senderAccountId: '1',
        receiverCpf: '222.222.222-22',
        amount: 100.00,
        timestamp: new Date().toISOString()
      });

      const accountId = '1';
      const res = await request(app).get(`/api/accounts/${accountId}/statement`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('statement');
      expect(res.body.statement.length).toBeGreaterThan(0);
      expect(res.body.statement[0].amount).toEqual(100.00);
    });

    test('Deve retornar extrato vazio para uma conta sem transações', async () => {
      const accountId = '2'; // Bob tem 500.00, sem transações iniciais
      const res = await request(app).get(`/api/accounts/${accountId}/statement`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('statement');
      expect(res.body.statement).toEqual([]);
    });

    test('Deve retornar 404 se o accountId não for encontrado', async () => {
      const accountId = '999';
      const res = await request(app).get(`/api/accounts/${accountId}/statement`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.error.message).toEqual('Conta de origem não encontrada.');
    });
  });
});
