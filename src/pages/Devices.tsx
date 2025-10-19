import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../hooks/useDevices';
import { useGroups } from '../hooks/useGroups';
import { devicesApi, commandsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import { Radio, Plus, Play, Pause, Trash2, Volume2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

const Devices = () => {
  const navigate = useNavigate();
  const { devices, loading } = useDevices();
  const { groups } = useGroups();
  const [open, setOpen] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    groupId: ''
  });
  const [localVolumes, setLocalVolumes] = useState<Record<string, number>>({});

  useEffect(() => {
    setLocalVolumes((prev) => {
      const next: Record<string, number> = { ...prev };
      devices.forEach((d) => {
        if (next[d.id] === undefined) next[d.id] = d.volume ?? 50;
      });
      return next;
    });
  }, [devices]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedGroup = groups.find(g => g.id === formData.groupId);
      const hasGroup = formData.groupId && formData.groupId !== 'none';
      await devicesApi.create({
        name: formData.name,
        ipAddress: formData.ipAddress,
        groupId: hasGroup ? formData.groupId : undefined,
        streamUrl: selectedGroup?.streamUrl || undefined,
        status: 'unconfigured',
        volume: 50
      });
      toast.success('Device added successfully!');
      setOpen(false);
      setFormData({ name: '', ipAddress: '', groupId: '' });
    } catch (error) {
      console.error('Error creating device:', error);
      toast.error('Failed to add device');
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

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    try {
      await devicesApi.delete(deviceId);
      toast.success('Device deleted');
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to delete device');
    }
  };

  const toggleDeviceSelection = (deviceId: string) => {
    const newSelection = new Set(selectedDevices);
    if (newSelection.has(deviceId)) {
      newSelection.delete(deviceId);
    } else {
      newSelection.add(deviceId);
    }
    setSelectedDevices(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDevices.size === devices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(devices.map(d => d.id)));
    }
  };

  const handleBulkAction = async (action: 'play' | 'pause' | 'delete') => {
    if (selectedDevices.size === 0) {
      toast.error('No devices selected');
      return;
    }

    if (action === 'delete') {
      if (!confirm(`Delete ${selectedDevices.size} device(s)?`)) return;
    }

    try {
      const promises = Array.from(selectedDevices).map(deviceId => {
        const device = devices.find(d => d.id === deviceId);
        if (action === 'delete') {
          return devicesApi.delete(deviceId);
        } else {
          return commandsApi.send(deviceId, action, device?.streamUrl);
        }
      });
      
      await Promise.all(promises);
      toast.success(`Bulk ${action} completed`);
      setSelectedDevices(new Set());
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      toast.error(`Failed to perform bulk ${action}`);
    }
  };

  const handleDeviceGroupChange = async (deviceId: string, newGroupId: string) => {
    try {
      const hasGroup = newGroupId && newGroupId !== 'none';
      const selectedGroup = groups.find(g => g.id === newGroupId);
      await devicesApi.update(deviceId, {
        groupId: hasGroup ? newGroupId : undefined,
        streamUrl: hasGroup ? selectedGroup?.streamUrl : undefined
      });
      toast.success('Group updated');
    } catch (error) {
      console.error('Error updating device group:', error);
      toast.error('Failed to update group');
    }
  };

  const handleBulkAssignGroup = async (newGroupId: string) => {
    if (selectedDevices.size === 0) {
      toast.error('No devices selected');
      return;
    }
    try {
      const hasGroup = newGroupId && newGroupId !== 'none';
      const selectedGroup = groups.find(g => g.id === newGroupId);
      const updates = Array.from(selectedDevices).map((deviceId) =>
        devicesApi.update(deviceId, {
          groupId: hasGroup ? newGroupId : undefined,
          streamUrl: hasGroup ? selectedGroup?.streamUrl : undefined,
        })
      );
      await Promise.all(updates);
      toast.success('Group assignment completed');
    } catch (error) {
      console.error('Error assigning group in bulk:', error);
      toast.error('Failed to assign group');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Devices</h1>
          <p className="text-muted-foreground">Manage your connected devices</p>
        </div>
        <div className="flex gap-2">
          {selectedDevices.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreVertical className="w-4 h-4" />
                  Bulk Actions ({selectedDevices.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('play')}>
                  <Play className="w-4 h-4 mr-2" />
                  Play Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('pause')}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Assign Group</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleBulkAssignGroup('none')}>
                  No Group
                </DropdownMenuItem>
                {groups.map((group) => (
                  <DropdownMenuItem key={group.id} onClick={() => handleBulkAssignGroup(group.id)}>
                    {group.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('delete')} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>
                  Configure a new device for your music system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Device Name</Label>
                    <Input
                      id="name"
                      placeholder="Living Room Speaker"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ip">IP Address</Label>
                    <Input
                      id="ip"
                      placeholder="192.168.1.100"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group">Group (Optional)</Label>
                    <Select
                      value={formData.groupId}
                      onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Group</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Device</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {devices.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={selectedDevices.size === devices.length}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            Select All ({selectedDevices.size} selected)
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <Card 
            key={device.id} 
            className="shadow-card hover:shadow-glow transition-shadow"
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedDevices.has(device.id)}
                  onCheckedChange={() => toggleDeviceSelection(device.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle 
                      className="text-lg cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/devices/${device.id}`)}
                    >
                      {device.name}
                    </CardTitle>
                    {getStatusBadge(device.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Radio className="w-3 h-3" />
                    {device.ipAddress}
                  </div>
                  {device.groupId && (() => {
                    const group = groups.find(g => g.id === device.groupId);
                    return group ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {group.name}
                        </Badge>
                      </div>
                    ) : null;
                  })()}
                  <div className="mt-2">
                    <Select value={device.groupId || 'none'} onValueChange={(value) => handleDeviceGroupChange(device.id, value)}>
                      <SelectTrigger className="h-8 w-[180px]">
                        <SelectValue placeholder="Assign group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Group</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {device.streamUrl && (
                    <div className="text-xs text-muted-foreground mt-2 truncate">
                      {device.streamUrl}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Volume2 className="w-3 h-3" />
                    Volume
                  </span>
                  <span>{(localVolumes[device.id] ?? device.volume ?? 50)}%</span>
                </div>
                <Slider
                  value={[localVolumes[device.id] ?? device.volume ?? 50]}
                  onValueChange={(value) => setLocalVolumes((prev) => ({ ...prev, [device.id]: value[0] }))}
                  onValueCommit={(value) => handleVolumeChange(device.id, value)}
                  max={100}
                  step={1}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause(device);
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(device.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {devices.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No devices yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first device to get started
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add First Device
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Devices;
