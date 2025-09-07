"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScanConfiguration, DEFAULT_SCAN_PORTS } from "@/types/scanner";
import { IPUtils } from "@/lib/ipUtils";

interface ScannerFormProps {
  onStartScan: (config: ScanConfiguration) => void;
  isScanning: boolean;
}

export function ScannerForm({ onStartScan, isScanning }: ScannerFormProps) {
  const [target, setTarget] = useState("192.168.1.0/24");
  const [scanType, setScanType] = useState<'discovery' | 'port' | 'both'>('both');
  const [ports, setPorts] = useState("common");
  const [timeout, setTimeout] = useState(3000);
  const [concurrency, setConcurrency] = useState(50);
  const [includeHostnames, setIncludeHostnames] = useState(true);
  const [commonPortsOnly, setCommonPortsOnly] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [estimatedHosts, setEstimatedHosts] = useState(0);

  useEffect(() => {
    // Calculate estimated hosts for the target range
    try {
      if (target.includes('/')) {
        const range = IPUtils.getCIDRRange(target);
        setEstimatedHosts(Math.min(range.totalHosts, 254));
        setTargetError("");
      } else if (target.includes('-')) {
        const [start, end] = target.split('-');
        if (IPUtils.isValidIP(start.trim()) && IPUtils.isValidIP(end.trim())) {
          const startInt = IPUtils.ipToInt(start.trim());
          const endInt = IPUtils.ipToInt(end.trim());
          setEstimatedHosts(Math.max(0, endInt - startInt + 1));
          setTargetError("");
        } else {
          setTargetError("Invalid IP range format");
        }
      } else if (IPUtils.isValidIP(target)) {
        setEstimatedHosts(1);
        setTargetError("");
      } else {
        setEstimatedHosts(0);
        setTargetError("Invalid IP format");
      }
    } catch (error) {
      setEstimatedHosts(0);
      setTargetError("Invalid target format");
    }
  }, [target]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (targetError || estimatedHosts === 0) {
      return;
    }

    const config: ScanConfiguration = {
      target,
      scanType,
      ports: scanType === 'discovery' ? undefined : ports,
      timeout,
      concurrency,
      includeHostnames,
      commonPortsOnly
    };

    onStartScan(config);
  };

  const commonNetworks = IPUtils.getCommonNetworks();

  const estimatedTime = Math.ceil((estimatedHosts * timeout * (scanType === 'both' ? 2 : 1)) / (concurrency * 1000));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Scanner Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Network Selection */}
          <div className="space-y-3">
            <Label>Quick Network Selection</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {commonNetworks.map((network) => (
                <Button
                  key={network.cidr}
                  variant="outline"
                  type="button"
                  onClick={() => setTarget(network.cidr)}
                  className="justify-start h-auto p-3"
                >
                  <div className="text-left">
                    <div className="font-medium">{network.name}</div>
                    <div className="text-sm text-muted-foreground">{network.cidr}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Target Input */}
          <div className="space-y-2">
            <Label htmlFor="target">Target IP Range *</Label>
            <Input
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="192.168.1.0/24 or 192.168.1.1-192.168.1.100"
              className={targetError ? "border-red-500" : ""}
            />
            {targetError && (
              <p className="text-sm text-red-500">{targetError}</p>
            )}
            {estimatedHosts > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  ~{estimatedHosts} hosts
                </Badge>
                <Badge variant="outline">
                  ~{estimatedTime}s estimated
                </Badge>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Supports CIDR notation (192.168.1.0/24), IP ranges (192.168.1.1-192.168.1.100), or single IPs
            </p>
          </div>

          {/* Scan Type */}
          <div className="space-y-2">
            <Label htmlFor="scanType">Scan Type</Label>
            <Select value={scanType} onValueChange={(value: 'discovery' | 'port' | 'both') => setScanType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discovery">Network Discovery Only</SelectItem>
                <SelectItem value="port">Port Scan Only</SelectItem>
                <SelectItem value="both">Network Discovery + Port Scan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Port Configuration (only for port scans) */}
          {(scanType === 'port' || scanType === 'both') && (
            <div className="space-y-2">
              <Label htmlFor="ports">Ports to Scan</Label>
              <Select value={ports} onValueChange={setPorts}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Common Ports (22, 80, 443, etc.)</SelectItem>
                  <SelectItem value="1-1000">Port Range 1-1000</SelectItem>
                  <SelectItem value="1-65535">All Ports (1-65535)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Custom ports: 80,443,8080 or 1-1000"
                value={ports === 'common' || ports === '1-1000' || ports === '1-65535' ? '' : ports}
                onChange={(e) => setPorts(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" type="button" className="w-full justify-between">
                Advanced Options
                <span className="text-xs">{showAdvanced ? '▼' : '▶'}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Select value={timeout.toString()} onValueChange={(value) => setTimeout(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">1 second (Fast)</SelectItem>
                      <SelectItem value="3000">3 seconds (Normal)</SelectItem>
                      <SelectItem value="5000">5 seconds (Thorough)</SelectItem>
                      <SelectItem value="10000">10 seconds (Very Thorough)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concurrency">Concurrent Scans</Label>
                  <Select value={concurrency.toString()} onValueChange={(value) => setConcurrency(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 (Conservative)</SelectItem>
                      <SelectItem value="25">25 (Moderate)</SelectItem>
                      <SelectItem value="50">50 (Aggressive)</SelectItem>
                      <SelectItem value="100">100 (Maximum)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="includeHostnames"
                  checked={includeHostnames}
                  onCheckedChange={setIncludeHostnames}
                />
                <Label htmlFor="includeHostnames" className="text-sm">
                  Resolve hostnames (adds scan time)
                </Label>
              </div>

              {(scanType === 'port' || scanType === 'both') && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="commonPortsOnly"
                    checked={commonPortsOnly}
                    onCheckedChange={setCommonPortsOnly}
                  />
                  <Label htmlFor="commonPortsOnly" className="text-sm">
                    Focus on common ports for faster scanning
                  </Label>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isScanning || targetError !== "" || estimatedHosts === 0}
            size="lg"
          >
            {isScanning ? "Scanning..." : `Start ${scanType === 'discovery' ? 'Network Discovery' : scanType === 'port' ? 'Port Scan' : 'Complete Scan'}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}