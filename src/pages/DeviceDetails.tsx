import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDevices } from '../hooks/useDevices';
import { useGroups } from '../hooks/useGroups';
import { Device } from '../types';
import { devicesApi, commandsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DeviceCard } from '../components/DeviceCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Progress } from '../components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { ArrowLeft, Play, Pause, Wifi, Cable, Radio, Activity, Clock, RefreshCw, Settings, Volume2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { WiFiSettings } from '../components/WiFiSettings';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { devices } = useDevices();
  const { groups } = useGroups();
  const device = devices.find(d => d.id === id);
  const [wifiSSID, setWifiSSID] = useState(device?.wifiSSID || '');
  const [wifiPassword, setWifiPassword] = useState('');
  const [ipAddress, setIpAddress] = useState(device?.ipAddress || '');
  const [gateway, setGateway] = useState('');
  const [dns, setDns] = useState(device?.dns || '');
  const [altDns, setAltDns] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  useEffect(() => {
    if (!device) return;
    
    const deviceRef = doc(db, 'devices', device.id);
    const unsubscribe = onSnapshot(deviceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.updateProgress !== undefined) {
          setUpdateProgress(data.updateProgress);
          setIsUpdating(data.updateProgress > 0 && data.updateProgress < 100);
        }
        if (data.updateStatus) {
          setUpdateStatus(data.updateStatus);
        }
      }
    });
    
    return () => unsubscribe();
  }, [device?.id]);

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
                  <WiFiSettings 
          deviceId={id || ''} 
          currentSsid={device?.wifiSsid} 
        />
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

  const handleCardVolumeChange = async (device: Device, volume: number) => {
    try {
      await devicesApi.update(device.id, { volume });
      await commandsApi.send(device.id, 'volume', undefined, volume);
      toast.success(`Volume set to ${volume}%`);
    } catch (error) {
      console.error('Error updating volume:', error);
      toast.error('Failed to update volume');
    }
  };

  const handleFullUpdate = async () => {
    setIsUpdating(true);
    setShowUpdateDialog(false);
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
  const handleRestart = async () => {
    try {
      await commandsApi.send(device.id, 'reboot');
      toast.success('Device is restarting...');
    } catch (error) {
      console.error('Error restarting device:', error);
      toast.error('Failed to restart device');
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
          gateway,
          dns,
          altDns
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

      <DeviceCard
        device={device}
        groupName={groups.find(g => g.id === device.groupId)?.name}
        onPlayPause={() => handlePlayPause()}
        onVolumeChange={handleCardVolumeChange}
      />

      {/* Controls Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setShowUpdateDialog(true)} 
              variant="outline"
              disabled={isUpdating}
              className="gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating...' : 'Full System Update'}
            </Button>
            <Button 
              onClick={handleRestart}
              variant="outline"
              className="gap-2"
            >
              <Power className="w-5 h-5" />
              Restart Device
            </Button>
          </div>

          {isUpdating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Update Progress</span>
                <span className="text-sm font-semibold">{updateProgress}%</span>
              </div>
              <Progress value={updateProgress} className="h-2" />
              {updateStatus && (
                <p className="text-xs text-muted-foreground">{updateStatus}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Volume
              </Label>
              <span className="text-sm font-semibold">{device.volume || 50}%</span>
            </div>
            <Slider
              value={[device.volume || 50]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Device Info Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Connection</span>
                <div className="flex items-center gap-2">
                  {getConnectionIcon(device.connectionType)}
                  <span className="text-sm font-semibold">
                    {device.connectionType === 'both' ? 'Både två' : device.connectionType === 'wifi' ? (device.wifiSSID || 'WiFi') : device.connectionType === 'ethernet' ? 'Ethernet' : (device.wifiSSID || 'N/A')}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Uptime</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{formatUptime(device.uptime)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Last Seen</span>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold">{formatLastSeen(device.lastSeen)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {device.deviceId && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Device ID</span>
                  <code className="text-xs">{device.deviceId}</code>
                </div>
              )}
              {device.groupId && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Group</span>
                  <span className="text-sm">{groups.find(g => g.id === device.groupId)?.name || device.groupId}</span>
                </div>
              )}
              {device.wifiSSID && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">WiFi SSID</span>
                  <span className="text-sm">{device.wifiSSID}</span>
                </div>
              )}
              {device.dns && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">DNS</span>
                  <code className="text-xs">{device.dns}</code>
                </div>
              )}
              {device.streamUrl && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Stream URL</span>
                  <span className="text-xs truncate max-w-[200px]">{device.streamUrl}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Configuration Section */}
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
              <Label htmlFor="gateway">Gateway</Label>
              <Input
                id="gateway"
                value={gateway}
                onChange={(e) => setGateway(e.target.value)}
                placeholder="192.168.1.1"
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
            <div className="space-y-2">
              <Label htmlFor="alt-dns">Alternate DNS</Label>
              <Input
                id="alt-dns"
                value={altDns}
                onChange={(e) => setAltDns(e.target.value)}
                placeholder="8.8.4.4"
              />
            </div>
          </div>
          <Button onClick={handleNetworkConfig} className="gap-2">
            <Wifi className="w-4 h-4" />
            Apply Network Configuration
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Full System Update</AlertDialogTitle>
            <AlertDialogDescription>
              This will update DietPi, pull from GitHub, clean packages, and restart the device. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleFullUpdate}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeviceDetails;
