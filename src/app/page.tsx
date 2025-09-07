"use client";

import { NetworkScanner } from "@/components/NetworkScanner";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Network Discovery & Port Scanning</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover devices on your network, scan for open ports, and analyze network security. 
          Perfect for network administrators and security professionals.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <span className="text-blue-500 font-bold">1</span>
            </div>
            <h3 className="font-semibold">Network Discovery</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Scan IP ranges to discover active devices using ICMP ping and ARP resolution.
          </p>
        </div>
        
        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <span className="text-green-500 font-bold">2</span>
            </div>
            <h3 className="font-semibold">Port Scanning</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Identify open ports and running services on discovered devices.
          </p>
        </div>
        
        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <span className="text-purple-500 font-bold">3</span>
            </div>
            <h3 className="font-semibold">Analysis & Export</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Analyze results and export findings in multiple formats for further review.
          </p>
        </div>
      </div>
      
      <NetworkScanner />
    </div>
  );
}