export interface Device {
  id: string;
  name: string;
  ipAddress: string;
  deviceId?: string;
  groupId?: string;
  status: 'online' | 'offline' | 'playing' | 'paused' | 'unconfigured';
  volume?: number;
  streamUrl?: string;
  lastSeen?: any;
  createdAt?: any;
  uptime?: number;
  connectionType?: 'wifi' | 'ethernet' | 'both';
  wifiSSID?: string;
  dns?: string;
}

export interface Group {
  id: string;
  name: string;
  streamUrl?: string;
  deviceCount?: number;
  createdAt?: any;
  localFiles?: string[];
  uploadType?: 'url' | 'local';
}

export interface User {
  id: string;
  name: string;
  email: string;
  deviceId?: string;
  createdAt?: any;
}
