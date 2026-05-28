import { NextResponse } from 'next/server';
import pkg from '../../../../package.json';

export async function GET() {
  return NextResponse.json({
    status: 'pass',
    version: pkg.version,
  });
}
