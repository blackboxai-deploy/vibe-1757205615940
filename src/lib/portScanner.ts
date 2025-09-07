// Port scanning utilities

import { Socket } from 'net';
import { PortScanResult, COMMON_PORTS, DEFAULT_SCAN_PORTS } from '@/types/scanner';

export class PortScanner {
  
  /**
   * Scan a single port on a target IP
   */
  static async scanPort(ip: string, port: number, timeout: number = 3000): Promise<PortScanResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new Socket();
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        const responseTime = Date.now() - startTime;
        socket.destroy();
        resolve({
          port,
          isOpen: true,
          service: COMMON_PORTS[port] || 'Unknown',
          responseTime
        });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          port,
          isOpen: false,
          service: COMMON_PORTS[port] || 'Unknown'
        });
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve({
          port,
          isOpen: false,
          service: COMMON_PORTS[port] || 'Unknown'
        });
      });
      
      socket.connect(port, ip);
    });
  }
  
  /**
   * Scan multiple ports on a target IP
   */
  static async scanPorts(
    ip: string, 
    ports: number[], 
    timeout: number = 3000,
    concurrency: number = 10,
    onProgress?: (progress: number, currentPort: number) => void
  ): Promise<PortScanResult[]> {
    const results: PortScanResult[] = [];
    const chunks = this.chunkArray(ports, concurrency);
    let completed = 0;
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (port) => {
        const result = await this.scanPort(ip, port, timeout);
        completed++;
        
        if (onProgress) {
          onProgress(Math.round((completed / ports.length) * 100), port);
        }
        
        return result;
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }
    
    return results.sort((a, b) => a.port - b.port);
  }
  
  /**
   * Parse port range string (e.g., "1-1000", "80,443,8080", "common")
   */
  static parsePorts(portInput: string): number[] {
    const input = portInput.trim().toLowerCase();
    
    // Handle common ports
    if (input === 'common') {
      return DEFAULT_SCAN_PORTS;
    }
    
    // Handle range (e.g., "1-1000")
    if (input.includes('-')) {
      const [start, end] = input.split('-').map(p => parseInt(p.trim(), 10));
      if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > 65535) {
        throw new Error('Invalid port range');
      }
      
      const ports: number[] = [];
      for (let i = start; i <= end; i++) {
        ports.push(i);
      }
      return ports;
    }
    
    // Handle comma-separated ports (e.g., "80,443,8080")
    if (input.includes(',')) {
      const ports = input.split(',')
        .map(p => parseInt(p.trim(), 10))
        .filter(p => !isNaN(p) && p >= 1 && p <= 65535);
      
      if (ports.length === 0) {
        throw new Error('No valid ports found');
      }
      
      return [...new Set(ports)].sort((a, b) => a - b);
    }
    
    // Handle single port
    const port = parseInt(input, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('Invalid port number');
    }
    
    return [port];
  }
  
  /**
   * Get banner information for an open port
   */
  static async getBanner(ip: string, port: number, timeout: number = 3000): Promise<string | undefined> {
    return new Promise((resolve) => {
      const socket = new Socket();
      socket.setTimeout(timeout);
      
      let banner = '';
      
      socket.on('connect', () => {
        // Send a probe based on the service
        switch (port) {
          case 21: // FTP
            socket.write('\r\n');
            break;
          case 22: // SSH
            socket.write('\r\n');
            break;
          case 25: // SMTP
            socket.write('EHLO test\r\n');
            break;
          case 80: // HTTP
          case 8080:
            socket.write('GET / HTTP/1.0\r\n\r\n');
            break;
          case 443: // HTTPS
            socket.write('GET / HTTP/1.0\r\n\r\n');
            break;
          default:
            socket.write('\r\n');
        }
      });
      
      socket.on('data', (data) => {
        banner += data.toString();
        if (banner.length > 1024) { // Limit banner size
          socket.destroy();
          resolve(banner.substring(0, 1024));
        }
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(banner || undefined);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(banner || undefined);
      });
      
      // Close connection after collecting initial banner
      setTimeout(() => {
        if (!socket.destroyed) {
          socket.destroy();
          resolve(banner || undefined);
        }
      }, 2000);
      
      socket.connect(port, ip);
    });
  }
  
  /**
   * Perform service detection on open ports
   */
  static async detectServices(ip: string, openPorts: PortScanResult[]): Promise<PortScanResult[]> {
    const results: PortScanResult[] = [];
    
    for (const portResult of openPorts) {
      if (portResult.isOpen) {
        try {
          const banner = await this.getBanner(ip, portResult.port, 2000);
          results.push({
            ...portResult,
            banner: banner?.trim()
          });
        } catch (error) {
          results.push(portResult);
        }
      } else {
        results.push(portResult);
      }
    }
    
    return results;
  }
  
  /**
   * Check if port is commonly vulnerable
   */
  static isVulnerablePort(port: number): boolean {
    const vulnerablePorts = [21, 23, 135, 139, 445, 1433, 3389, 5900];
    return vulnerablePorts.includes(port);
  }
  
  /**
   * Get port category
   */
  static getPortCategory(port: number): string {
    if (port <= 1023) return 'System/Well-known';
    if (port <= 49151) return 'User/Registered';
    return 'Dynamic/Private';
  }
  
  /**
   * Utility functions
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Quick port scan for common services
 */
export async function quickPortScan(ip: string): Promise<PortScanResult[]> {
  return PortScanner.scanPorts(ip, DEFAULT_SCAN_PORTS, 2000, 20);
}

/**
 * Comprehensive port scan
 */
export async function fullPortScan(ip: string, onProgress?: (progress: number) => void): Promise<PortScanResult[]> {
  const ports = Array.from({length: 1000}, (_, i) => i + 1); // Scan ports 1-1000
  return PortScanner.scanPorts(ip, ports, 3000, 50, (progress) => {
    if (onProgress) onProgress(progress);
  });
}