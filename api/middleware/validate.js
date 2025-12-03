import createError from '../utils/createError.js';

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    if (err.errors) {
      const errorMessage = err.errors.map((e) => e.message).join(', ');
      return next(createError(400, errorMessage));
    }
    next(err);
  }
};

export default validate;
