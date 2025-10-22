export interface Device {
  id: string;
  name: string;
  ipAddress: string;
  deviceId?: string;
  groupId?: string;
  group?: string;
  status: 'online' | 'offline' | 'playing' | 'paused' | 'unconfigured';
  volume?: number;
  streamUrl?: string;
  currentUrl?: string;
  lastSeen?: any;
  createdAt?: any;
  uptime?: number;
  connectionType?: 'wifi' | 'ethernet' | 'both';
  wifiSSID?: string;
  wifiSsid?: string;
  dns?: string;
  firmwareVersion?: string;
  wifiConnected?: boolean;
  ethernetConnected?: boolean;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  updateProgress?: number;
  updateStatus?: string;
}

export interface Group {
  id: string;
  name: string;
  streamUrl?: string;
  deviceCount?: number;
  createdAt?: any;
  localFiles?: Array<{ name: string; url: string; size: number }>;
  uploadType?: 'url' | 'local';
  announcements?: Array<{ 
    name: string; 
    url: string; 
    size: number;
    uploadedAt?: any;
  }>;
  announcementInterval?: number; // in minutes
  announcementVolume?: number; // 0-100
}

export interface User {
  id: string;
  name: string;
  email: string;
  deviceId?: string;
  isAdmin?: boolean;
  createdAt?: any;
}
