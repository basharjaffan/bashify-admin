import { Device } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Wifi, WifiOff, Music, HardDrive, Cpu, MemoryStick, Play, Pause, Volume2 } from 'lucide-react';

interface DeviceCardProps {
  device: Device;
  groupName?: string;
  onPlayPause?: (device: Device) => void;
  onVolumeChange?: (device: Device, volume: number) => void;
}

export function DeviceCard({ device, groupName, onPlayPause, onVolumeChange }: DeviceCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-success';
      case 'playing': return 'bg-primary animate-pulse';
      case 'paused': return 'bg-warning';
      case 'offline': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    const isOnline = status === 'online' || status === 'playing';
    return isOnline ? (
      <Wifi className="h-5 w-5 text-success" />
    ) : (
      <WifiOff className="h-5 w-5 text-destructive" />
    );
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
    <Card className="group relative overflow-hidden bg-gradient-to-br from-card to-card/80 border-border/50 hover:border-primary/50 hover:shadow-glow transition-all duration-300 animate-fade-in">
      {/* Status Glow Effect */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 transition-opacity ${
        device.status === 'playing' ? 'bg-primary' : 
        device.status === 'online' ? 'bg-success' : 'bg-muted'
      }`} />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br transition-all duration-300 ${
              device.status === 'playing' ? 'from-primary/20 to-primary/10 shadow-glow' : 
              device.status === 'online' ? 'from-success/20 to-success/10' : 
              'from-muted/20 to-muted/10'
            }`}>
              {getStatusIcon(device.status)}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                {device.name}
              </CardTitle>
              <div className="text-xs text-muted-foreground font-mono mt-1">
                {device.ipAddress}
              </div>
              {device.wifiSSID && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="font-semibold">Network:</span>
                  <span className="font-mono">{device.wifiSSID}</span>
                </div>
              )}
            </div>
          </div>
          <Badge 
            className={`${getStatusColor(device.status)} text-white font-semibold px-3 py-1 shadow-sm whitespace-nowrap`}
          >
            {device.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="relative space-y-4 pt-0">
        {/* Play/Pause & Volume Controls */}
        {onPlayPause && (
          <div className="flex gap-3 p-3 rounded-lg bg-gradient-to-br from-secondary/50 to-secondary/30 border border-border/50">
            {device.status === 'playing' ? (
              <Button
                size="sm"
                onClick={() => onPlayPause(device)}
                className="gap-2 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 shadow-sm shrink-0"
                variant="default"
              >
                <Pause className="h-4 w-4" />
                <span className="font-semibold">Pause</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onPlayPause(device)}
                className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-glow shrink-0"
              >
                <Play className="h-4 w-4" />
                <span className="font-semibold">Play</span>
              </Button>
            )}
            
            {/* Volume Control */}
            {onVolumeChange && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Volume2 className="h-4 w-4 text-primary shrink-0" />
                <Slider
                  value={[device.volume || 0]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => onVolumeChange(device, value[0])}
                  className="flex-1"
                />
                <span className="text-xs font-bold text-primary min-w-[3ch] text-right">
                  {device.volume || 0}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
            {device.wifiConnected ? (
              <Wifi className="h-4 w-4 text-success shrink-0" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Nätverk</div>
              <div className="text-xs font-medium truncate">
                {device.wifiConnected 
                  ? (device.wifiSSID || device.wifiSsid || 'WiFi') 
                  : 'Ethernet'}
              </div>
            </div>
          </div>

          {/* Group */}
          {groupName && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
              <Music className="h-4 w-4 text-accent shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Grupp</div>
                <div className="text-xs font-medium truncate">{groupName}</div>
              </div>
            </div>
          )}
        </div>

        {/* Current Stream */}
        {device.currentUrl && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <Music className="h-4 w-4 text-primary animate-pulse shrink-0" />
            <span className="text-xs text-primary truncate flex-1">{device.currentUrl}</span>
          </div>
        )}

        {/* System Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-secondary/20 border border-border/20">
            <Cpu className="h-4 w-4 text-info" />
            <div className="text-center">
              <div className="text-xs font-bold">{device.cpuUsage?.toFixed(1)}%</div>
              <div className="text-[10px] text-muted-foreground">CPU</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-secondary/20 border border-border/20">
            <MemoryStick className="h-4 w-4 text-warning" />
            <div className="text-center">
              <div className="text-xs font-bold">{device.memoryUsage?.toFixed(1)}%</div>
              <div className="text-[10px] text-muted-foreground">RAM</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-secondary/20 border border-border/20">
            <HardDrive className="h-4 w-4 text-accent" />
            <div className="text-center">
              <div className="text-xs font-bold">{device.diskUsage}%</div>
              <div className="text-[10px] text-muted-foreground">Disk</div>
            </div>
          </div>
        </div>

        {/* Uptime & Details */}
        <div className="pt-3 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Uptime</span>
            <span className="font-medium">{formatUptime(device.uptime)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Last seen</span>
            <span className="font-medium">
              {timeSinceLastSeen < 60 ? `${timeSinceLastSeen}s ago` : 
               timeSinceLastSeen < 3600 ? `${Math.floor(timeSinceLastSeen / 60)}m ago` : 
               `${Math.floor(timeSinceLastSeen / 3600)}h ago`}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono text-[10px]">{device.firmwareVersion || 'unknown'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-bold text-primary">{device.volume}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
