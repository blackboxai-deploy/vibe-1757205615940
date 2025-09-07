"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScannerForm } from "./ScannerForm";
import { DeviceCard } from "./DeviceCard";
import { ScanProgress } from "./ScanProgress";
import { ResultsExport } from "./ResultsExport";
import { DeviceInfo, ScanConfiguration, ScanProgress as ScanProgressType, ScanSession } from "@/types/scanner";

export function NetworkScanner() {
  const [currentSession, setCurrentSession] = useState<ScanSession | null>(null);
  const [scanResults, setScanResults] = useState<DeviceInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgressType | null>(null);
  const [activeTab, setActiveTab] = useState("scanner");

  const startScan = useCallback(async (config: ScanConfiguration) => {
    setIsScanning(true);
    setActiveTab("progress");
    
    const sessionId = Date.now().toString();
    const session: ScanSession = {
      id: sessionId,
      configuration: config,
      progress: {
        totalTargets: 0,
        scannedTargets: 0,
        activeDevices: 0,
        stage: 'initializing',
        percentage: 0,
        startTime: new Date()
      },
      results: [],
      isActive: true,
      startTime: new Date()
    };
    
    setCurrentSession(session);
    setScanResults([]);
    setScanProgress(session.progress);

    try {
      // Start network discovery
      setScanProgress(prev => prev ? { ...prev, stage: 'discovering' } : null);
      
      const response = await fetch('/api/scan/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: config.target,
          timeout: config.timeout,
          concurrency: config.concurrency,
          sessionId: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Network scan failed');
      }

      const data = await response.json();
      
      if (data.success) {
        const devices = data.data || [];
        setScanResults(devices);
        
        // If port scanning is enabled, scan ports for active devices
        if (config.scanType === 'port' || config.scanType === 'both') {
          setScanProgress(prev => prev ? { ...prev, stage: 'port-scanning' } : null);
          
          const activeDevices = devices.filter((d: DeviceInfo) => d.isActive);
          
          for (const device of activeDevices) {
            try {
              const portResponse = await fetch('/api/scan/port', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  target: device.ip,
                  ports: config.ports || 'common',
                  timeout: config.timeout,
                  sessionId: sessionId
                })
              });

              if (portResponse.ok) {
                const portData = await portResponse.json();
                if (portData.success) {
                  setScanResults(prev => 
                    prev.map(d => 
                      d.ip === device.ip 
                        ? { ...d, ports: portData.data || [] }
                        : d
                    )
                  );
                }
              }
            } catch (error) {
              console.error(`Port scan failed for ${device.ip}:`, error);
            }
          }
        }

        // Resolve hostnames if enabled
        if (config.includeHostnames) {
          setScanProgress(prev => prev ? { ...prev, stage: 'resolving' } : null);
          
          const activeDevices = devices.filter((d: DeviceInfo) => d.isActive);
          
          for (const device of activeDevices) {
            try {
              const hostnameResponse = await fetch('/api/scan/hostname', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ip: device.ip,
                  sessionId: sessionId
                })
              });

              if (hostnameResponse.ok) {
                const hostnameData = await hostnameResponse.json();
                if (hostnameData.success && hostnameData.data) {
                  setScanResults(prev => 
                    prev.map(d => 
                      d.ip === device.ip 
                        ? { ...d, hostname: hostnameData.data }
                        : d
                    )
                  );
                }
              }
            } catch (error) {
              console.error(`Hostname resolution failed for ${device.ip}:`, error);
            }
          }
        }

        setScanProgress(prev => prev ? { 
          ...prev, 
          stage: 'completed',
          percentage: 100,
          activeDevices: devices.filter((d: DeviceInfo) => d.isActive).length
        } : null);
        
        setActiveTab("results");
      } else {
        throw new Error(data.error || 'Scan failed');
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanProgress(prev => prev ? { ...prev, stage: 'error' } : null);
    } finally {
      setIsScanning(false);
      if (currentSession) {
        setCurrentSession(prev => prev ? { ...prev, isActive: false, endTime: new Date() } : null);
      }
    }
  }, [currentSession]);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    setScanProgress(prev => prev ? { ...prev, stage: 'completed' } : null);
    if (currentSession) {
      setCurrentSession(prev => prev ? { ...prev, isActive: false, endTime: new Date() } : null);
    }
  }, [currentSession]);

  const activeDevices = scanResults.filter(device => device.isActive);
  const inactiveDevices = scanResults.filter(device => !device.isActive);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scanner">Scanner</TabsTrigger>
          <TabsTrigger value="progress" disabled={!scanProgress}>
            Progress
            {isScanning && <Badge variant="secondary" className="ml-2">Live</Badge>}
          </TabsTrigger>
          <TabsTrigger value="results" disabled={scanResults.length === 0}>
            Results
            {scanResults.length > 0 && (
              <Badge variant="secondary" className="ml-2">{scanResults.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="export" disabled={scanResults.length === 0}>
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="space-y-4">
          <ScannerForm onStartScan={startScan} isScanning={isScanning} />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {scanProgress && (
            <ScanProgress 
              progress={scanProgress} 
              onStop={stopScan}
              isActive={isScanning}
            />
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Scanned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scanResults.length}</div>
                <p className="text-sm text-muted-foreground">Hosts discovered</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Active Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{activeDevices.length}</div>
                <p className="text-sm text-muted-foreground">Responding to ping</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Inactive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{inactiveDevices.length}</div>
                <p className="text-sm text-muted-foreground">No response</p>
              </CardContent>
            </Card>
          </div>

          {activeDevices.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-500">Active Devices</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDevices.map((device) => (
                  <DeviceCard key={device.ip} device={device} />
                ))}
              </div>
            </div>
          )}

          {inactiveDevices.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-red-500">Inactive Devices</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactiveDevices.slice(0, 10).map((device) => (
                  <DeviceCard key={device.ip} device={device} />
                ))}
              </div>
              {inactiveDevices.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  And {inactiveDevices.length - 10} more inactive devices...
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          {scanResults.length > 0 && currentSession && (
            <ResultsExport 
              results={scanResults} 
              session={currentSession}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}