
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('../../src/data/inMemoryDatabase');
const { MESSAGES } = require('../utils/constants');

function generateIdempotencyKey({ senderAccountId, receiverCpf, amount }) {
  const str = `${senderAccountId}:${receiverCpf}:${amount}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}

const processPixTransfer = (req, res, next) => {
  let { senderAccountId, receiverCpf, amount, idempotencyKey } = req.body;

  // Sempre pegue as referências atualizadas
  const users = db.users;
  const transactions = db.transactions;
  const idempotencyKeys = db.idempotencyKeys;

  // Buscar a chave de idempotência do header ou do body
  idempotencyKey = req.header('X-Idempotency-Key') || idempotencyKey;
  if (!idempotencyKey) {
    idempotencyKey = generateIdempotencyKey({ senderAccountId, receiverCpf, amount });
  }

  // Validação da chave de idempotência
  if (db.idempotencyKeys.has(idempotencyKey)) {
    const existingTransaction = db.idempotencyKeys.get(idempotencyKey);
    if (
      existingTransaction.amount === amount &&
      existingTransaction.receiverCpf === receiverCpf &&
      existingTransaction.senderAccountId === senderAccountId
    ) {
      // Retorna a transação já existente, sem criar nova
      return res.status(409).json({ error: { message: MESSAGES.DUPLICATE_TRANSACTION, code: 'DUPLICATE_TRANSACTION' }, idempotencyKey });
    } else {
      // Não altera saldo, não cria transação
      return res.status(400).json({ error: { message: 'Chave de idempotência reutilizada com payload diferente.', code: 'IDEMPOTENCY_KEY_REUSED' }, idempotencyKey });
    }
  }

  // Simulação de perda de conexão (opcional - para teste de timeout)
  if (req.headers['x-simulate-timeout'] === 'true') {
    return res.status(504).json({ error: { message: MESSAGES.TIMEOUT_ERROR, code: 'TIMEOUT_ERROR' } });
  }

  // Validações básicas
  if (!receiverCpf) {
    return res.status(400).json({ error: { message: MESSAGES.DESTINATION_ACCOUNT_REQUIRED, code: 'DESTINATION_ACCOUNT_REQUIRED' }, idempotencyKey });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: { message: MESSAGES.INVALID_AMOUNT, code: 'INVALID_AMOUNT' }, idempotencyKey });
  }
  const senderUser = db.users.find(u => u.id === senderAccountId);
  const receiverUser = db.users.find(u => u.cpf === receiverCpf);
  if (!senderUser) {
    return res.status(404).json({ error: { message: MESSAGES.ACCOUNT_NOT_FOUND, code: 'ACCOUNT_NOT_FOUND' }, idempotencyKey });
  }

  // Validação de limites diários
  const today = moment().startOf('day');
  const todayTransactions = db.transactions.filter(
    t => t.senderAccountId === senderAccountId && moment(t.timestamp).isSame(today, 'day')
  );
  const dailyTransferredAmount = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
  if (!senderUser.account.isFavorite) {
    if ((dailyTransferredAmount + amount) > senderUser.account.dailyPixLimit) {
      return res.status(400).json({ error: { message: MESSAGES.DAILY_LIMIT_EXCEEDED, code: 'DAILY_LIMIT_EXCEEDED' }, idempotencyKey });
    }
  } else {
    if ((dailyTransferredAmount + amount) > senderUser.account.favoritePixLimit) {
      return res.status(400).json({ error: { message: MESSAGES.FAVORITE_LIMIT_EXCEEDED, code: 'FAVORITE_LIMIT_EXCEEDED' }, idempotencyKey });
    }
  }

  // Validação de saldo insuficiente
  if (senderUser.account.balance < amount) {
    return res.status(400).json({ error: { message: MESSAGES.INSUFFICIENT_BALANCE, code: 'INSUFFICIENT_BALANCE' }, idempotencyKey });
  }

  console.log('✅ LIMITE DIÁRIO OK - passou para validação de saldo');

  // Criação da transação
  const newTransaction = {
    id: uuidv4(),
    idempotencyKey,
    type: 'PIX_TRANSFER',
    senderAccountId,
    receiverCpf,
    amount,
    timestamp: new Date()
  };

  // Atualiza saldos
  senderUser.account.balance -= amount;
  if (receiverUser) {
    receiverUser.account.balance += amount;
  }

  db.transactions.push(newTransaction);
  db.idempotencyKeys.set(idempotencyKey, newTransaction);

  res.status(200).json({ message: 'Transferência Pix realizada com sucesso.', transaction: newTransaction, idempotencyKey });
};

const processPixRefund = (req, res) => {
  const { transactionId, accountId } = req.body;

  const senderUser = db.users.find(u => u.id === accountId);
  const transactions = db.transactions;
  const idempotencyKeys = db.idempotencyKeys;

  const transactionToRefund = transactions.find(t => t.id === transactionId && t.senderAccountId === accountId);

  if (!transactionToRefund) {
    return res.status(404).json({ error: { message: MESSAGES.TRANSACTION_NOT_FOUND, code: 'TRANSACTION_NOT_FOUND' } });
  }

  const oneMinuteAgo = moment().subtract(1, 'minute');
  if (moment(transactionToRefund.timestamp).isBefore(oneMinuteAgo)) {
    return res.status(400).json({ error: { message: MESSAGES.REFUND_EXPIRED, code: 'REFUND_EXPIRED' } });
  }

  const receiverUser = db.users.find(u => u.cpf === transactionToRefund.receiverCpf);

  // Estorna o valor
  senderUser.account.balance += transactionToRefund.amount;
  if (receiverUser) {
    receiverUser.account.balance -= transactionToRefund.amount;
  }

  // Marca a transação como estornada (ou remove, dependendo da regra de negócio)
  transactions.splice(transactions.indexOf(transactionToRefund), 1);
  // Opcional: remover a chave de idempotência se a transação for completamente revertida
  idempotencyKeys.delete(transactionToRefund.idempotencyKey);

  res.status(200).json({ message: 'Estorno de Pix realizado com sucesso.', refundedTransaction: transactionToRefund });
};

module.exports = {
  processPixTransfer,
  processPixRefund
};
