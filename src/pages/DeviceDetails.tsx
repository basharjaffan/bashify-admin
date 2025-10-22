import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDevices } from '../hooks/useDevices';
import { useGroups } from '../hooks/useGroups';
import { Device } from '../types';
import { devicesApi, commandsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Play, Pause, Wifi, Cable, Activity, Clock, RefreshCw, Volume2, Power, Cpu, HardDrive, MemoryStick, Settings } from 'lucide-react';
import { toast } from 'sonner';
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
  const [selectedGroupId, setSelectedGroupId] = useState(device?.groupId || '');

  useEffect(() => {
    if (device) {
      setSelectedGroupId(device.groupId || '');
    }
  }, [device?.groupId]);

  if (!device) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Device not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getConnectionStatus = () => {
    if (device.status === 'offline') return 'Offline';
    return 'Online';
  };

  const getPlaybackStatus = () => {
    if (device.status === 'playing') return 'Playing';
    if (device.status === 'paused') return 'Paused';
    return 'Not Playing';
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

  const handleGroupChange = async (groupId: string) => {
    try {
      await devicesApi.update(device.id, { groupId });
      setSelectedGroupId(groupId);
      toast.success('Group updated');
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group');
    }
  };

  const handleUpdateSystem = async () => {
    try {
      await commandsApi.send(device.id, 'full_update');
      toast.success('System update initiated');
    } catch (error) {
      console.error('Error updating system:', error);
      toast.error('Failed to update system');
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


  const handleWifiConfig = async () => {
    try {
      if (wifiSSID && wifiPassword) {
        await commandsApi.send(device.id, 'configure_wifi', JSON.stringify({
          ssid: wifiSSID,
          password: wifiPassword
        }));
        toast.success('WiFi configuration applied');
        setWifiPassword('');
      }
    } catch (error) {
      console.error('Error updating WiFi config:', error);
      toast.error('Failed to update WiFi configuration');
    }
  };

  const handleIpConfig = async () => {
    try {
      await devicesApi.update(device.id, { 
        ipAddress,
        dns
      });
      
      if (ipAddress && gateway) {
        await commandsApi.send(device.id, 'configure_ip', JSON.stringify({
          ipAddress,
          gateway,
          dns,
          altDns
        }));
      }
      
      toast.success('IP configuration updated');
    } catch (error) {
      console.error('Error updating IP config:', error);
      toast.error('Failed to update IP configuration');
    }
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Never';
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false
    }).format(date);
  };

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'N/A';
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Activity className="w-12 h-12 text-primary" />
          <h1 className="text-3xl font-bold">{device.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={device.status === 'offline' ? 'destructive' : 'default'}>
            {getConnectionStatus()}
          </Badge>
          <Badge variant={device.status === 'playing' ? 'default' : 'secondary'}>
            {getPlaybackStatus()}
          </Badge>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Device Control */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Device Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Play/Pause Button */}
            <Button 
              onClick={handlePlayPause}
              className="w-full h-12 text-lg gap-2"
              variant={device.status === 'playing' ? 'default' : 'outline'}
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

            {/* Volume Control */}
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

            {/* Group Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Group
              </Label>
              <Select value={selectedGroupId} onValueChange={handleGroupChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System Controls */}
            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-sm text-muted-foreground">System Controls</Label>
              <Button 
                onClick={handleUpdateSystem}
                variant="outline"
                className="w-full gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Update System
              </Button>
              <Button 
                onClick={handleRestart}
                variant="outline"
                className="w-full gap-2"
              >
                <Power className="w-4 h-4" />
                Restart Device
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Device Information */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  Connection
                </span>
                <span className="text-sm font-semibold">WiFi</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Cable className="w-4 h-4" />
                  Network
                </span>
                <span className="text-sm font-semibold">N/A</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  IP Address
                </span>
                <span className="text-sm font-semibold">{device.ipAddress}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Group
                </span>
                <span className="text-sm font-semibold">
                  {groups.find(g => g.id === device.groupId)?.name || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Uptime
                </span>
                <span className="text-sm font-semibold text-primary">{formatUptime(device.uptime)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Last Seen
                </span>
                <span className="text-sm font-semibold text-primary">{formatLastSeen(device.lastSeen)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Version
                </span>
                <span className="text-sm font-semibold">{device.firmwareVersion || 'N/A'}</span>
              </div>
            </div>

            {/* System Performance */}
            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-sm text-muted-foreground">System Performance</Label>
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-card/50">
                  <CardContent className="p-4 text-center space-y-2">
                    <Cpu className="w-6 h-6 mx-auto text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{device.cpuUsage || 0}%</div>
                      <div className="text-xs text-muted-foreground">CPU</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="p-4 text-center space-y-2">
                    <MemoryStick className="w-6 h-6 mx-auto text-warning" />
                    <div>
                      <div className="text-2xl font-bold text-warning">{device.memoryUsage || 0}%</div>
                      <div className="text-xs text-muted-foreground">RAM</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="p-4 text-center space-y-2">
                    <HardDrive className="w-6 h-6 mx-auto text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{device.diskUsage || 0}%</div>
                      <div className="text-xs text-muted-foreground">Disk</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Network and IP Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Configuration */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Network Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Button onClick={handleWifiConfig} className="w-full gap-2">
              <Wifi className="w-4 h-4" />
              Apply WiFi Configuration
            </Button>
          </CardContent>
        </Card>

        {/* IP Address Configuration */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cable className="w-5 h-5" />
              IP Address Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Button onClick={handleIpConfig} className="w-full gap-2">
              <Cable className="w-4 h-4" />
              Apply IP Configuration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeviceDetails;
