// temporary solution to avoid the error
export function instanceOfNodeError<T extends new (...args: any) => Error>(
  value: unknown | Error,
  errorType: T
): value is InstanceType<T> & NodeJS.ErrnoException {
  return value instanceof errorType;
}
