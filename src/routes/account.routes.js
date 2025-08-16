
const express = require('express');
const { getAccountBalance, getAccountStatement } = require('../controllers/account.controller');

const router = express.Router();

/**
 * @swagger
 * /api/accounts/{accountId}/balance:
 *   get:
 *     summary: Retorna o saldo da conta.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         description: ID da conta.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Saldo da conta retornado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   format: float
 *                   description: Saldo atual da conta.
 *       404:
 *         description: Conta não encontrada.
 */
router.get('/:accountId/balance', getAccountBalance);

/**
 * @swagger
 * /api/accounts/{accountId}/statement:
 *   get:
 *     summary: Retorna o extrato da conta.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         description: ID da conta.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Extrato da conta retornado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statement:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       senderAccountId:
 *                         type: string
 *                       receiverAccountId:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Conta não encontrada.
 */
router.get('/:accountId/statement', getAccountStatement);

module.exports = router;

