import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroups } from '../hooks/useGroups';
import { useDevices } from '../hooks/useDevices';
import { groupsApi, devicesApi, commandsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Skeleton } from '../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Layers, ArrowLeft, Radio, LinkIcon, Upload, Play, Pause, Volume2, Plus, FileText, Search, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { groups, loading: groupsLoading } = useGroups();
  const { devices, loading: devicesLoading } = useDevices();
  const [editingUrl, setEditingUrl] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [newLocalFiles, setNewLocalFiles] = useState('');
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [groupDeviceSearchQuery, setGroupDeviceSearchQuery] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  const group = groups.find(g => g.id === id);
  const groupDevices = devices.filter(d => d.groupId === id);
  const availableDevices = devices.filter(d => !d.groupId || d.groupId === 'none');
  
  // Filter devices based on search
  const filteredAvailableDevices = availableDevices.filter(d => 
    d.name.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
    d.ipAddress.toLowerCase().includes(deviceSearchQuery.toLowerCase())
  );
  
  const filteredGroupDevices = groupDevices.filter(d =>
    d.name.toLowerCase().includes(groupDeviceSearchQuery.toLowerCase()) ||
    d.ipAddress.toLowerCase().includes(groupDeviceSearchQuery.toLowerCase())
  );

  useEffect(() => {
    if (group?.streamUrl) {
      setStreamUrl(group.streamUrl);
    }
    if (group?.notes) {
      setNotes(group.notes);
    }
  }, [group?.streamUrl, group?.notes]);

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

  const handleUpdateNotes = async () => {
    if (!id) return;
    try {
      await groupsApi.update(id, { notes });
      toast.success('Notes updated');
      setEditingNotes(false);
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
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
        groupId: null,
        streamUrl: null 
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
      if (action === 'play' && group?.uploadType === 'local' && group?.localFiles && group.localFiles.length > 0) {
        // For local files, send playlist to device
        const playlist = group.localFiles.map(f => f.url);
        await commandsApi.send(device.id, 'playlist', JSON.stringify({
          files: playlist,
          repeat: true
        }));
        toast.success('Playing playlist');
      } else {
        await commandsApi.send(device.id, action, device.streamUrl);
        toast.success(`Device ${action === 'play' ? 'playing' : 'paused'}`);
      }
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

  const handleAddLocalFiles = async () => {
    if (!id || !newLocalFiles.trim()) return;
    try {
      const filesArray = newLocalFiles.split('\n').map(f => f.trim()).filter(Boolean);
      const existingFiles = group?.localFiles || [];
      const newFiles = filesArray.map(fileName => ({
        name: fileName,
        url: `/local/${fileName}`,
        size: 0
      }));
      const updatedFiles = [...existingFiles, ...newFiles];
      
      await groupsApi.update(id, { 
        localFiles: updatedFiles,
        uploadType: 'local'
      });
      
      toast.success(`Added ${filesArray.length} local file(s)`);
      setNewLocalFiles('');
      setIsAddingFiles(false);
    } catch (error) {
      console.error('Error adding local files:', error);
      toast.error('Failed to add local files');
    }
  };

  const handleRemoveLocalFile = async (fileIndex: number) => {
    if (!id) return;
    try {
      const existingFiles = group?.localFiles || [];
      const updatedFiles = existingFiles.filter((_, idx) => idx !== fileIndex);
      
      await groupsApi.update(id, { 
        localFiles: updatedFiles
      });
      
      toast.success('File removed');
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file');
    }
  };

  const handleAddSelectedDevices = async () => {
    if (selectedDevices.length === 0) return;
    try {
      const promises = selectedDevices.map(deviceId =>
        devicesApi.update(deviceId, {
          groupId: id,
          streamUrl: group?.streamUrl
        })
      );
      await Promise.all(promises);
      toast.success(`Added ${selectedDevices.length} device(s) to group`);
      setSelectedDevices([]);
      setDeviceSearchQuery('');
    } catch (error) {
      console.error('Error adding devices:', error);
      toast.error('Failed to add devices');
    }
  };

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
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

  if (groupsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Local Files ({group.localFiles.length})
                </Label>
                <Dialog open={isAddingFiles} onOpenChange={setIsAddingFiles}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Files
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Manage Local Files</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 overflow-y-auto">
                      {group.localFiles && group.localFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label>Existing Files ({group.localFiles.length})</Label>
                          <div className="space-y-1 max-h-[200px] overflow-y-auto bg-muted p-3 rounded-lg">
                            {group.localFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-background rounded hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="text-sm truncate">{file.name}</span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => handleRemoveLocalFile(idx)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label>Add New Files (one per line)</Label>
                        <Textarea
                          value={newLocalFiles}
                          onChange={(e) => setNewLocalFiles(e.target.value)}
                          placeholder="song1.mp3&#10;song2.mp3&#10;podcast.mp3"
                          className="min-h-[150px] font-mono text-sm"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddLocalFiles} 
                          className="flex-1"
                          disabled={!newLocalFiles.trim()}
                        >
                          Add Files
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setNewLocalFiles('');
                          setIsAddingFiles(false);
                        }}>
                          Close
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto bg-muted p-3 rounded-lg">
                {group.localFiles.map((file, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="w-3 h-3 shrink-0" />
                    {file.name}
                  </div>
                ))}
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

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </Label>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this group..."
                  className="min-h-[100px]"
                />
                <div className="flex gap-2">
                  <Button onClick={handleUpdateNotes}>Save</Button>
                  <Button variant="outline" onClick={() => {
                    setNotes(group.notes || '');
                    setEditingNotes(false);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg flex-1 whitespace-pre-wrap">
                  {group.notes || 'No notes added'}
                </div>
                <Button variant="outline" onClick={() => setEditingNotes(true)}>
                  Edit
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Devices in Group</h2>
          <div className="flex items-center gap-2">
            {groupDeviceSearchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setGroupDeviceSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search devices..."
                value={groupDeviceSearchQuery}
                onChange={(e) => setGroupDeviceSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {availableDevices.length > 0 && (
          <Card className="shadow-card bg-muted/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Add Devices to Group</CardTitle>
                {selectedDevices.length > 0 && (
                  <Button onClick={handleAddSelectedDevices} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add {selectedDevices.length} Device(s)
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search available devices..."
                  value={deviceSearchQuery}
                  onChange={(e) => setDeviceSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredAvailableDevices.length > 0 ? (
                  filteredAvailableDevices.map(device => (
                    <div
                      key={device.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedDevices.includes(device.id)}
                        onCheckedChange={() => toggleDeviceSelection(device.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-muted-foreground">{device.ipAddress}</div>
                      </div>
                      {getStatusBadge(device.status)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {deviceSearchQuery ? 'No devices found' : 'No available devices'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroupDevices.map((device) => (
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

        {(!devicesLoading && filteredGroupDevices.length === 0) && (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center">
              <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {groupDeviceSearchQuery ? 'No devices found' : 'No devices in group'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {groupDeviceSearchQuery ? 'Try a different search query' : 'Add devices to this group to get started'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GroupDetails;
