"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { DeviceInfo, COMMON_PORTS } from "@/types/scanner";
import { IPUtils } from "@/lib/ipUtils";
import { useState } from "react";

interface DeviceCardProps {
  device: DeviceInfo;
}

// Utility functions moved here to avoid Node.js dependencies in client
const isVulnerablePort = (port: number): boolean => {
  const vulnerablePorts = [21, 23, 135, 139, 445, 1433, 3389, 5900];
  return vulnerablePorts.includes(port);
};

const getPortCategory = (port: number): string => {
  if (port <= 1023) return 'System/Well-known';
  if (port <= 49151) return 'User/Registered';
  return 'Dynamic/Private';
};

export function DeviceCard({ device }: DeviceCardProps) {
  const [showPorts, setShowPorts] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const openPorts = device.ports?.filter(port => port.isOpen) || [];
  const closedPorts = device.ports?.filter(port => !port.isOpen) || [];
  const isPrivate = IPUtils.isPrivateIP(device.ip);
  const ipClass = IPUtils.getIPClass(device.ip);
  
  const getStatusColor = () => {
    if (!device.isActive) return "bg-red-500/10 text-red-500 border-red-500/20";
    if (openPorts.length > 0) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    return "bg-green-500/10 text-green-500 border-green-500/20";
  };

  const getStatusText = () => {
    if (!device.isActive) return "Offline";
    if (openPorts.length > 0) return `${openPorts.length} ports open`;
    return "Online";
  };

  const formatResponseTime = (time?: number) => {
    if (!time) return "N/A";
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${device.isActive ? 'border-green-500/20' : 'border-red-500/20'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-mono">{device.ip}</CardTitle>
            {device.hostname && (
              <p className="text-sm text-muted-foreground">{device.hostname}</p>
            )}
          </div>
          <Badge className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Response Time:</span>
            <div className="font-mono">{formatResponseTime(device.responseTime)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">IP Class:</span>
            <div className="font-mono">{ipClass}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Network Type:</span>
            <div>{isPrivate ? "Private" : "Public"}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Last Seen:</span>
            <div>{device.lastScanned.toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Open Ports Summary */}
        {device.isActive && openPorts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Open Ports ({openPorts.length})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPorts(!showPorts)}
              >
                {showPorts ? "Hide" : "Show"}
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {openPorts.slice(0, 6).map((port) => (
                <Badge key={port.port} variant="outline" className="text-xs">
                  {port.port}/{port.service || COMMON_PORTS[port.port] || 'Unknown'}
                </Badge>
              ))}
              {openPorts.length > 6 && (
                <Badge variant="secondary" className="text-xs">
                  +{openPorts.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Detailed Port Information */}
        {device.ports && device.ports.length > 0 && (
          <Collapsible open={showPorts} onOpenChange={setShowPorts}>
            <CollapsibleContent className="space-y-3">
              {openPorts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-green-600">Open Ports</h4>
                  <div className="space-y-2">
                    {openPorts.map((port) => (
                      <div key={port.port} className="bg-green-50 dark:bg-green-900/10 p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="font-mono">
                              {port.port}
                            </Badge>
                            <span className="text-sm font-medium">{port.service}</span>
                            {isVulnerablePort(port.port) && (
                              <Badge variant="destructive" className="text-xs">
                                Risk
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatResponseTime(port.responseTime)}
                          </div>
                        </div>
                        {port.banner && (
                          <div className="mt-2 text-xs text-muted-foreground font-mono bg-background p-2 rounded">
                            {port.banner.substring(0, 100)}{port.banner.length > 100 && "..."}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          Category: {getPortCategory(port.port)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {closedPorts.length > 0 && showDetails && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-600">Closed Ports</h4>
                  <div className="flex flex-wrap gap-1">
                    {closedPorts.slice(0, 10).map((port) => (
                      <Badge key={port.port} variant="secondary" className="text-xs">
                        {port.port}
                      </Badge>
                    ))}
                    {closedPorts.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{closedPorts.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {closedPorts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full"
                >
                  {showDetails ? "Hide" : "Show"} Closed Ports ({closedPorts.length})
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Security Assessment */}
        {device.isActive && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Security Assessment:</span>
              <Badge 
                variant={openPorts.some(p => isVulnerablePort(p.port)) ? "destructive" : "secondary"}
                className="text-xs"
              >
                {openPorts.some(p => isVulnerablePort(p.port)) ? "Needs Review" : "Normal"}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}