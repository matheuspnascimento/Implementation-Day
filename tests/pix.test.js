
const request = require('supertest');
const app = require('../app');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const getDb = () => require('../src/data/inMemoryDatabase');

describe('Pix API', () => {
  let initialUsersData;

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
    
    // Removido o reset manual do array users
    console.log('=== APÓS RESTAURAR USUÁRIOS ===');
    console.log('Saldo de Bob após restaurar:', getDb().users.find(u => u.id === '2').account.balance);
  });

  describe('POST /api/pix/transfer', () => {
    test('Deve realizar uma transferência Pix com sucesso (saldo suficiente)', async () => {
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

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Transferência Pix realizada com sucesso.');
      expect(res.body.transaction).toHaveProperty('id');
      expect(getDb().users.find(u => u.id === senderAccountId).account.balance).toEqual(9900.00);
      expect(getDb().users.find(u => u.cpf === receiverCpf).account.balance).toEqual(600.00);
      expect(getDb().transactions.length).toEqual(1);
      expect(getDb().idempotencyKeys.has(idempotencyKey)).toBe(true);
    });

    test('Deve retornar 400 se o saldo for insuficiente', async () => {
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

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toEqual('Saldo insuficiente para a transferência.');
      expect(getDb().transactions.length).toEqual(0);
    });

    test('Deve retornar 400 se o valor for inválido (menor ou igual a zero)', async () => {
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

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toEqual('Valor da transferência inválido.');
    });

    test('Deve retornar 404 se a conta de origem não for encontrada', async () => {
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

      expect(res.statusCode).toEqual(404);
      expect(res.body.error.message).toEqual('Conta de origem não encontrada.');
    });

    test('Deve retornar 400 se o destinatário não for informado', async () => {
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

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toEqual('A conta destino é obrigatória.');
    });

    test('Deve retornar 409 para transação duplicada com a mesma chave de idempotência e payload', async () => {
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

      expect(res.statusCode).toEqual(409);
      expect(res.body.error.message).toEqual('Essa transação já foi realizada.');
      expect(getDb().transactions.length).toEqual(1); // Apenas uma transação deve ser registrada
    });

    test('Não deve permitir reuso de hash com payload diferente', async () => {
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

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toEqual('Chave de idempotência reutilizada com payload diferente.');
      expect(getDb().transactions.length).toEqual(1);
    });

    test('Deve aplicar o limite diário de R$1000 para usuário comum', async () => {
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

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toEqual('Limite diário de PIX excedido para sua conta.');
      expect(getDb().users.find(u => u.id === senderAccountId).account.balance).toEqual(9000.00);
    });

    test('Deve permitir transferência dentro do limite diário de R$1000 para usuário comum', async () => {
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

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Transferência Pix realizada com sucesso.');
      expect(getDb().users.find(u => u.id === senderAccountId).account.balance).toEqual(9000.00);
    });

    test('Deve aplicar o limite diário de R$5000 para usuário favorito', async () => {
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

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toEqual('Limite diário de PIX excedido para usuários favoritos.');
      expect(getDb().users.find(u => u.id === senderAccountId).account.balance).toEqual(5000.00); // 10000 - 5000 = 5000
    });

    test('Deve simular timeout em caso de perda de conexão', async () => {
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

      expect(res.statusCode).toEqual(504);
      expect(res.body.error.message).toEqual('A transferência foi cancelada devido a um timeout.');
    }, 10000); // Aumenta o timeout para 10 segundos
  });

  describe('POST /api/pix/refund', () => {
    test('Deve realizar o estorno de uma transação Pix dentro do limite de 1 minuto', async () => {
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

      expect(refundRes.statusCode).toEqual(200);
      expect(refundRes.body.message).toEqual('Estorno de Pix realizado com sucesso.');
      expect(getDb().users.find(u => u.id === senderAccountId).account.balance).toEqual(initialSenderBalance + amount);
      expect(getDb().users.find(u => u.cpf === receiverCpf).account.balance).toEqual(initialReceiverBalance - amount);
      expect(getDb().transactions.length).toEqual(0); // A transação deve ser removida após o estorno
      expect(getDb().idempotencyKeys.has(idempotencyKey)).toBe(false);
    });

    test('Deve retornar 404 se a transação para estorno não for encontrada', async () => {
      const transactionId = 'non-existent-id';
      const accountId = '1';

      const res = await request(app)
        .post('/api/pix/refund')
        .send({
          transactionId,
          accountId
        });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error.message).toEqual('Transação não encontrada para estorno.');
    });

    test('Deve retornar 400 se o estorno for realizado após 1 minuto', async () => {
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

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toEqual('O estorno não pode mais ser realizado. Prazo de 1 minuto excedido.');
    });
  });
});
