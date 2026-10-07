const { AppError } = require('../utils/errors');

function createAnalyzeHandler({ analysis }) {
  return async function analyzeHandler(req, res, next) {
    try {
      const url = req.body?.url;
      if (typeof url !== 'string' || !url.trim()) throw new AppError(400, 'URL is required');
      if (url.length > 500) throw new AppError(400, 'URL is too long (maximum 500 characters)');
      res.json(await analysis.analyze(url.trim()));
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { createAnalyzeHandler };
