import type { CommerceErrorCode } from './types';

export class CommerceDomainError extends Error {
  readonly code: CommerceErrorCode;
  readonly details: Readonly<Record<string, string | number | boolean | null>>;

  constructor(
    code: CommerceErrorCode,
    message: string,
    details: Readonly<Record<string, string | number | boolean | null>> = {},
  ) {
    super(message);
    this.name = 'CommerceDomainError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

