
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor.';

  res.status(statusCode).json({
    error: {
      message,
      code: err.code || 'INTERNAL_SERVER_ERROR'
    }
  });
};

module.exports = errorHandler;

