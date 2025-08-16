const request = require('supertest');
const app = require('../app');
const { users, transactions, idempotencyKeys, initializeDatabase } = require('../src/data/inMemoryDatabase');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

describe('Pix API', () => {
    let initialUsersData;
    initializeDatabase();

    initialUsersData = JSON.parse(JSON.stringify([
      {
        id: '1',
        name: 'Alice',
        cpf: '111.111.111-11',
        account: {
          agency: '0001',
          number: '12345-6',
          balance: 10000.00,
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
          balance: 10000.00,
          dailyPixLimit: 1000.00,
          favoritePixLimit: 5000.00,
          isFavorite: true
        }
      }
    ]));

    users.length = 0;
    initialUsersData.forEach(user => users.push(user));
});

describe('POST /api/pix/transfer', () => {
    test('Deve realizar uma transferência Pix duplicada', async () => {
      const senderAccountId = '1';
      const receiverCpf = '222.222.222-22';
      const amount = 100.00;
      const idempotencyKey = uuidv4();

      await request(app)
      .post('/api/pix/transfer')
      .set('X-Idempotency-Key', idempotencyKey)
      .send({
        senderAccountId,
        receiverCpf,
        amount
      });

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
    expect(transactions.length).toEqual(1); // Apenas uma transação deve ser registrada
  });
    });