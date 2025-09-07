import { NextRequest, NextResponse } from 'next/server';
import { NetworkUtils } from '@/lib/networkUtils';
import { HostnameResponse } from '@/types/scanner';

export async function POST(request: NextRequest) {
  try {
    const { ip, sessionId } = await request.json();
    
    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'IP address is required',
        timestamp: new Date().toISOString(),
        ip: ''
      } as HostnameResponse, { status: 400 });
    }

    // Validate IP format
    if (!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid IP address format',
        timestamp: new Date().toISOString(),
        ip
      } as HostnameResponse, { status: 400 });
    }

    // Resolve hostname
    const hostname = await NetworkUtils.resolveHostname(ip);
    
    if (hostname) {
      return NextResponse.json({
        success: true,
        data: hostname,
        timestamp: new Date().toISOString(),
        ip
      } as HostnameResponse);
    } else {
      return NextResponse.json({
        success: false,
        error: 'Could not resolve hostname',
        timestamp: new Date().toISOString(),
        ip
      } as HostnameResponse);
    }

  } catch (error) {
    console.error('Hostname resolution error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Hostname resolution failed',
      timestamp: new Date().toISOString(),
      ip: ''
    } as HostnameResponse, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Use POST method for hostname resolution',
    timestamp: new Date().toISOString(),
    ip: ''
  }, { status: 405 });
}