
const express = require('express');
const { processPixTransfer, processPixRefund } = require('../controllers/pix.controller');

const router = express.Router();

// Removido o middleware extractIdempotencyKey

/**
 * @swagger
 * /api/pix/transfer:
 *   post:
 *     summary: Realiza uma transferência Pix.
 *     parameters:
 *       - in: header
 *         name: X-Idempotency-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: Chave de idempotência para a transação.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderAccountId
 *               - receiverCpf
 *               - amount
 *             properties:
 *               senderAccountId:
 *                 type: string
 *                 description: ID da conta de origem.
 *               receiverCpf:
 *                 type: string
 *                 description: CPF do destinatário do Pix.
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Valor da transferência.
 *     responses:
 *       200:
 *         description: Transferência Pix realizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     idempotencyKey:
 *                       type: string
 *                     type:
 *                       type: string
 *                     senderAccountId:
 *                       type: string
 *                     receiverCpf:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Requisição inválida (saldo insuficiente, limite excedido, valor inválido).
 *       404:
 *         description: Conta de origem não encontrada.
 *       409:
 *         description: Transação duplicada (chave de idempotência já utilizada).
 *       504:
 *         description: Timeout (simulado para teste de perda de conexão).
 */
router.post('/transfer', processPixTransfer);

/**
 * @swagger
 * /api/pix/refund:
 *   post:
 *     summary: Realiza o estorno de uma transferência Pix.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - accountId
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: ID da transação a ser estornada.
 *               accountId:
 *                 type: string
 *                 description: ID da conta que solicitou o estorno (o remetente original).
 *     responses:
 *       200:
 *         description: Estorno de Pix realizado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 refundedTransaction:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     idempotencyKey:
 *                       type: string
 *                     type:
 *                       type: string
 *                     senderAccountId:
 *                       type: string
 *                     receiverCpf:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Estorno não permitido (prazo excedido).
 *       404:
 *         description: Transação não encontrada.
 */
router.post('/refund', processPixRefund);

module.exports = router;

