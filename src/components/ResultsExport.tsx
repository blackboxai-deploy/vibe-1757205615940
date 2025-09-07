"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DeviceInfo, ScanSession, ExportFormat } from "@/types/scanner";

interface ResultsExportProps {
  results: DeviceInfo[];
  session: ScanSession;
}

export function ResultsExport({ results, session }: ResultsExportProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'xml'>('json');
  const [includeInactiveDevices, setIncludeInactiveDevices] = useState(false);
  const [includePortDetails, setIncludePortDetails] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const activeDevices = results.filter(device => device.isActive);
  const inactiveDevices = results.filter(device => !device.isActive);
  const devicesWithPorts = results.filter(device => device.ports && device.ports.length > 0);

  const handleExport = async () => {
    setIsExporting(true);

    const exportConfig: ExportFormat = {
      format: exportFormat,
      includeInactiveDevices,
      includePortDetails
    };

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results: results,
          session: session,
          config: exportConfig
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `network-scan-${timestamp}.${exportFormat}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const generatePreview = () => {
    const filteredResults = includeInactiveDevices 
      ? results 
      : results.filter(device => device.isActive);

    switch (exportFormat) {
      case 'json':
        return JSON.stringify({
          metadata: {
            scanDate: session.startTime.toISOString(),
            target: session.configuration.target,
            scanType: session.configuration.scanType,
            totalDevices: filteredResults.length,
            activeDevices: filteredResults.filter(d => d.isActive).length
          },
          devices: filteredResults.map(device => ({
            ip: device.ip,
            hostname: device.hostname || null,
            isActive: device.isActive,
            responseTime: device.responseTime || null,
            ports: includePortDetails ? device.ports : device.ports?.filter(p => p.isOpen) || [],
            lastScanned: device.lastScanned.toISOString()
          }))
        }, null, 2);

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
            openPorts.map(p => p.service).join(';'),
            device.lastScanned.toISOString()
          ].map(field => `"${field}"`).join(',');
        });

        return [csvHeaders.map(h => `"${h}"`).join(','), ...csvRows].join('\n');

      case 'xml':
        return `<?xml version="1.0" encoding="UTF-8"?>
<NetworkScan>
  <Metadata>
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
${(device.ports || []).filter(p => includePortDetails || p.isOpen).map(port => `        <Port>
          <Number>${port.port}</Number>
          <Status>${port.isOpen ? 'Open' : 'Closed'}</Status>
          <Service>${port.service}</Service>
          <ResponseTime>${port.responseTime || ''}</ResponseTime>
        </Port>`).join('\n')}
      </Ports>
    </Device>`).join('\n')}
  </Devices>
</NetworkScan>`;

      default:
        return 'Invalid format';
    }
  };

  const preview = generatePreview();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Scan Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Devices</p>
              <p className="text-2xl font-bold">{results.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-500">{activeDevices.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">With Ports</p>
              <p className="text-2xl font-bold text-blue-500">{devicesWithPorts.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-red-500">{inactiveDevices.length}</p>
            </div>
          </div>

          {/* Export Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: 'json' | 'csv' | 'xml') => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                  <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                  <SelectItem value="xml">XML (Extensible Markup Language)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeInactive"
                  checked={includeInactiveDevices}
                  onCheckedChange={setIncludeInactiveDevices}
                />
                <Label htmlFor="includeInactive">Include inactive devices</Label>
                <Badge variant="secondary">{inactiveDevices.length} devices</Badge>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="includePortDetails"
                  checked={includePortDetails}
                  onCheckedChange={setIncludePortDetails}
                />
                <Label htmlFor="includePortDetails">Include closed ports in port details</Label>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleExport} 
              disabled={isExporting || results.length === 0}
              className="flex-1"
            >
              {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
            </Button>
            <div className="text-sm text-muted-foreground">
              {includeInactiveDevices ? results.length : activeDevices.length} devices
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Export Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md">
            <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {preview.substring(0, 2000)}{preview.length > 2000 && '\n... (truncated)'}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Scan Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Target:</span>
              <div className="font-mono">{session.configuration.target}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Scan Type:</span>
              <div className="capitalize">{session.configuration.scanType}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Started:</span>
              <div>{session.startTime.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <div>
                {session.endTime 
                  ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000) + 's'
                  : 'In progress'
                }
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Timeout:</span>
              <div>{session.configuration.timeout}ms</div>
            </div>
            <div>
              <span className="text-muted-foreground">Concurrency:</span>
              <div>{session.configuration.concurrency}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}