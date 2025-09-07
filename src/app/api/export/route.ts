import { NextRequest, NextResponse } from 'next/server';
import { DeviceInfo, ScanSession, ExportFormat } from '@/types/scanner';

export async function POST(request: NextRequest) {
  try {
    const { results, session, config }: {
      results: DeviceInfo[];
      session: ScanSession;
      config: ExportFormat;
    } = await request.json();
    
    if (!results || !Array.isArray(results)) {
      return NextResponse.json({
        success: false,
        error: 'Results array is required'
      }, { status: 400 });
    }

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session information is required'
      }, { status: 400 });
    }

    if (!config || !config.format) {
      return NextResponse.json({
        success: false,
        error: 'Export configuration is required'
      }, { status: 400 });
    }

    // Filter results based on config
    const filteredResults = config.includeInactiveDevices 
      ? results 
      : results.filter(device => device.isActive);

    let exportData: string;
    let contentType: string;
    let fileExtension: string;

    switch (config.format) {
      case 'json':
        exportData = JSON.stringify({
          metadata: {
            exportDate: new Date().toISOString(),
            scanDate: session.startTime.toISOString(),
            target: session.configuration.target,
            scanType: session.configuration.scanType,
            totalDevices: filteredResults.length,
            activeDevices: filteredResults.filter(d => d.isActive).length,
            configuration: session.configuration
          },
          devices: filteredResults.map(device => ({
            ip: device.ip,
            hostname: device.hostname || null,
            isActive: device.isActive,
            responseTime: device.responseTime || null,
            ports: config.includePortDetails 
              ? device.ports 
              : device.ports?.filter(p => p.isOpen) || [],
            lastScanned: device.lastScanned.toISOString()
          }))
        }, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;

      case 'csv':
        const csvHeaders = [
          'IP Address',
          'Hostname',
          'Status',
          'Response Time (ms)',
          'Open Ports',
          'Services',
          'Last Scanned'
        ];

        const csvRows = filteredResults.map(device => {
          const openPorts = device.ports?.filter(p => p.isOpen) || [];
          return [
            device.ip,
            device.hostname || '',
            device.isActive ? 'Active' : 'Inactive',
            device.responseTime?.toString() || '',
            openPorts.map(p => p.port).join(';'),
            openPorts.map(p => p.service || 'Unknown').join(';'),
            device.lastScanned.toISOString()
          ].map(field => `"${field.replace(/"/g, '""')}"`).join(',');
        });

        exportData = [
          csvHeaders.map(h => `"${h}"`).join(','),
          ...csvRows
        ].join('\n');
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;

      case 'xml':
        exportData = `<?xml version="1.0" encoding="UTF-8"?>
<NetworkScan>
  <Metadata>
    <ExportDate>${new Date().toISOString()}</ExportDate>
    <ScanDate>${session.startTime.toISOString()}</ScanDate>
    <Target>${session.configuration.target}</Target>
    <ScanType>${session.configuration.scanType}</ScanType>
    <TotalDevices>${filteredResults.length}</TotalDevices>
    <ActiveDevices>${filteredResults.filter(d => d.isActive).length}</ActiveDevices>
  </Metadata>
  <Devices>
${filteredResults.map(device => `    <Device>
      <IP>${device.ip}</IP>
      <Hostname>${device.hostname || ''}</Hostname>
      <Status>${device.isActive ? 'Active' : 'Inactive'}</Status>
      <ResponseTime>${device.responseTime || ''}</ResponseTime>
      <LastScanned>${device.lastScanned.toISOString()}</LastScanned>
      <Ports>
${(device.ports || [])
  .filter(p => config.includePortDetails || p.isOpen)
  .map(port => `        <Port>
          <Number>${port.port}</Number>
          <Status>${port.isOpen ? 'Open' : 'Closed'}</Status>
          <Service>${port.service || 'Unknown'}</Service>
          <ResponseTime>${port.responseTime || ''}</ResponseTime>
        </Port>`).join('\n')}
      </Ports>
    </Device>`).join('\n')}
  </Devices>
</NetworkScan>`;
        contentType = 'application/xml';
        fileExtension = 'xml';
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Unsupported export format'
        }, { status: 400 });
    }

    // Create response with appropriate headers for file download
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `network-scan-${timestamp}.${fileExtension}`;

    const response = new NextResponse(exportData);
    response.headers.set('Content-Type', contentType);
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    response.headers.set('Cache-Control', 'no-cache');

    return response;

  } catch (error) {
    console.error('Export error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Use POST method for exporting results'
  }, { status: 405 });
}