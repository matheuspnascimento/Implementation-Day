
let db = {
  users: [
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
        balance: 10000.00, // Aumentado de 2000 para 10000
        dailyPixLimit: 1000.00,
        favoritePixLimit: 5000.00,
        isFavorite: true
      }
    }
  ],
  transactions: [],
  idempotencyKeys: new Map(),
};

const initializeDatabase = () => {
  // Limpa as transações e chaves de idempotência
  db.transactions.length = 0;
  db.idempotencyKeys.clear();
  
  // Restaura os usuários aos valores iniciais (incluindo saldos)
  db.users = JSON.parse(JSON.stringify([
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
        balance: 10000.00, // Aumentado de 2000 para 10000
        dailyPixLimit: 1000.00,
        favoritePixLimit: 5000.00,
        isFavorite: true
      }
    }
  ]));
};

// Inicializa o banco de dados na primeira carga
initializeDatabase();

module.exports = {
  get users() { return db.users; },
  set users(val) { db.users = val; },
  get transactions() { return db.transactions; },
  set transactions(val) { db.transactions = val; },
  get idempotencyKeys() { return db.idempotencyKeys; },
  set idempotencyKeys(val) { db.idempotencyKeys = val; },
  initializeDatabase,
};
