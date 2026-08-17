export interface ResponseInterface<T> {
  statusCode: number;
  message: string;
  data: T;
}
