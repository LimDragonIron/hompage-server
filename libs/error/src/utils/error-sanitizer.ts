export const sanitizeError = (error: any) => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    ...error,
    stack: isProduction ? undefined : error.stack,
    meta: filterSensitiveData(error.meta),
  };
};

const filterSensitiveData = (meta: any) => {
  if (!meta) return null;
  const sensitiveKeys = ['password', 'token', 'creditCard'];

  return Object.fromEntries(
    Object.entries(meta).filter(([key]) => !sensitiveKeys.includes(key)),
  );
};
