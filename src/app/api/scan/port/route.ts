import { NextRequest, NextResponse } from 'next/server';
import { PortScanner } from '@/lib/portScanner';
import { PortScanResponse } from '@/types/scanner';

export async function POST(request: NextRequest) {
  try {
    const { target, ports = 'common', timeout = 3000, sessionId } = await request.json();
    
    if (!target) {
      return NextResponse.json({
        success: false,
        error: 'Target IP address is required',
        timestamp: new Date().toISOString(),
        target: ''
      } as PortScanResponse, { status: 400 });
    }

    // Parse ports input
    let portList: number[];
    try {
      portList = PortScanner.parsePorts(ports);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `Invalid ports specification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        target
      } as PortScanResponse, { status: 400 });
    }

    if (portList.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Too many ports specified (max 1000)',
        timestamp: new Date().toISOString(),
        target
      } as PortScanResponse, { status: 400 });
    }

    // Perform port scan
    const portResults = await PortScanner.scanPorts(
      target,
      portList,
      timeout,
      10, // concurrency for port scanning
      (progress, currentPort) => {
        console.log(`Port scan progress: ${progress}% - Current port: ${currentPort}`);
      }
    );

    // Enhance results with service detection for open ports
    const openPorts = portResults.filter(result => result.isOpen);
    if (openPorts.length > 0) {
      const enhancedResults = await PortScanner.detectServices(target, portResults);
      
      return NextResponse.json({
        success: true,
        data: enhancedResults,
        timestamp: new Date().toISOString(),
        target
      } as PortScanResponse);
    }

    return NextResponse.json({
      success: true,
      data: portResults,
      timestamp: new Date().toISOString(),
      target
    } as PortScanResponse);

  } catch (error) {
    console.error('Port scan error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Port scan failed',
      timestamp: new Date().toISOString(),
      target: ''
    } as PortScanResponse, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Use POST method for port scanning',
    timestamp: new Date().toISOString(),
    target: ''
  }, { status: 405 });
}