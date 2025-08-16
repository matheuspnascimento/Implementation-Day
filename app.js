
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const accountRoutes = require('./src/routes/account.routes');
const pixRoutes = require('./src/routes/pix.routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Carregar a especificação Swagger YAML
const swaggerDocument = YAML.load(path.join(__dirname, './src/docs/swagger.yaml'));

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());

// Rotas da API
app.use('/api/accounts', accountRoutes);
app.use('/api/pix', pixRoutes);

// Rota para a documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicia o servidor apenas se o arquivo for executado diretamente
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Documentação Swagger disponível em http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app; // Exporta a instância do app para ser usada nos testes
