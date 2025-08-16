
const request = require('supertest');
const assert = require('assert');
const app = require('../app');
const getDb = () => require('../src/data/inMemoryDatabase');

describe('Account API', () => {
  beforeEach(() => {
    getDb().initializeDatabase(); // Inicializa o banco de dados antes de cada teste
  });

  describe('GET /api/accounts/:accountId/balance', () => {
    it('Deve retornar o saldo da conta para um accountId válido', async () => {
      const accountId = '1';
      const res = await request(app).get(`/api/accounts/${accountId}/balance`);
      assert.strictEqual(res.statusCode, 200);
      assert(res.body.hasOwnProperty('balance'));
      assert.strictEqual(res.body.balance, 10000.00);
    });

    it('Deve retornar 404 se o accountId não for encontrado', async () => {
      const accountId = '999';
      const res = await request(app).get(`/api/accounts/${accountId}/balance`);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error.message, 'Conta de origem não encontrada.');
    });
  });

  describe('GET /api/accounts/:accountId/statement', () => {
    it('Deve retornar o extrato da conta para um accountId válido', async () => {
      // Adiciona uma transação de teste
      getDb().transactions.push({
        id: 'trans1',
        type: 'PIX_TRANSFER',
        senderAccountId: '1',
        receiverCpf: '222.222.222-22',
        amount: 100.00,
        timestamp: new Date().toISOString()
      });

      const accountId = '1';
      const res = await request(app).get(`/api/accounts/${accountId}/statement`);
      assert.strictEqual(res.statusCode, 200);
      assert(res.body.hasOwnProperty('statement'));
      assert(res.body.statement.length > 0);
      assert.strictEqual(res.body.statement[0].amount, 100.00);
    });

    it('Deve retornar extrato vazio para uma conta sem transações', async () => {
      const accountId = '2'; // Bob tem 500.00, sem transações iniciais
      const res = await request(app).get(`/api/accounts/${accountId}/statement`);
      assert.strictEqual(res.statusCode, 200);
      assert(res.body.hasOwnProperty('statement'));
      assert.deepStrictEqual(res.body.statement, []);
    });

    it('Deve retornar 404 se o accountId não for encontrado', async () => {
      const accountId = '999';
      const res = await request(app).get(`/api/accounts/${accountId}/statement`);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error.message, 'Conta de origem não encontrada.');
    });
  });
});
