// Network Scanner TypeScript Interfaces

export interface ScanTarget {
  ip: string;
  hostname?: string;
  isActive: boolean;
  responseTime?: number;
  lastSeen?: Date;
}

export interface PortScanResult {
  port: number;
  isOpen: boolean;
  service?: string;
  banner?: string;
  responseTime?: number;
}

export interface DeviceInfo {
  ip: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  os?: string;
  isActive: boolean;
  responseTime?: number;
  ports: PortScanResult[];
  lastScanned: Date;
}

export interface ScanConfiguration {
  target: string; // IP range in CIDR notation or individual IP
  scanType: 'discovery' | 'port' | 'both';
  ports?: number[] | string; // specific ports or range like "1-1000"
  timeout: number; // in milliseconds
  concurrency: number;
  includeHostnames: boolean;
  commonPortsOnly: boolean;
}

export interface ScanProgress {
  totalTargets: number;
  scannedTargets: number;
  activeDevices: number;
  currentTarget?: string;
  stage: 'initializing' | 'discovering' | 'port-scanning' | 'resolving' | 'completed' | 'error';
  percentage: number;
  eta?: number; // estimated time remaining in seconds
  startTime: Date;
}

export interface ScanSession {
  id: string;
  configuration: ScanConfiguration;
  progress: ScanProgress;
  results: DeviceInfo[];
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
}

export interface NetworkRange {
  startIP: string;
  endIP: string;
  cidr: string;
  totalHosts: number;
}

export interface ExportFormat {
  format: 'json' | 'csv' | 'xml';
  includeInactiveDevices: boolean;
  includePortDetails: boolean;
}

// Common port definitions
export const COMMON_PORTS: { [key: number]: string } = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  993: 'IMAPS',
  995: 'POP3S',
  1433: 'MSSQL',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  5900: 'VNC',
  8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt'
};

export const DEFAULT_SCAN_PORTS = [21, 22, 23, 25, 53, 80, 135, 139, 443, 445, 993, 995, 1723, 3306, 3389, 5900, 8080];

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface NetworkScanResponse extends ApiResponse<DeviceInfo[]> {
  progress?: ScanProgress;
}

export interface PortScanResponse extends ApiResponse<PortScanResult[]> {
  target: string;
}

export interface HostnameResponse extends ApiResponse<string> {
  ip: string;
}