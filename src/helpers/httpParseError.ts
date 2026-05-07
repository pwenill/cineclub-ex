interface HttpParseError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

export function isHttpParseError(err: unknown): err is HttpParseError {
  return err instanceof Error && ('status' in err || 'statusCode' in err || 'type' in err);
}
