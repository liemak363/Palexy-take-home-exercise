/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

import { Injectable, StreamableFile } from '@nestjs/common';
import { CallHandler, NestInterceptor } from '@nestjs/common/interfaces';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseInterface } from './response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseInterface<T> | StreamableFile> {
    const ctx = context.switchToHttp();

    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) {
          return data;
        }
        return {
          statusCode: response.statusCode,
          message: this.getDefaultMessage(response.statusCode),
          data,
        };
      }),
    );
  }

  private getDefaultMessage(statusCode: number): string {
    const map = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      404: 'Not Found',
      500: 'Internal Server Error',
    };
    return map[statusCode] ?? '';
  }
}
