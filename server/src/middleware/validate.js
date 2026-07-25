/**
 * Validates req.body / req.params / req.query against a Zod schema:
 *   validate({ body: registerSchema })
 * Parsed (and stripped) values replace the originals so downstream
 * layers only ever see sanitized input.
 */
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
    next();
  } catch (error) {
    next(error); // ZodError is normalized by the error handler
  }
};

export default validate;
