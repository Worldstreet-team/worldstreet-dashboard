import { NextResponse } from 'next/server';

export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error);
  
  // Handle basic Error objects
  if (error instanceof Error) {
    const status = (error as any).status || (error as any).statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: (error as any).details || (error as any).cause || null,
        code: (error as any).code || 'INTERNAL_SERVER_ERROR'
      },
      { status: typeof status === 'number' ? status : 500 }
    );
  }
  
  // Generic fallback error
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      message: typeof error === 'string' ? error : 'Internal server error'
    },
    { status: 500 }
  );
}
