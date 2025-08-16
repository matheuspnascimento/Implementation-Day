
const request = require('supertest');
const assert = require('assert');
const app = require('../app');
const getDb = () => require('../src/data/inMemoryDatabase');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

describe('Pix API', () => {
  beforeEach(() => {
    console.log('=== ANTES DO TESTE ===');
    console.log('Transações antes de limpar:', getDb().transactions.length);
    console.log('Chaves de idempotência antes de limpar:', getDb().idempotencyKeys.size);
    console.log('Saldo de Bob antes de limpar:', getDb().users.find(u => u.id === '2').account.balance);
    
    getDb().initializeDatabase(); // Limpa transações e chaves de idempotência
    
    console.log('=== APÓS LIMPEZA ===');
    console.log('Transações após limpar:', getDb().transactions.length);
    console.log('Chaves de idempotência após limpar:', getDb().idempotencyKeys.size);
    console.log('Saldo de Bob após limpar:', getDb().users.find(u => u.id === '2').account.balance);
    
    console.log('=== APÓS RESTAURAR USUÁRIOS ===');
    console.log('Saldo de Bob após restaurar:', getDb().users.find(u => u.id === '2').account.balance);
  });

  describe('POST /api/pix/transfer', () => {
    it('Deve realizar uma transferência Pix com sucesso (saldo suficiente)', async () => {
      const senderAccountId = '1'; // Alice
      const receiverCpf = '222.222.222-22'; // Bob
      const amount = 100.00;
      const idempotencyKey = uuidv4();

      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.message, 'Transferência Pix realizada com sucesso.');
      assert(res.body.transaction.hasOwnProperty('id'));
      assert.strictEqual(getDb().users.find(u => u.id === senderAccountId).account.balance, 9900.00);
      assert.strictEqual(getDb().users.find(u => u.cpf === receiverCpf).account.balance, 600.00);
      assert.strictEqual(getDb().transactions.length, 1);
      assert(getDb().idempotencyKeys.has(idempotencyKey));
    });

    it('Deve retornar 400 se o saldo for insuficiente', async () => {
      const senderAccountId = '2'; // Bob (saldo 500)
      const receiverCpf = '111.111.111-11'; // Alice
      const amount = 600.00;
      const idempotencyKey = uuidv4();

      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.message, 'Saldo insuficiente para a transferência.');
      assert.strictEqual(getDb().transactions.length, 0);
    });

    it('Deve retornar 400 se o valor for inválido (menor ou igual a zero)', async () => {
      const senderAccountId = '1';
      const receiverCpf = '222.222.222-22';
      const amount = 0;
      const idempotencyKey = uuidv4();

      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.message, 'Valor da transferência inválido.');
    });

    it('Deve retornar 404 se a conta de origem não for encontrada', async () => {
      const senderAccountId = '999';
      const receiverCpf = '222.222.222-22';
      const amount = 100.00;
      const idempotencyKey = uuidv4();

      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error.message, 'Conta de origem não encontrada.');
    });

    it('Deve retornar 400 se o destinatário não for informado', async () => {
      const senderAccountId = '1';
      const amount = 100.00;
      const idempotencyKey = uuidv4();

      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          amount
        });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.message, 'A conta destino é obrigatória.');
    });

    it('Deve retornar 409 para transação duplicada com a mesma chave de idempotência e payload', async () => {
      const senderAccountId = '1';
      const receiverCpf = '222.222.222-22';
      const amount = 100.00;
      const idempotencyKey = uuidv4();

      // Primeira transação
      await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      // Segunda transação com a mesma chave de idempotência e payload
      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.body.error.message, 'Essa transação já foi realizada.');
      assert.strictEqual(getDb().transactions.length, 1); // Apenas uma transação deve ser registrada
    });

    it('Não deve permitir reuso de hash com payload diferente', async () => {
      const senderAccountId = '1';
      const receiverCpf = '222.222.222-22';
      const amount = 100.00;
      const idempotencyKey = uuidv4();

      // Primeira transação
      await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      // Tentativa de reuso da mesma chave com payload diferente
      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount: 200.00 // Valor diferente
        });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.message, 'Chave de idempotência reutilizada com payload diferente.');
      assert.strictEqual(getDb().transactions.length, 1);
    });

    it('Deve aplicar o limite diário de R$1000 para usuário comum', async () => {
      const senderAccountId = '1'; // Alice
      const receiverCpf = '222.222.222-22'; // Bob

      // Realiza várias transferências para atingir o limite
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/pix/transfer')
          .set('X-Idempotency-Key', uuidv4())
          .send({
            senderAccountId,
            receiverCpf,
            amount: 100.00
          });
      }

      // Tenta uma transferência que exceda o limite
      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', uuidv4())
        .send({
          senderAccountId,
          receiverCpf,
          amount: 1.00
        });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.message, 'Limite diário de PIX excedido para sua conta.');
      assert.strictEqual(getDb().users.find(u => u.id === senderAccountId).account.balance, 9000.00);
    });

    it('Deve permitir transferência dentro do limite diário de R$1000 para usuário comum', async () => {
      const senderAccountId = '1'; // Alice
      const receiverCpf = '222.222.222-22'; // Bob

      // Realiza várias transferências que não excedam o limite
      for (let i = 0; i < 9; i++) {
        await request(app)
          .post('/api/pix/transfer')
          .set('X-Idempotency-Key', uuidv4())
          .send({
            senderAccountId,
            receiverCpf,
            amount: 100.00
          });
      }

      // Tenta uma transferência que ainda está dentro do limite
      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', uuidv4())
        .send({
          senderAccountId,
          receiverCpf,
          amount: 100.00
        });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.message, 'Transferência Pix realizada com sucesso.');
      assert.strictEqual(getDb().users.find(u => u.id === senderAccountId).account.balance, 9000.00);
    });

    it('Deve aplicar o limite diário de R$5000 para usuário favorito', async () => {
      const senderAccountId = '3'; // Charlie (favorito)
      const receiverCpf = '222.222.222-22'; // Bob

      // Realiza várias transferências para atingir o limite (dentro do saldo disponível)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/pix/transfer')
          .set('X-Idempotency-Key', uuidv4())
          .send({
            senderAccountId,
            receiverCpf,
            amount: 1000.00 // 5 * 1000 = 5000 (atinge exatamente o limite de 5000)
          });
      }

      // Tenta uma transferência que exceda o limite diário
      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', uuidv4())
        .send({
          senderAccountId,
          receiverCpf,
          amount: 1000.00 // Isso deve exceder o limite de 5000 (5 + 1 = 6 * 1000 = 6000)
        });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.message, 'Limite diário de PIX excedido para usuários favoritos.');
      assert.strictEqual(getDb().users.find(u => u.id === senderAccountId).account.balance, 5000.00); // 10000 - 5000 = 5000
    });

    it('Deve simular timeout em caso de perda de conexão', async () => {
      const senderAccountId = '1';
      const receiverCpf = '222.222.222-22';
      const amount = 100.00;
      const idempotencyKey = uuidv4();

      const res = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .set('x-simulate-timeout', 'true') // Ativa a simulação de timeout
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      assert.strictEqual(res.statusCode, 504);
      assert.strictEqual(res.body.error.message, 'A transferência foi cancelada devido a um timeout.');
    });
  });

  describe('POST /api/pix/refund', () => {
    it('Deve realizar o estorno de uma transação Pix dentro do limite de 1 minuto', async () => {
      const senderAccountId = '1';
      const receiverCpf = '222.222.222-22';
      const amount = 100.00;
      const idempotencyKey = uuidv4();

      // Realiza uma transação Pix primeiro
      const transferRes = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      const transactionId = transferRes.body.transaction.id;

      const initialSenderBalance = getDb().users.find(u => u.id === senderAccountId).account.balance;
      const initialReceiverBalance = getDb().users.find(u => u.cpf === receiverCpf).account.balance;

      // Realiza o estorno
      const refundRes = await request(app)
        .post('/api/pix/refund')
        .send({
          transactionId,
          accountId: senderAccountId
        });

      assert.strictEqual(refundRes.statusCode, 200);
      assert.strictEqual(refundRes.body.message, 'Estorno de Pix realizado com sucesso.');
      assert.strictEqual(getDb().users.find(u => u.id === senderAccountId).account.balance, initialSenderBalance + amount);
      assert.strictEqual(getDb().users.find(u => u.cpf === receiverCpf).account.balance, initialReceiverBalance - amount);
      assert.strictEqual(getDb().transactions.length, 0); // A transação deve ser removida após o estorno
      assert(!getDb().idempotencyKeys.has(idempotencyKey));
    });

    it('Deve retornar 404 se a transação para estorno não for encontrada', async () => {
      const transactionId = 'non-existent-id';
      const accountId = '1';

      const res = await request(app)
        .post('/api/pix/refund')
        .send({
          transactionId,
          accountId
        });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error.message, 'Transação não encontrada para estorno.');
    });

    it('Deve retornar 400 se o estorno for realizado após 1 minuto', async () => {
      const senderAccountId = '1';
      const receiverCpf = '222.222.222-22';
      const amount = 100.00;
      const idempotencyKey = uuidv4();

      // Realiza uma transação Pix primeiro
      const transferRes = await request(app)
        .post('/api/pix/transfer')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          senderAccountId,
          receiverCpf,
          amount
        });

      const transactionId = transferRes.body.transaction.id;

      // Simula o passar do tempo (mais de 1 minuto)
      const transaction = getDb().transactions.find(t => t.id === transactionId);
      if (transaction) {
        transaction.timestamp = moment().subtract(2, 'minutes').toDate();
      }

      // Tenta realizar o estorno
      const res = await request(app)
        .post('/api/pix/refund')
        .send({
          transactionId,
          accountId: senderAccountId
        });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.message, 'O estorno não pode mais ser realizado. Prazo de 1 minuto excedido.');
    });
  });
});
