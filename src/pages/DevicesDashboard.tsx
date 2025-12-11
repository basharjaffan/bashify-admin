import { useDevices } from '@/hooks/useDevices';
import { useGroups } from '@/hooks/useGroups';
import { DeviceCard } from '@/components/DeviceCard';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Radio } from 'lucide-react';
import { commandsApi, devicesApi } from '@/services/firebase-api';
import { toast } from 'sonner';
import type { Device } from '@/types';

export default function DevicesDashboard() {
  const { devices, loading, error } = useDevices();
  const { groups } = useGroups();

  const handlePlayPause = async (device: Device) => {
    const action = device.status === 'playing' ? 'pause' : 'play';
    const urlToSend = device.streamUrl || device.currentUrl || null;
    
    console.log('🎮 Dashboard Play/Pause:', { 
      action, 
      deviceId: device.id, 
      status: device.status,
      streamUrl: device.streamUrl,
      currentUrl: device.currentUrl,
      urlToSend 
    });
    
    try {
      await commandsApi.send(device.id, action, urlToSend);
      toast.success(`Device ${action === 'play' ? 'playing' : 'paused'}`);
    } catch (error) {
      console.error('Error controlling device:', error);
      toast.error('Failed to control device');
    }
  };

  const handleVolumeChange = async (device: Device, volume: number) => {
    try {
      // Both update database and send commands for compatibility
      await Promise.all([
        commandsApi.send(device.id, 'volume', undefined, volume),
        commandsApi.send(device.id, 'set_volume', undefined, volume),
      ]);
      toast.success(`Volume set to ${volume}%`);
    } catch (error) {
      console.error('Error updating volume:', error);
      toast.error('Failed to update volume');
    }
  };

  const handleGroupChange = async (device: Device, groupId: string) => {
    try {
      const hasGroup = groupId && groupId !== 'none';
      const selectedGroup = groups.find(g => g.id === groupId);
      await devicesApi.update(device.id, {
        groupId: hasGroup ? groupId : undefined,
        streamUrl: hasGroup ? selectedGroup?.streamUrl : undefined
      });

      toast.success('Grupp uppdaterad');
    } catch (error) {
      console.error('Error updating device group:', error);
      toast.error('Kunde inte uppdatera grupp');
    }
  };

  const handleNameChange = async (device: Device, name: string) => {
    try {
      await devicesApi.update(device.id, { name });
      toast.success('Namn uppdaterat');
    } catch (error) {
      console.error('Error updating device name:', error);
      toast.error('Kunde inte uppdatera namn');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-red-500">Error loading devices: {error.message}</p>
        </Card>
      </div>
    );
  }

  const onlineDevices = devices.filter(d => d.status !== 'offline').length;
  const playingDevices = devices.filter(d => d.status === 'playing').length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Devices Dashboard</h1>
              <p className="text-muted-foreground">
                {onlineDevices} online • {playingDevices} playing • {devices.length} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live Updates</span>
          </div>
        </div>

        {/* Devices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const group = groups.find(g => g.id === device.groupId);
            return (
              <DeviceCard 
                key={device.id} 
                device={device}
                groupName={group?.name}
                onPlayPause={handlePlayPause}
                onVolumeChange={handleVolumeChange}
                onGroupChange={handleGroupChange}
                onNameChange={handleNameChange}
                groups={groups}
              />
            );
          })}
        </div>

        {devices.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No devices found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
