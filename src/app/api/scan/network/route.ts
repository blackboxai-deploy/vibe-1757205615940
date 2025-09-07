import { NextRequest, NextResponse } from 'next/server';
import { NetworkUtils } from '@/lib/networkUtils';
import { DeviceInfo, NetworkScanResponse } from '@/types/scanner';

export async function POST(request: NextRequest) {
  try {
    const { target, timeout = 3000, concurrency = 50, sessionId } = await request.json();
    
    if (!target) {
      return NextResponse.json({
        success: false,
        error: 'Target IP range is required',
        timestamp: new Date().toISOString()
      } as NetworkScanResponse, { status: 400 });
    }

    // Parse the target range
    const networkRange = NetworkUtils.parseIPRange(target);
    const ipList = NetworkUtils.generateIPList(networkRange);
    
    if (ipList.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid IP addresses in range',
        timestamp: new Date().toISOString()
      } as NetworkScanResponse, { status: 400 });
    }

    if (ipList.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'IP range too large (max 1000 hosts)',
        timestamp: new Date().toISOString()
      } as NetworkScanResponse, { status: 400 });
    }

    // Perform network discovery
    const scanResults = await NetworkUtils.discoverNetwork(
      ipList,
      timeout,
      concurrency,
      (progress, currentTarget) => {
        // In a real implementation, you might want to use WebSockets or Server-Sent Events
        // to provide real-time progress updates to the client
        console.log(`Scan progress: ${progress}% - Current target: ${currentTarget}`);
      }
    );

    // Convert scan results to DeviceInfo format
    const devices: DeviceInfo[] = scanResults.map(result => ({
      ip: result.ip,
      hostname: undefined, // Will be resolved separately if requested
      isActive: result.isActive,
      responseTime: result.responseTime,
      ports: [], // Will be populated by port scan if requested
      lastScanned: new Date()
    }));

    return NextResponse.json({
      success: true,
      data: devices,
      timestamp: new Date().toISOString()
    } as NetworkScanResponse);

  } catch (error) {
    console.error('Network scan error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Network scan failed',
      timestamp: new Date().toISOString()
    } as NetworkScanResponse, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Use POST method for network scanning',
    timestamp: new Date().toISOString()
  }, { status: 405 });
}