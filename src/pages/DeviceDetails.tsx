import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDevices } from '../hooks/useDevices';
import { devicesApi, commandsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { ArrowLeft, Play, Pause, Wifi, Cable, Radio, Activity, Clock, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { devices } = useDevices();
  const device = devices.find(d => d.id === id);
  const [streamUrl, setStreamUrl] = useState(device?.streamUrl || '');
  const [wifiSSID, setWifiSSID] = useState(device?.wifiSSID || '');
  const [wifiPassword, setWifiPassword] = useState('');
  const [ipAddress, setIpAddress] = useState(device?.ipAddress || '');
  const [dns, setDns] = useState(device?.dns || '');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!device) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/devices')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Devices
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Device not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      online: { variant: 'default', label: 'Online' },
      playing: { variant: 'default', label: 'Playing' },
      offline: { variant: 'destructive', label: 'Offline' },
      paused: { variant: 'secondary', label: 'Paused' },
      unconfigured: { variant: 'outline', label: 'Unconfigured' }
    };
    const config = variants[status] || variants.offline;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handlePlayPause = async () => {
    const action = device.status === 'playing' ? 'pause' : 'play';
    try {
      await commandsApi.send(device.id, action, device.streamUrl);
      toast.success(`Device ${action === 'play' ? 'playing' : 'paused'}`);
    } catch (error) {
      console.error('Error controlling device:', error);
      toast.error('Failed to control device');
    }
  };

  const handleVolumeChange = async (value: number[]) => {
    try {
      await devicesApi.update(device.id, { volume: value[0] });
      await commandsApi.send(device.id, 'volume', undefined, value[0]);
    } catch (error) {
      console.error('Error updating volume:', error);
      toast.error('Failed to update volume');
    }
  };

  const handleUpdateStream = async () => {
    try {
      await devicesApi.update(device.id, { streamUrl });
      toast.success('Stream URL updated');
    } catch (error) {
      console.error('Error updating stream:', error);
      toast.error('Failed to update stream URL');
    }
  };

  const handleFullUpdate = async () => {
    if (!confirm('This will update DietPi, pull from GitHub, clean packages, and restart the device. Continue?')) {
      return;
    }
    
    setIsUpdating(true);
    try {
      await commandsApi.send(device.id, 'full_update');
      toast.success('Full system update initiated. Device will restart.');
    } catch (error) {
      console.error('Error starting full update:', error);
      toast.error('Failed to start update');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNetworkConfig = async () => {
    try {
      await devicesApi.update(device.id, { 
        wifiSSID, 
        ipAddress,
        dns
      });
      
      if (wifiSSID && wifiPassword) {
        await commandsApi.send(device.id, 'configure_wifi', JSON.stringify({
          ssid: wifiSSID,
          password: wifiPassword,
          ipAddress,
          dns
        }));
      }
      
      toast.success('Network configuration updated');
      setWifiPassword('');
    } catch (error) {
      console.error('Error updating network config:', error);
      toast.error('Failed to update network configuration');
    }
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Never';
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'N/A';
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getConnectionIcon = (type?: string) => {
    if (type === 'both') return <><Wifi className="w-4 h-4" /> + <Cable className="w-4 h-4" /></>;
    if (type === 'ethernet') return <Cable className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/devices')} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Devices
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{device.name}</h1>
          <p className="text-muted-foreground">{device.ipAddress}</p>
        </div>
        {getStatusBadge(device.status)}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getConnectionIcon(device.connectionType)}
              <span className="text-xl font-bold">
                {device.connectionType || 'Unknown'}
              </span>
            </div>
            {device.wifiSSID && (
              <p className="text-xs text-muted-foreground mt-1">SSID: {device.wifiSSID}</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xl font-bold">{formatUptime(device.uptime)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Seen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold">{formatLastSeen(device.lastSeen)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-success" />
              <span className="text-xl font-bold">{device.volume || 50}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Update */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            System Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Perform a full system update including DietPi, GitHub pull, package cleanup, and restart.
          </p>
          <Button 
            onClick={handleFullUpdate} 
            variant="default"
            disabled={isUpdating}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Updating...' : 'Full System Update & Restart'}
          </Button>
        </CardContent>
      </Card>

      {/* Network Configuration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Network Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wifi-ssid">WiFi SSID</Label>
              <Input
                id="wifi-ssid"
                value={wifiSSID}
                onChange={(e) => setWifiSSID(e.target.value)}
                placeholder="Network name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wifi-password">WiFi Password</Label>
              <Input
                id="wifi-password"
                type="password"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="Enter to change"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip-address">IP Address</Label>
              <Input
                id="ip-address"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dns">DNS Server</Label>
              <Input
                id="dns"
                value={dns}
                onChange={(e) => setDns(e.target.value)}
                placeholder="8.8.8.8"
              />
            </div>
          </div>
          <Button onClick={handleNetworkConfig} className="gap-2">
            <Wifi className="w-4 h-4" />
            Apply Network Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={handlePlayPause}
              className="gap-2"
            >
              {device.status === 'playing' ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Play
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Volume: {device.volume || 50}%</Label>
            <Slider
              value={[device.volume || 50]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stream">Stream URL</Label>
            <div className="flex gap-2">
              <Input
                id="stream"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://stream-url.com/radio"
              />
              <Button onClick={handleUpdateStream}>Update</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {device.deviceId && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Device ID</span>
              <code className="text-sm">{device.deviceId}</code>
            </div>
          )}
          {device.groupId && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Group ID</span>
              <code className="text-sm">{device.groupId}</code>
            </div>
          )}
          {device.dns && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">DNS</span>
              <code className="text-sm">{device.dns}</code>
            </div>
          )}
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Created</span>
            <span className="text-sm">{formatLastSeen(device.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceDetails;
