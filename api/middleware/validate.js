import createError from '../utils/createError.js';

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errorMessage = result.error.issues.map((issue) => issue.message).join(', ');
    return next(createError(400, errorMessage));
  }

  // Use the parsed body so fields that are not in the schema never reach the controllers.
  if (result.data.body) req.body = result.data.body;
  next();
};

export default validate;
