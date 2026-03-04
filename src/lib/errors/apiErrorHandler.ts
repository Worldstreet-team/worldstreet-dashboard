import { NextResponse } from 'next/server';
import {
  ValidationError,
  NotFoundError,
  ResourceExhaustedError,
  SystemError,
  TransactionError
} from './drift-errors';

export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error);
  
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details
      },
      { status: 400 }
    );
  }
  
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 404 }
    );
  }
  
  if (error instanceof ResourceExhaustedError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 409 }
    );
  }
  
  if (error instanceof TransactionError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        signature: error.signature,
        cause: error.cause?.message
      },
      { status: 500 }
    );
  }
  
  if (error instanceof SystemError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        cause: error.cause?.message
      },
      { status: 500 }
    );
  }
  
  // Generic error
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    },
    { status: 500 }
  );
}
