import { Device } from '@/hooks/useDevices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Music, HardDrive, Cpu, MemoryStick } from 'lucide-react';

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'playing': return 'bg-blue-500 animate-pulse';
      case 'paused': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0d 0h 0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const timeSinceLastSeen = Math.floor((Date.now() - device.lastSeen.getTime()) / 1000);
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{device.name}</CardTitle>
          <Badge className={getStatusColor(device.status)}>
            {device.status}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {device.ipAddress} • {device.id.substring(0, 8)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          {device.wifiConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-400" />
          )}
          <span>{device.wifiConnected ? 'WiFi Connected' : 'Ethernet'}</span>
        </div>

        {/* Current Stream */}
        {device.currentUrl && (
          <div className="flex items-center gap-2 text-sm">
            <Music className="h-4 w-4" />
            <span className="truncate">{device.currentUrl}</span>
          </div>
        )}

        {/* System Metrics */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            <span>{device.cpuUsage?.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <MemoryStick className="h-3 w-3" />
            <span>{device.memoryUsage?.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <span>{device.diskUsage}%</span>
          </div>
        </div>

        {/* Uptime & Last Seen */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Uptime: {formatUptime(device.uptime)}</div>
          <div>Last seen: {timeSinceLastSeen < 60 ? `${timeSinceLastSeen}s ago` : 
               timeSinceLastSeen < 3600 ? `${Math.floor(timeSinceLastSeen / 60)}m ago` : 
               `${Math.floor(timeSinceLastSeen / 3600)}h ago`}</div>
          <div>Version: {device.firmwareVersion || 'unknown'}</div>
        </div>

        {/* Volume */}
        <div className="text-sm">
          Volume: {device.volume}%
        </div>
      </CardContent>
    </Card>
  );
}
