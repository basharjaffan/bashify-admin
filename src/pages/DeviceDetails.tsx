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
import { ArrowLeft, Play, Pause, Wifi, Cable, Activity, Clock, RefreshCw, Volume2, Power, Cpu, HardDrive, MemoryStick, Settings, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { doc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationStatusCard } from '../components/OperationStatusCard';

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
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateStatusText, setUpdateStatusText] = useState<string>('');
  const [updateActive, setUpdateActive] = useState<boolean>(false);
  const [restartProgress, setRestartProgress] = useState<number>(0);
  const [restartStatusText, setRestartStatusText] = useState<string>('');
  const [restartActive, setRestartActive] = useState<boolean>(false);
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

  // Live update from device document (updateProgress/updateStatus and restartProgress/restartStatus)
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'config', 'devices', 'list', id), (snap) => {
      const data: any = snap.data();
      if (!data) return;
      
      // Update progress
      const up = typeof data.updateProgress === 'number' ? data.updateProgress : 0;
      const us = data.updateStatus || '';
      setUpdateProgress(up);
      if (us) setUpdateStatusText(us);
      
      // Restart progress
      const rp = typeof data.restartProgress === 'number' ? data.restartProgress : 0;
      const rs = data.restartStatus || '';
      setRestartProgress(rp);
      if (rs) setRestartStatusText(rs);
    });
    return () => unsub();
  }, [id]);

  // Listen to device commands to infer update/restart activity/progress
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
      
      // Check for active update
      const activeUpdate = items.find((i) =>
        (i.action === 'full_update' || i.action === 'update' || i.action === 'update_progress') &&
        (i.processed === false || (i.progress !== null && i.progress < 100))
      );
      
      if (activeUpdate) {
        setUpdateActive(true);
        if (activeUpdate?.progress !== undefined && activeUpdate.progress !== null) {
          setUpdateProgress(activeUpdate.progress);
        }
        if (activeUpdate?.status) {
          setUpdateStatusText(activeUpdate.status);
        }
      } else {
        const recentProcessed = items.find((i) =>
          (i.action === 'full_update' || i.action === 'update') &&
          i.processed === true
        );
        if (recentProcessed && updateActive) {
          setUpdateActive(false);
          setUpdateProgress(100);
          setUpdateStatusText('Uppdatering slutförd');
        }
      }
      
      // Check for active restart
      const activeRestart = items.find((i) =>
        (i.action === 'reboot' || i.action === 'restart' || i.action === 'restart_progress') &&
        (i.processed === false || (i.progress !== null && i.progress < 100))
      );
      
      if (activeRestart) {
        setRestartActive(true);
        if (activeRestart?.progress !== undefined && activeRestart.progress !== null) {
          setRestartProgress(activeRestart.progress);
        }
        if (activeRestart?.status) {
          setRestartStatusText(activeRestart.status);
        }
      } else {
        const recentRestartProcessed = items.find((i) =>
          (i.action === 'reboot' || i.action === 'restart') &&
          i.processed === true
        );
        if (recentRestartProcessed && restartActive) {
          setRestartActive(false);
          setRestartProgress(100);
          setRestartStatusText('Omstart slutförd');
        }
      }
    });
    return () => unsub();
  }, [id, updateActive, restartActive]);

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
        commandsApi.send(device.id, 'update'),
      ]);
      toast.success('Systemuppdatering startad');
    } catch (error) {
      console.error('Error updating system:', error);
      toast.error('Kunde inte starta uppdatering');
      setUpdateActive(false);
    }
  };
  
  const handleRestart = async () => {
    try {
      setRestartActive(true);
      setRestartProgress(0);
      setRestartStatusText('Startar om enheten...');
      await Promise.all([
        commandsApi.send(device.id, 'reboot'),
        commandsApi.send(device.id, 'restart'),
      ]);
      toast.success('Enheten startar om');
    } catch (error) {
      console.error('Error restarting device:', error);
      toast.error('Kunde inte starta om enheten');
      setRestartActive(false);
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

      {/* Update Status */}
      <OperationStatusCard 
        type="update"
        progress={updateProgress}
        status={updateStatusText}
        isActive={updateActive}
      />

      {/* Restart Status */}
      <OperationStatusCard 
        type="restart"
        progress={restartProgress}
        status={restartStatusText}
        isActive={restartActive}
      />

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
    </div>
  );
};

export default DeviceDetails;
