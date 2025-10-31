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
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Play, Pause, Wifi, Cable, Activity, Clock, RefreshCw, Volume2, Power, Cpu, HardDrive, MemoryStick, Settings, Download, Pencil, Check, X, CheckCircle2 } from 'lucide-react';
import { BluetoothSettings } from '../components/BluetoothSettings';
import { toast } from 'sonner';
import { doc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
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
  const [localVolume, setLocalVolume] = useState(device?.volume ?? 50);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [updateStatusText, setUpdateStatusText] = useState<string>('');
  const [updateActive, setUpdateActive] = useState<boolean>(false);
  const [commandLogs, setCommandLogs] = useState<Array<{ id: string; action: string; processed?: boolean; createdAt?: any; progress?: number | null; status?: string | null }>>([]);
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(device?.name || '');

  useEffect(() => {
    if (device) {
      setSelectedGroupId(device.groupId || '');
    }
  }, [device?.groupId]);

  useEffect(() => {
    if (typeof device?.volume === 'number') {
      setLocalVolume(device.volume);
    }
  }, [device?.volume]);

  // Live update from device document (optional fields updateProgress/updateStatus)
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'config', 'devices', 'list', id), (snap) => {
      const data: any = snap.data();
      if (!data) return;
      const p = typeof data.updateProgress === 'number' ? data.updateProgress : null;
      const s = data.updateStatus || '';
      if (p !== null) setUpdateProgress(p);
      if (s) setUpdateStatusText(s);
    });
    return () => unsub();
  }, [id]);

  // Listen to device commands to infer update activity/progress
  useEffect(() => {
    if (!id) return;
    const commandsRef = collection(db, 'config', 'devices', 'list', id, 'commands');
    const q = query(commandsRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => {
        const data: any = d.data();
        const prog = data.progress ?? data.percent ?? data.updateProgress ?? null;
        return {
          id: d.id,
          action: data.action,
          processed: data.processed,
          createdAt: data.createdAt,
          progress: typeof prog === 'number' ? prog : null,
          status: data.status || data.message || null,
        };
      });
      setCommandLogs(items);
      const active = items.find((i) =>
        (i.action === 'full_update' || i.action === 'update' || i.action === 'update_progress') &&
        (i.processed === false || (i.progress !== null && i.progress < 100))
      );
      
      // Only set updateActive to false if we find a processed update command
      // This prevents premature closing when update is just initiated
      if (active) {
        setUpdateActive(true);
        if (active?.progress !== undefined && active.progress !== null) {
          setUpdateProgress(active.progress);
        }
        if (active?.status) {
          setUpdateStatusText(active.status);
        }
      } else {
        // Check if there's a recently processed update command
        const recentProcessed = items.find((i) =>
          (i.action === 'full_update' || i.action === 'update') &&
          i.processed === true
        );
        // Only close if we had an active update and now it's processed
        if (recentProcessed && updateActive) {
          setUpdateActive(false);
          setUpdateProgress(100);
          setUpdateStatusText('Uppdatering slutförd');
        }
      }
    });
    return () => unsub();
  }, [id, updateActive]);

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

  const handlePlay = async () => {
    // Check if device has a group assigned
    if (!device.groupId) {
      toast.error('No group assigned');
      return;
    }

    // Optimistic update
    setOptimisticStatus('playing');
    
    try {
      const groupForDevice = groups.find((g) => g.id === device.groupId);
      if (groupForDevice?.uploadType === 'local' && groupForDevice?.localFiles && groupForDevice.localFiles.length > 0) {
        const playlist = groupForDevice.localFiles.map((f) => f.url);
        await commandsApi.send(device.id, 'playlist', JSON.stringify({ files: playlist, repeat: true }));
        toast.success(`Playing ${playlist.length} tracks in loop`);
      } else {
        const url = device.streamUrl || device.currentUrl;
        await Promise.all([
          commandsApi.send(device.id, 'play', url),
          commandsApi.send(device.id, 'resume', url),
        ]);
        toast.success('Device playing');
      }
      // Rensa efter 2 sekunder
      setTimeout(() => setOptimisticStatus(null), 2000);
    } catch (error) {
      setOptimisticStatus(null);
      console.error('Error starting playback:', error);
      toast.error('Failed to start playback');
    }
  };

  const handlePause = async () => {
    // Optimistic update
    setOptimisticStatus('paused');
    
    try {
      await Promise.all([
        commandsApi.send(device.id, 'pause', device.streamUrl),
        commandsApi.send(device.id, 'stop', device.streamUrl),
      ]);
      toast.success('Device paused');
      // Rensa efter 2 sekunder
      setTimeout(() => setOptimisticStatus(null), 2000);
    } catch (error) {
      setOptimisticStatus(null);
      console.error('Error pausing device:', error);
      toast.error('Failed to pause device');
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setLocalVolume(value[0]);
  };

  const handleVolumeCommit = async (value: number[]) => {
    const vol = value[0];
    try {
      await devicesApi.update(device.id, { volume: vol });
      await Promise.all([
        commandsApi.send(device.id, 'volume', undefined, vol),
        commandsApi.send(device.id, 'set_volume', undefined, vol),
      ]);
      toast.success(`Volume updated to ${vol}%`);
    } catch (error) {
      console.error('Error updating volume:', error);
      toast.error('Failed to update volume');
    }
  };

  const handleGroupChange = async (groupId: string) => {
    try {
      const selectedGroup = groups.find(g => g.id === groupId);
      const streamUrl = selectedGroup?.streamUrl || null;
      
      await devicesApi.update(device.id, { 
        groupId,
        streamUrl 
      });
      
      setSelectedGroupId(groupId);
      toast.success('Group updated');
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group');
    }
  };

  const handleNameSave = async () => {
    if (editedName.trim() && editedName !== device.name) {
      try {
        await devicesApi.update(device.id, { name: editedName.trim() });
        toast.success('Device name updated');
        setIsEditingName(false);
      } catch (error) {
        console.error('Error updating device name:', error);
        toast.error('Failed to update device name');
      }
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameCancel = () => {
    setEditedName(device.name);
    setIsEditingName(false);
  };

  const handleUpdateSystem = async () => {
    try {
      setUpdateActive(true);
      setUpdateProgress(0);
      setUpdateStatusText('Startar uppdatering...');
      await Promise.all([
        commandsApi.send(device.id, 'full_update'),
        commandsApi.send(device.id, 'update'), // compatibility
      ]);
      toast.success('Full system update initiated');
    } catch (error) {
      console.error('Error updating system:', error);
      toast.error('Failed to update system');
      setUpdateActive(false);
    }
  };
  const handleRestart = async () => {
    try {
      await Promise.all([
        commandsApi.send(device.id, 'reboot'),
        commandsApi.send(device.id, 'restart'),
      ]);
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
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-3xl font-bold h-12"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') handleNameCancel();
                }}
              />
              <Button size="sm" variant="ghost" onClick={handleNameSave}>
                <Check className="h-5 w-5 text-success" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleNameCancel}>
                <X className="h-5 w-5 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-3xl font-bold">{device.name}</h1>
              <Button 
                size="sm" 
                variant="ghost" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setIsEditingName(true);
                  setEditedName(device.name);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={device.status === 'offline' ? 'destructive' : 'success'}>
            {device.status === 'offline' ? 'Offline' : 'Online'}
          </Badge>
          <Badge variant={(optimisticStatus || device.status) === 'playing' ? 'default' : 'outline'}>
            {(optimisticStatus || device.status) === 'playing' ? 'Playing' : 'Not Playing'}
          </Badge>
        </div>
      </div>

        {(updateActive || (updateProgress !== null && updateProgress > 0)) && (
          <Card className="relative overflow-hidden border-primary shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 animate-pulse" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary overflow-hidden">
              <div className="h-full w-1/3 bg-white/30 animate-[shimmer_2s_infinite]" />
            </div>
            <CardContent className="relative py-8">
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
                      <div className="relative p-4 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg">
                        <Download className="w-8 h-8 text-primary-foreground animate-bounce" />
                      </div>
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                          Systemuppdatering pågår
                        </h3>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-[ping_1s_ease-in-out_infinite]" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-[ping_1s_ease-in-out_0.2s_infinite]" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-[ping_1s_ease-in-out_0.4s_infinite]" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {updateStatusText || 'Förbereder uppdatering...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-4xl font-bold bg-gradient-to-br from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                      {updateProgress ?? 0}%
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      <Activity className="w-3 h-3 mr-1" />
                      Aktiv
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Framsteg</span>
                    <span>{updateProgress ?? 0} av 100</span>
                  </div>
                  <div className="relative">
                    <Progress value={updateProgress ?? 0} className="h-4 shadow-inner" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
                  </div>
                </div>

                {(updateProgress ?? 0) > 75 && (
                  <div className="flex items-center gap-2 text-sm text-primary animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">Snart klar! Enheten startar om automatiskt...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
            {/* Playback Controls */}
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handlePlay} className="h-12 text-lg gap-2" variant="default" disabled={(optimisticStatus || device.status) === 'playing'}>
                <Play className="w-5 h-5" />
                Play
              </Button>
              <Button onClick={handlePause} className="h-12 text-lg gap-2" variant="outline" disabled={(optimisticStatus || device.status) !== 'playing'}>
                <Pause className="w-5 h-5" />
                Pause
              </Button>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Volume
                </Label>
                <span className="text-sm font-semibold">{localVolume}%</span>
              </div>
              <Slider
                value={[localVolume]}
                onValueChange={handleVolumeChange}
                onValueCommit={handleVolumeCommit}
                min={0}
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
                className="w-full gap-2 border-primary/50 hover:bg-primary/10 text-primary"
                disabled={updateActive}
              >
                <RefreshCw className="w-4 h-4" />
                Update System
              </Button>
              <Button 
                onClick={handleRestart}
                variant="outline"
                className="w-full gap-2 border-destructive/50 hover:bg-destructive/10 text-destructive"
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
                <Card className="bg-background/50 border border-primary/30 rounded-2xl shadow-lg">
                  <CardContent className="p-4 text-center space-y-2">
                    <Cpu className="w-6 h-6 mx-auto text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{device.cpuUsage || 0}%</div>
                      <div className="text-xs text-muted-foreground">CPU</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-background/50 border border-warning/30 rounded-2xl shadow-lg">
                  <CardContent className="p-4 text-center space-y-2">
                    <MemoryStick className="w-6 h-6 mx-auto text-warning" />
                    <div>
                      <div className="text-2xl font-bold text-warning">{device.memoryUsage || 0}%</div>
                      <div className="text-xs text-muted-foreground">RAM</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-background/50 border border-primary/30 rounded-2xl shadow-lg">
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

      {/* Bluetooth Audio Section */}
      <BluetoothSettings deviceId={device.id} />
    </div>
  );
};

export default DeviceDetails;
