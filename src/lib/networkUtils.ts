// Network scanning utilities

import { exec } from 'child_process';
import { promisify } from 'util';
import { NetworkRange, ScanTarget } from '@/types/scanner';

const execAsync = promisify(exec);

export class NetworkUtils {
  
  /**
   * Parse IP range input and return network range information
   */
  static parseIPRange(input: string): NetworkRange {
    input = input.trim();
    
    // Handle CIDR notation (e.g., 192.168.1.0/24)
    if (input.includes('/')) {
      const [network, prefixLength] = input.split('/');
      const prefix = parseInt(prefixLength, 10);
      
      if (prefix < 0 || prefix > 32) {
        throw new Error('Invalid CIDR prefix length');
      }
      
      const networkInt = this.ipToInt(network);
      const mask = 0xffffffff << (32 - prefix);
      const startIP = networkInt & mask;
      const endIP = startIP | (0xffffffff >>> prefix);
      
      return {
        startIP: this.intToIP(startIP + 1), // Skip network address
        endIP: this.intToIP(endIP - 1), // Skip broadcast address
        cidr: input,
        totalHosts: Math.max(0, (endIP - startIP) - 1)
      };
    }
    
    // Handle range notation (e.g., 192.168.1.1-192.168.1.100)
    if (input.includes('-')) {
      const [start, end] = input.split('-').map(ip => ip.trim());
      const startInt = this.ipToInt(start);
      const endInt = this.ipToInt(end);
      
      if (startInt > endInt) {
        throw new Error('Invalid IP range: start IP is greater than end IP');
      }
      
      return {
        startIP: start,
        endIP: end,
        cidr: `${start}-${end}`,
        totalHosts: endInt - startInt + 1
      };
    }
    
    // Handle single IP
    if (this.isValidIP(input)) {
      return {
        startIP: input,
        endIP: input,
        cidr: input,
        totalHosts: 1
      };
    }
    
    throw new Error('Invalid IP range format');
  }
  
  /**
   * Generate array of IP addresses from network range
   */
  static generateIPList(range: NetworkRange): string[] {
    const startInt = this.ipToInt(range.startIP);
    const endInt = this.ipToInt(range.endIP);
    const ips: string[] = [];
    
    for (let i = startInt; i <= endInt; i++) {
      ips.push(this.intToIP(i));
    }
    
    return ips;
  }
  
  /**
   * Ping a single IP address
   */
  static async pingHost(ip: string, timeout: number = 3000): Promise<ScanTarget> {
    const startTime = Date.now();
    
    try {
      // Use platform-appropriate ping command
      const isWindows = process.platform === 'win32';
      const pingCmd = isWindows 
        ? `ping -n 1 -w ${timeout} ${ip}`
        : `ping -c 1 -W ${Math.ceil(timeout / 1000)} ${ip}`;
      
      const { stdout } = await execAsync(pingCmd);
      const responseTime = Date.now() - startTime;
      
      // Check if ping was successful
      const isActive = isWindows 
        ? stdout.includes('Reply from')
        : stdout.includes('1 received');
      
      return {
        ip,
        isActive,
        responseTime: isActive ? responseTime : undefined,
        lastSeen: isActive ? new Date() : undefined
      };
    } catch (error) {
      return {
        ip,
        isActive: false,
        responseTime: undefined
      };
    }
  }
  
  /**
   * Perform concurrent network discovery
   */
  static async discoverNetwork(
    targets: string[], 
    timeout: number = 3000, 
    concurrency: number = 50,
    onProgress?: (progress: number, currentTarget: string) => void
  ): Promise<ScanTarget[]> {
    const results: ScanTarget[] = [];
    const chunks = this.chunkArray(targets, concurrency);
    let completed = 0;
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (ip) => {
        const result = await this.pingHost(ip, timeout);
        completed++;
        
        if (onProgress) {
          onProgress(Math.round((completed / targets.length) * 100), ip);
        }
        
        return result;
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }
    
    return results;
  }
  
  /**
   * Resolve hostname for IP address
   */
  static async resolveHostname(ip: string): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(`nslookup ${ip}`);
      
      // Extract hostname from nslookup output
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('name =')) {
          const hostname = line.split('name =')[1].trim().replace('.', '');
          return hostname;
        }
      }
      
      // Try alternative method with dig if available
      try {
        const { stdout: digOutput } = await execAsync(`dig -x ${ip} +short`);
        const hostname = digOutput.trim().replace('.', '');
        return hostname || undefined;
      } catch {
        // dig not available, return undefined
        return undefined;
      }
    } catch (error) {
      return undefined;
    }
  }
  
  /**
   * Get network interface information
   */
  static async getNetworkInterfaces(): Promise<{interface: string, ip: string, subnet: string}[]> {
    try {
      const isWindows = process.platform === 'win32';
      const cmd = isWindows ? 'ipconfig' : 'ip addr show';
      
      const { stdout } = await execAsync(cmd);
      const interfaces: {interface: string, ip: string, subnet: string}[] = [];
      
      if (isWindows) {
        // Parse Windows ipconfig output
        const sections = stdout.split('Windows IP Configuration')[1]?.split('\n\n') || [];
        
        for (const section of sections) {
          if (section.includes('IPv4 Address')) {
            const lines = section.split('\n');
            const interfaceLine = lines.find(line => line.includes('adapter'));
            const ipLine = lines.find(line => line.includes('IPv4 Address'));
            const subnetLine = lines.find(line => line.includes('Subnet Mask'));
            
            if (interfaceLine && ipLine && subnetLine) {
              const interfaceName = interfaceLine.split('adapter')[1]?.trim().replace(':', '') || 'Unknown';
              const ip = ipLine.split(':')[1]?.trim() || '';
              const subnet = subnetLine.split(':')[1]?.trim() || '';
              
              if (ip && !ip.startsWith('127.')) {
                interfaces.push({ interface: interfaceName, ip, subnet });
              }
            }
          }
        }
      } else {
        // Parse Linux/Unix ip addr output
        const lines = stdout.split('\n');
        let currentInterface = '';
        
        for (const line of lines) {
          if (line.match(/^\d+: /)) {
            const match = line.match(/^\d+: ([^:]+):/);
            currentInterface = match?.[1] || '';
          } else if (line.includes('inet ') && !line.includes('127.0.0.1')) {
            const match = line.match(/inet ([0-9.]+)\/(\d+)/);
            if (match && currentInterface) {
              const ip = match[1];
              const prefix = parseInt(match[2], 10);
              const subnet = this.cidrToSubnetMask(prefix);
              
              interfaces.push({ 
                interface: currentInterface, 
                ip, 
                subnet 
              });
            }
          }
        }
      }
      
      return interfaces;
    } catch (error) {
      console.error('Error getting network interfaces:', error);
      return [];
    }
  }
  
  /**
   * Utility functions
   */
  private static ipToInt(ip: string): number {
    return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
  }
  
  private static intToIP(int: number): string {
    return [(int >>> 24), (int >> 16 & 255), (int >> 8 & 255), (int & 255)].join('.');
  }
  
  private static isValidIP(ip: string): boolean {
    const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
  }
  
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  private static cidrToSubnetMask(prefix: number): string {
    const mask = 0xffffffff << (32 - prefix);
    return this.intToIP(mask >>> 0);
  }
}