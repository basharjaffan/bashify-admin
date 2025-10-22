import { useDevices } from '@/hooks/useDevices';
import { useGroups } from '@/hooks/useGroups';
import { DeviceCard } from '@/components/DeviceCard';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Radio } from 'lucide-react';
import { commandsApi } from '@/services/firebase-api';
import { toast } from 'sonner';
import type { Device } from '@/types';

export default function DevicesDashboard() {
  const { devices, loading, error } = useDevices();
  const { groups } = useGroups();

  const handlePlayPause = async (device: Device) => {
    const action = device.status === 'playing' ? 'pause' : 'play';
    try {
      await commandsApi.send(device.id, action, device.streamUrl);
      toast.success(`Device ${action === 'play' ? 'playing' : 'paused'}`);
    } catch (error) {
      console.error('Error controlling device:', error);
      toast.error('Failed to control device');
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
