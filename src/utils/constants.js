
const MESSAGES = {
  ACCOUNT_NOT_FOUND: 'Conta de origem não encontrada.',
  INSUFFICIENT_BALANCE: 'Saldo insuficiente para a transferência.',
  INVALID_AMOUNT: 'Valor da transferência inválido.',
  DAILY_LIMIT_EXCEEDED: 'Limite diário de PIX excedido para sua conta.',
  FAVORITE_LIMIT_EXCEEDED: 'Limite diário de PIX excedido para usuários favoritos.',
  DUPLICATE_TRANSACTION: 'Essa transação já foi realizada.',
  DUPLICATE_TRANSACTION_30_SECONDS: 'Operação duplicada. Uma transferência similar já foi realizada em menos de 30 segundos.',
  TRANSACTION_NOT_FOUND: 'Transação não encontrada para estorno.',
  REFUND_EXPIRED: 'O estorno não pode mais ser realizado. Prazo de 1 minuto excedido.',
  DESTINATION_ACCOUNT_REQUIRED: 'A conta destino é obrigatória.',
  TIMEOUT_ERROR: 'A transferência foi cancelada devido a um timeout.'
};

module.exports = { MESSAGES };

