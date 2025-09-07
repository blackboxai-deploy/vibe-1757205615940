// IP address manipulation utilities

export class IPUtils {
  
  /**
   * Validate IP address format
   */
  static isValidIP(ip: string): boolean {
    const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
  }
  
  /**
   * Validate CIDR notation
   */
  static isValidCIDR(cidr: string): boolean {
    if (!cidr.includes('/')) return false;
    
    const [network, prefix] = cidr.split('/');
    const prefixNum = parseInt(prefix, 10);
    
    return this.isValidIP(network) && prefixNum >= 0 && prefixNum <= 32;
  }
  
  /**
   * Convert IP address to integer
   */
  static ipToInt(ip: string): number {
    return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
  }
  
  /**
   * Convert integer to IP address
   */
  static intToIP(int: number): string {
    return [(int >>> 24), (int >> 16 & 255), (int >> 8 & 255), (int & 255)].join('.');
  }
  
  /**
   * Get network address from IP and subnet mask
   */
  static getNetworkAddress(ip: string, subnetMask: string): string {
    const ipInt = this.ipToInt(ip);
    const maskInt = this.ipToInt(subnetMask);
    const networkInt = ipInt & maskInt;
    return this.intToIP(networkInt);
  }
  
  /**
   * Get broadcast address from IP and subnet mask
   */
  static getBroadcastAddress(ip: string, subnetMask: string): string {
    const ipInt = this.ipToInt(ip);
    const maskInt = this.ipToInt(subnetMask);
    const networkInt = ipInt & maskInt;
    const broadcastInt = networkInt | (~maskInt >>> 0);
    return this.intToIP(broadcastInt);
  }
  
  /**
   * Convert CIDR prefix to subnet mask
   */
  static cidrToSubnetMask(prefix: number): string {
    if (prefix < 0 || prefix > 32) {
      throw new Error('Invalid CIDR prefix');
    }
    const mask = 0xffffffff << (32 - prefix);
    return this.intToIP(mask >>> 0);
  }
  
  /**
   * Convert subnet mask to CIDR prefix
   */
  static subnetMaskToCIDR(mask: string): number {
    const maskInt = this.ipToInt(mask);
    let prefix = 0;
    let temp = maskInt;
    
    while (temp & 0x80000000) {
      prefix++;
      temp <<= 1;
    }
    
    return prefix;
  }
  
  /**
   * Check if IP is in private range
   */
  static isPrivateIP(ip: string): boolean {
    const ipInt = this.ipToInt(ip);
    
    // 10.0.0.0/8
    if (ipInt >= this.ipToInt('10.0.0.0') && ipInt <= this.ipToInt('10.255.255.255')) {
      return true;
    }
    
    // 172.16.0.0/12
    if (ipInt >= this.ipToInt('172.16.0.0') && ipInt <= this.ipToInt('172.31.255.255')) {
      return true;
    }
    
    // 192.168.0.0/16
    if (ipInt >= this.ipToInt('192.168.0.0') && ipInt <= this.ipToInt('192.168.255.255')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if IP is localhost
   */
  static isLocalhost(ip: string): boolean {
    return ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('127.');
  }
  
  /**
   * Get IP range from CIDR
   */
  static getCIDRRange(cidr: string): { startIP: string; endIP: string; totalHosts: number } {
    const [network, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    
    if (!this.isValidIP(network) || prefix < 0 || prefix > 32) {
      throw new Error('Invalid CIDR notation');
    }
    
    const networkInt = this.ipToInt(network);
    const mask = 0xffffffff << (32 - prefix);
    const startIP = networkInt & mask;
    const endIP = startIP | (0xffffffff >>> prefix);
    const totalHosts = Math.max(0, (endIP - startIP) - 1); // Exclude network and broadcast
    
    return {
      startIP: this.intToIP(startIP + 1), // Skip network address
      endIP: this.intToIP(endIP - 1), // Skip broadcast address
      totalHosts
    };
  }
  
  /**
   * Calculate subnet information
   */
  static getSubnetInfo(ip: string, subnetMask: string) {
    const networkAddress = this.getNetworkAddress(ip, subnetMask);
    const broadcastAddress = this.getBroadcastAddress(ip, subnetMask);
    const prefix = this.subnetMaskToCIDR(subnetMask);
    const totalHosts = Math.pow(2, 32 - prefix) - 2; // Exclude network and broadcast
    
    return {
      networkAddress,
      broadcastAddress,
      subnetMask,
      prefix,
      totalHosts,
      cidr: `${networkAddress}/${prefix}`,
      firstHost: this.intToIP(this.ipToInt(networkAddress) + 1),
      lastHost: this.intToIP(this.ipToInt(broadcastAddress) - 1)
    };
  }
  
  /**
   * Generate random IP in range
   */
  static randomIPInRange(startIP: string, endIP: string): string {
    const startInt = this.ipToInt(startIP);
    const endInt = this.ipToInt(endIP);
    const randomInt = Math.floor(Math.random() * (endInt - startInt + 1)) + startInt;
    return this.intToIP(randomInt);
  }
  
  /**
   * Sort IP addresses
   */
  static sortIPs(ips: string[]): string[] {
    return ips.sort((a, b) => this.ipToInt(a) - this.ipToInt(b));
  }
  
  /**
   * Get IP class (A, B, C, D, E)
   */
  static getIPClass(ip: string): 'A' | 'B' | 'C' | 'D' | 'E' | 'Invalid' {
    if (!this.isValidIP(ip)) return 'Invalid';
    
    const firstOctet = parseInt(ip.split('.')[0], 10);
    
    if (firstOctet >= 1 && firstOctet <= 126) return 'A';
    if (firstOctet >= 128 && firstOctet <= 191) return 'B';
    if (firstOctet >= 192 && firstOctet <= 223) return 'C';
    if (firstOctet >= 224 && firstOctet <= 239) return 'D';
    if (firstOctet >= 240 && firstOctet <= 255) return 'E';
    
    return 'Invalid';
  }
  
  /**
   * Suggest common network ranges for scanning
   */
  static getCommonNetworks(): { name: string; cidr: string; description: string }[] {
    return [
      {
        name: 'Home Network (192.168.1.x)',
        cidr: '192.168.1.0/24',
        description: 'Common home router default network'
      },
      {
        name: 'Home Network (192.168.0.x)',
        cidr: '192.168.0.0/24',
        description: 'Alternative home router network'
      },
      {
        name: 'Private Network (10.0.0.x)',
        cidr: '10.0.0.0/24',
        description: 'Enterprise private network segment'
      },
      {
        name: 'Corporate Network (172.16.0.x)',
        cidr: '172.16.0.0/24',
        description: 'Corporate private network range'
      }
    ];
  }
}