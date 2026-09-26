// Parses req.body with a zod schema. Invalid input throws a ZodError -> 400 in errorHandler.
// Parsed output replaces the body, so unknown fields (e.g. "role": "admin") are stripped.
export const validate = (schema) => (req, res, next) => {
  req.body = schema.parse(req.body ?? {});
  next();
};
