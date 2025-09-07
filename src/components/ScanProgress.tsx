"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanProgress as ScanProgressType } from "@/types/scanner";

interface ScanProgressProps {
  progress: ScanProgressType;
  onStop: () => void;
  isActive: boolean;
}

export function ScanProgress({ progress, onStop, isActive }: ScanProgressProps) {
  const getStageText = (stage: string) => {
    switch (stage) {
      case 'initializing':
        return 'Initializing scan...';
      case 'discovering':
        return 'Discovering network hosts...';
      case 'port-scanning':
        return 'Scanning ports on active devices...';
      case 'resolving':
        return 'Resolving hostnames...';
      case 'completed':
        return 'Scan completed successfully';
      case 'error':
        return 'Scan encountered an error';
      default:
        return 'Processing...';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'initializing':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const elapsedTime = Math.floor((Date.now() - progress.startTime.getTime()) / 1000);
  const etaText = progress.eta ? formatTime(progress.eta) : 'Calculating...';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Scan Progress</CardTitle>
          <Badge className={getStageColor(progress.stage)}>
            {progress.stage.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{getStageText(progress.stage)}</span>
            <span className="text-muted-foreground">
              {progress.percentage.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={progress.percentage} 
            className="h-2"
          />
          {progress.currentTarget && (
            <p className="text-xs text-muted-foreground">
              Current target: <span className="font-mono">{progress.currentTarget}</span>
            </p>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Targets</p>
            <p className="text-lg font-mono font-bold">{progress.totalTargets}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Scanned</p>
            <p className="text-lg font-mono font-bold">{progress.scannedTargets}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Active Devices</p>
            <p className="text-lg font-mono font-bold text-green-500">{progress.activeDevices}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-lg font-mono font-bold">
              {Math.max(0, progress.totalTargets - progress.scannedTargets)}
            </p>
          </div>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Elapsed Time</p>
            <p className="font-mono font-bold">{formatTime(elapsedTime)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Estimated Remaining</p>
            <p className="font-mono font-bold">{etaText}</p>
          </div>
        </div>

        {/* Scan Details */}
        <div className="space-y-3 pt-4 border-t">
          <h3 className="font-medium">Scan Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Started:</span>
              <div className="font-mono">{progress.startTime.toLocaleString()}</div>
            </div>
            {progress.stage === 'completed' && (
              <div>
                <span className="text-muted-foreground">Completion Rate:</span>
                <div className="font-mono">
                  {progress.totalTargets > 0 
                    ? ((progress.activeDevices / progress.totalTargets) * 100).toFixed(1)
                    : 0
                  }% responsive
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        {progress.scannedTargets > 0 && elapsedTime > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-medium">Performance</h3>
            <div className="text-sm">
              <span className="text-muted-foreground">Scan Rate:</span>
              <span className="font-mono ml-2">
                {(progress.scannedTargets / elapsedTime).toFixed(1)} hosts/sec
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          {isActive && progress.stage !== 'completed' && progress.stage !== 'error' && (
            <Button variant="destructive" onClick={onStop}>
              Stop Scan
            </Button>
          )}
          
          {(progress.stage === 'completed' || progress.stage === 'error') && (
            <div className="flex items-center space-x-2">
              <Badge variant={progress.stage === 'completed' ? 'default' : 'destructive'}>
                {progress.stage === 'completed' ? 'Success' : 'Failed'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {progress.stage === 'completed' 
                  ? `Found ${progress.activeDevices} active device${progress.activeDevices !== 1 ? 's' : ''}`
                  : 'Scan terminated with errors'
                }
              </span>
            </div>
          )}
        </div>

        {/* Real-time Updates Indicator */}
        {isActive && progress.stage !== 'completed' && progress.stage !== 'error' && (
          <div className="flex items-center justify-center space-x-2 pt-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live updates</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}