import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseBuilder<T = any, P = any> {
  @Exclude() private readonly _data: T;
  @Exclude() private readonly _message: string;
  @Exclude() private readonly _code: string;
  @Exclude() private readonly _meta: P;
  @Exclude() private readonly _timestamp: string;

  static OK(): ResponseBuilder<string, string> {
    return new ResponseBuilder<string, string>(
      '',
      '',
      'SUCCESS',
      '',
      new Date().toISOString(),
    );
  }

  static OK_WITH<T, P>(data?: T, meta?: P): ResponseBuilder<T, P> {
    return new ResponseBuilder(
      data,
      '',
      'SUCCESS',
      meta,
      new Date().toISOString(),
    );
  }

  static Error<T = any, P = any>(
    message: string,
    code: string,
    meta?: P,
  ): ResponseBuilder<T, P> {
    return new ResponseBuilder<T, P>(
      null,
      message,
      code,
      meta,
      new Date().toISOString(),
    );
  }

  private constructor(
    data: T,
    message: string,
    code: string,
    meta: P,
    timestamp: string,
  ) {
    this._data = data;
    this._message = message;
    this._code = code;
    this._meta = meta;
    this._timestamp = timestamp;
  }

  @ApiProperty()
  @Expose()
  get data(): T {
    return this._data;
  }

  @ApiProperty()
  @Expose()
  get message(): string {
    return this._message;
  }

  @ApiProperty()
  @Expose()
  get code(): string {
    return this._code;
  }

  @ApiProperty()
  @Expose()
  get timestamp(): string {
    return this._timestamp;
  }

  @ApiProperty()
  @Expose()
  get meta(): P {
    return this._meta;
  }
}
