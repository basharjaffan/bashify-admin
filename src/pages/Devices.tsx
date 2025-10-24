import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { Radio, Plus, Play, Pause, Trash2, MoreVertical, Pencil, Activity, RotateCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const deviceNameSchema = z.object({
  name: z.string().trim().min(1, { message: "Name cannot be empty" }).max(100, { message: "Name must be less than 100 characters" })
});

const Devices = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { devices, loading } = useDevices();
  const { groups } = useGroups();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('filter') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    groupId: ''
  });
  const [localVolumes, setLocalVolumes] = useState<Record<string, number>>({});
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalVolumes((prev) => {
      const next: Record<string, number> = { ...prev };
      devices.forEach((d) => {
        if (next[d.id] === undefined) next[d.id] = d.volume ?? 50;
      });
      return next;
    });
  }, [devices]);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setStatusFilter(filter);
    }
  }, [searchParams]);

  const filteredDevices = devices.filter(device => {
    const matchesFilter = (() => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'playing') return device.status === 'playing';
      if (statusFilter === 'online') return device.status === 'online' || device.status === 'playing';
      if (statusFilter === 'offline') return device.status === 'offline';
      if (statusFilter === 'paused') return device.status === 'paused';
      return true;
    })();

    const matchesSearch = searchQuery === '' || 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    if (filter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', filter);
    }
    setSearchParams(searchParams);
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
    const currentStatus = optimisticStatus[device.id] || device.status;
    const action = currentStatus === 'playing' ? 'pause' : 'play';
    const newStatus = action === 'play' ? 'playing' : 'paused';
    
    // Optimistic update - uppdatera UI direkt
    setOptimisticStatus(prev => ({ ...prev, [device.id]: newStatus }));
    
    try {
      await commandsApi.send(device.id, action, device.streamUrl);
      toast.success(`Device ${action === 'play' ? 'playing' : 'paused'}`);
      // Rensa optimistic status efter 2 sekunder (Firebase ska ha uppdaterat då)
      setTimeout(() => {
        setOptimisticStatus(prev => {
          const next = { ...prev };
          delete next[device.id];
          return next;
        });
      }, 2000);
    } catch (error) {
      // Återställ vid fel
      setOptimisticStatus(prev => {
        const next = { ...prev };
        delete next[device.id];
        return next;
      });
      console.error('Error controlling device:', error);
      toast.error('Failed to control device');
    }
  };

  // Explicit controls to satisfy "disable Play when already playing"
  const handlePlay = async (device: any) => {
    const currentStatus = optimisticStatus[device.id] || device.status;
    if (currentStatus === 'playing') return; // prevent play while already playing
    
    // Optimistic update
    setOptimisticStatus(prev => ({ ...prev, [device.id]: 'playing' }));
    
    try {
      await commandsApi.send(device.id, 'play', device.streamUrl);
      toast.success('Device playing');
      setTimeout(() => {
        setOptimisticStatus(prev => {
          const next = { ...prev };
          delete next[device.id];
          return next;
        });
      }, 2000);
    } catch (error) {
      setOptimisticStatus(prev => {
        const next = { ...prev };
        delete next[device.id];
        return next;
      });
      console.error('Error starting playback:', error);
      toast.error('Failed to start playback');
    }
  };

  const handlePause = async (device: any) => {
    const currentStatus = optimisticStatus[device.id] || device.status;
    if (currentStatus !== 'playing') return; // pause only when playing
    
    // Optimistic update
    setOptimisticStatus(prev => ({ ...prev, [device.id]: 'paused' }));
    
    try {
      await commandsApi.send(device.id, 'pause', device.streamUrl);
      toast.success('Device paused');
      setTimeout(() => {
        setOptimisticStatus(prev => {
          const next = { ...prev };
          delete next[device.id];
          return next;
        });
      }, 2000);
    } catch (error) {
      setOptimisticStatus(prev => {
        const next = { ...prev };
        delete next[device.id];
        return next;
      });
      console.error('Error pausing device:', error);
      toast.error('Failed to pause device');
    }
  };

  const handleRestart = async (device: any) => {
    try {
      await Promise.all([
        commandsApi.send(device.id, 'reboot'),
        commandsApi.send(device.id, 'restart'),
      ]);
      toast.success('Device restarting...');
    } catch (error) {
      console.error('Error restarting device:', error);
      toast.error('Failed to restart device');
    }
  };

  const handleUpdate = async (device: any) => {
    try {
      await Promise.all([
        commandsApi.send(device.id, 'full_update'),
        commandsApi.send(device.id, 'update'),
      ]);
      toast.success('Full update started. Device will restart after update.');
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('Failed to start update');
    }
  };

  const handleVolumeChange = async (deviceId: string, value: number[]) => {
    const vol = value[0];
    // Ensure local state reflects committed value too
    setLocalVolumes((prev) => ({ ...prev, [deviceId]: vol }));
    try {
      await devicesApi.update(deviceId, { volume: vol });
      // Send both common action names for compatibility
      await Promise.all([
        commandsApi.send(deviceId, 'volume', undefined, vol),
        commandsApi.send(deviceId, 'set_volume', undefined, vol),
      ]);
      toast.success(`Volume updated to ${vol}%`);
    } catch (error) {
      console.error('Error updating volume:', error);
      toast.error('Failed to update volume');
    }
  };

  const handleDelete = async (deviceId: string) => {
    try {
      await devicesApi.delete(deviceId);
      toast.success('Device deleted');
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
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
    if (selectedDevices.size === filteredDevices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(filteredDevices.map(d => d.id)));
    }
  };

  const handleBulkAction = async (action: 'play' | 'pause' | 'restart' | 'update' | 'delete') => {
    if (selectedDevices.size === 0) {
      toast.error('No devices selected');
      return;
    }

    if (action === 'delete') {
      setBulkDeleteDialogOpen(true);
      return;
    }

    try {
      const promises = Array.from(selectedDevices).map(deviceId => {
        const device = devices.find(d => d.id === deviceId);
        if (action === 'restart') {
          return Promise.all([
            commandsApi.send(deviceId, 'reboot'),
            commandsApi.send(deviceId, 'restart'),
          ]);
        } else if (action === 'update') {
          return Promise.all([
            commandsApi.send(deviceId, 'full_update'),
            commandsApi.send(deviceId, 'update'),
          ]);
        }
        return commandsApi.send(deviceId, action, device?.streamUrl);
      });
      
      await Promise.all(promises);
      toast.success(`Bulk ${action} completed`);
      setSelectedDevices(new Set());
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      toast.error(`Failed to perform bulk ${action}`);
    }
  };

  const confirmBulkDelete = async () => {
    try {
      const promises = Array.from(selectedDevices).map(deviceId =>
        devicesApi.delete(deviceId)
      );
      await Promise.all(promises);
      toast.success(`${selectedDevices.size} device(s) deleted`);
      setSelectedDevices(new Set());
      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast.error('Failed to complete bulk delete');
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
      
      // Stop current music and start new group music
      if (hasGroup && selectedGroup?.streamUrl) {
        await commandsApi.send(deviceId, 'stop');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await commandsApi.send(deviceId, 'play', selectedGroup.streamUrl);
      }
      
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
      
      // Send play commands to all devices
      if (hasGroup && selectedGroup?.streamUrl) {
        const playCommands = Array.from(selectedDevices).map(deviceId =>
          commandsApi.send(deviceId, 'play', selectedGroup.streamUrl)
        );
        await Promise.all(playCommands);
      }
      
      toast.success('Group assignment completed');
    } catch (error) {
      console.error('Error assigning group in bulk:', error);
      toast.error('Failed to assign group');
    }
  };

  const handleEditClick = (e: React.MouseEvent, device: any) => {
    e.stopPropagation();
    setEditingDevice(device);
    setEditName(device.name);
    setEditOpen(true);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = deviceNameSchema.parse({ name: editName });
      await devicesApi.update(editingDevice.id, { name: validated.name });
      toast.success('Device name updated');
      setEditOpen(false);
      setEditingDevice(null);
      setEditName('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Error updating device name:', error);
        toast.error('Failed to update device name');
      }
    }
  };

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'N/A';
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Never';
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false
    }).format(date);
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
      <div className="flex items-center justify-between flex-wrap gap-4">
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
                <DropdownMenuItem onClick={() => handleBulkAction('restart')}>
                  <RotateCw className="w-4 h-4 mr-2" />
                  Restart Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('update')}>
                  <Download className="w-4 h-4 mr-2" />
                  Update Selected
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('all')}
          >
            All ({devices.length})
          </Button>
          <Button
            variant={statusFilter === 'playing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('playing')}
          >
            Playing ({devices.filter(d => d.status === 'playing').length})
          </Button>
          <Button
            variant={statusFilter === 'online' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('online')}
          >
            Online ({devices.filter(d => d.status === 'online' || d.status === 'playing').length})
          </Button>
          <Button
            variant={statusFilter === 'offline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('offline')}
          >
            Offline ({devices.filter(d => d.status === 'offline').length})
          </Button>
          <Button
            variant={statusFilter === 'paused' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('paused')}
          >
            Paused ({devices.filter(d => d.status === 'paused').length})
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-md ml-auto">
          <Input
            placeholder="Search devices by name or IP address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {filteredDevices.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No devices found with the selected filter.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDevices.size === filteredDevices.length && filteredDevices.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Device Name</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>RAM</TableHead>
                <TableHead>Disk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device) => (
                <TableRow 
                  key={device.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => navigate(`/devices/${device.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedDevices.has(device.id)}
                      onCheckedChange={() => toggleDeviceSelection(device.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {device.name}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(e, device);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Radio className="w-3 h-3" />
                      {device.ipAddress}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(optimisticStatus[device.id] || device.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatUptime(device.uptime)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatLastSeen(device.lastSeen)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-muted-foreground" />
                      <span className={device.cpuUsage && device.cpuUsage > 80 ? 'text-warning' : ''}>
                        {device.cpuUsage ? `${device.cpuUsage}%` : 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-muted-foreground" />
                      <span className={device.memoryUsage && device.memoryUsage > 80 ? 'text-warning' : ''}>
                        {device.memoryUsage ? `${device.memoryUsage}%` : 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-muted-foreground" />
                      <span className={device.diskUsage && device.diskUsage > 80 ? 'text-warning' : ''}>
                        {device.diskUsage ? `${device.diskUsage}%` : 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={(optimisticStatus[device.id] || device.status) === 'playing'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(device);
                        }}
                        title="Play"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={(optimisticStatus[device.id] || device.status) !== 'playing'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePause(device);
                        }}
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeviceToDelete(device.id);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete Device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device Name</DialogTitle>
            <DialogDescription>
              Change the name of the device
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateName}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Device Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this device? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deviceToDelete && handleDelete(deviceToDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Devices</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedDevices.size} device(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Devices;
