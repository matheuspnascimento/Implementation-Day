
const { users, transactions } = require('../../src/data/inMemoryDatabase');
const { MESSAGES } = require('../utils/constants');

const getAccountBalance = (req, res) => {
  const { accountId } = req.params;
  const user = users.find(u => u.id === accountId);

  if (!user) {
    return res.status(404).json({ error: { message: MESSAGES.ACCOUNT_NOT_FOUND, code: 'ACCOUNT_NOT_FOUND' } });
  }

  res.status(200).json({ balance: user.account.balance });
};

const getAccountStatement = (req, res) => {
  const { accountId } = req.params;
  const user = users.find(u => u.id === accountId);

  if (!user) {
    return res.status(404).json({ error: { message: MESSAGES.ACCOUNT_NOT_FOUND, code: 'ACCOUNT_NOT_FOUND' } });
  }

  const userTransactions = transactions.filter(
    t => t.senderAccountId === accountId || t.receiverAccountId === accountId
  );

  res.status(200).json({ statement: userTransactions });
};

module.exports = {
  getAccountBalance,
  getAccountStatement
};
