import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroups } from '../hooks/useGroups';
import { useDevices } from '../hooks/useDevices';
import { groupsApi, devicesApi, commandsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Layers, ArrowLeft, Radio, LinkIcon, Upload, Play, Pause, Volume2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { groups } = useGroups();
  const { devices } = useDevices();
  const [editingUrl, setEditingUrl] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');

  const group = groups.find(g => g.id === id);
  const groupDevices = devices.filter(d => d.groupId === id);
  const availableDevices = devices.filter(d => !d.groupId || d.groupId === 'none');

  useEffect(() => {
    if (group?.streamUrl) {
      setStreamUrl(group.streamUrl);
    }
  }, [group?.streamUrl]);

  const handleUpdateUrl = async () => {
    if (!id) return;
    try {
      // First, stop all playing devices
      const stopPromises = groupDevices
        .filter(device => device.status === 'playing')
        .map(device => commandsApi.send(device.id, 'pause'));
      await Promise.all(stopPromises);
      
      // Update group and all devices with the new stream URL
      await groupsApi.update(id, { streamUrl });
      const updatePromises = groupDevices.map(device => 
        devicesApi.update(device.id, { streamUrl })
      );
      await Promise.all(updatePromises);
      
      // Start playing with new URL on devices that were playing
      const playPromises = groupDevices
        .filter(device => device.status === 'playing')
        .map(device => commandsApi.send(device.id, 'play', streamUrl));
      await Promise.all(playPromises);
      
      toast.success('Stream URL updated and restarted for all devices');
      setEditingUrl(false);
    } catch (error) {
      console.error('Error updating stream URL:', error);
      toast.error('Failed to update stream URL');
    }
  };

  const handleAddDevice = async (deviceId: string) => {
    try {
      await devicesApi.update(deviceId, { 
        groupId: id,
        streamUrl: group?.streamUrl 
      });
      toast.success('Device added to group');
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error('Failed to add device');
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await devicesApi.update(deviceId, { 
        groupId: undefined,
        streamUrl: undefined 
      });
      toast.success('Device removed from group');
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Failed to remove device');
    }
  };

  const handlePlayPause = async (device: any) => {
    const action = device.status === 'playing' ? 'pause' : 'play';
    try {
      await commandsApi.send(device.id, action, device.streamUrl);
      toast.success(`Device ${action === 'play' ? 'playing' : 'paused'}`);
    } catch (error) {
      console.error('Error controlling device:', error);
      toast.error('Failed to control device');
    }
  };

  const handleVolumeChange = async (deviceId: string, value: number[]) => {
    try {
      await devicesApi.update(deviceId, { volume: value[0] });
      await commandsApi.send(deviceId, 'volume', undefined, value[0]);
    } catch (error) {
      console.error('Error updating volume:', error);
    }
  };

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

  if (!group) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Group not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/groups')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
          <p className="text-muted-foreground">{groupDevices.length} devices in group</p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Group Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {group.uploadType === 'local' && group.localFiles ? (
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4" />
                Local Files ({group.localFiles.length})
              </Label>
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {group.localFiles.join(', ')}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="streamUrl" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Stream URL
              </Label>
              {editingUrl ? (
                <div className="flex gap-2">
                  <Input
                    id="streamUrl"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="https://stream-url.com/radio"
                  />
                  <Button onClick={handleUpdateUrl}>Save</Button>
                  <Button variant="outline" onClick={() => {
                    setStreamUrl(group.streamUrl || '');
                    setEditingUrl(false);
                  }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg flex-1">
                    {group.streamUrl || 'No stream URL configured'}
                  </div>
                  <Button variant="outline" onClick={() => setEditingUrl(true)}>
                    Edit
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Devices in Group</h2>
          {availableDevices.length > 0 && (
            <Select onValueChange={handleAddDevice}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Add device to group" />
              </SelectTrigger>
              <SelectContent>
                {availableDevices.map(device => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupDevices.map((device) => (
            <Card key={device.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Radio className="w-3 h-3" />
                      {device.ipAddress}
                    </div>
                  </div>
                  {getStatusBadge(device.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      Volume
                    </span>
                    <span>{device.volume || 50}%</span>
                  </div>
                  <Slider
                    value={[device.volume || 50]}
                    onValueChange={(value) => handleVolumeChange(device.id, value)}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handlePlayPause(device)}
                  >
                    {device.status === 'playing' ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveDevice(device.id)}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {groupDevices.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center">
              <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No devices in group</h3>
              <p className="text-muted-foreground mb-6">
                Add devices to this group to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GroupDetails;
