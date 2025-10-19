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
}

export interface Group {
  id: string;
  name: string;
  streamUrl?: string;
  deviceCount?: number;
  createdAt?: any;
}

export interface User {
  id: string;
  name: string;
  email: string;
  deviceId?: string;
  createdAt?: any;
}
