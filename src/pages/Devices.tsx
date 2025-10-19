import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../hooks/useDevices';
import { devicesApi, commandsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Radio, Plus, Play, Pause, Trash2, Volume2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '../components/ui/slider';

const Devices = () => {
  const { devices, loading } = useDevices();
  const navigate = useNavigate();
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    streamUrl: ''
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      online: { variant: 'default', label: 'Online' },
      playing: { variant: 'default', label: 'Spelar' },
      offline: { variant: 'destructive', label: 'Offline' },
      paused: { variant: 'secondary', label: 'Pausad' },
      unconfigured: { variant: 'outline', label: 'Okonfigurerad' }
    };
    const config = variants[status] || variants.offline;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await devicesApi.create({
        name: formData.name,
        ipAddress: formData.ipAddress,
        streamUrl: formData.streamUrl || undefined,
        status: 'offline'
      });
      toast.success('Enhet tillagd!');
      setOpen(false);
      setFormData({ name: '', ipAddress: '', streamUrl: '' });
    } catch (error) {
      console.error('Error creating device:', error);
      toast.error('Kunde inte lägga till enhet');
    }
  };

  const handlePlayPause = async (device: any) => {
    try {
      const action = device.status === 'playing' ? 'pause' : 'play';
      await commandsApi.send(device.id, action, device.streamUrl);
      toast.success(`Kommando skickat: ${action}`);
    } catch (error) {
      console.error('Error sending command:', error);
      toast.error('Kunde inte skicka kommando');
    }
  };

  const handleVolumeChange = async (deviceId: string, volume: number) => {
    try {
      await commandsApi.send(deviceId, 'volume', undefined, volume);
      await devicesApi.update(deviceId, { volume });
      toast.success('Volym ändrad');
    } catch (error) {
      console.error('Error changing volume:', error);
      toast.error('Kunde inte ändra volym');
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna enhet?')) return;
    try {
      await devicesApi.delete(deviceId);
      toast.success('Enhet borttagen');
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Kunde inte ta bort enhet');
    }
  };

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map(d => d.id));
    }
  };

  const handleBulkAction = async (action: 'play' | 'pause' | 'delete') => {
    if (selectedDevices.length === 0) {
      toast.error('Välj minst en enhet');
      return;
    }

    if (action === 'delete') {
      if (!confirm(`Är du säker på att du vill ta bort ${selectedDevices.length} enheter?`)) return;
    }

    try {
      const promises = selectedDevices.map(deviceId => {
        if (action === 'delete') {
          return devicesApi.delete(deviceId);
        } else {
          const device = devices.find(d => d.id === deviceId);
          return commandsApi.send(deviceId, action, device?.streamUrl);
        }
      });

      await Promise.all(promises);
      toast.success(`${action === 'delete' ? 'Enheter borttagna' : `Kommando ${action} skickat till ${selectedDevices.length} enheter`}`);
      setSelectedDevices([]);
    } catch (error) {
      console.error('Error with bulk action:', error);
      toast.error('Kunde inte utföra åtgärd');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Laddar enheter...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Enheter</h1>
          <p className="text-muted-foreground">Hantera dina Raspberry Pi-enheter</p>
        </div>
        <div className="flex gap-2">
          {selectedDevices.length > 0 && (
            <>
              <Button variant="outline" onClick={() => handleBulkAction('play')} className="gap-2">
                <Play className="w-4 h-4" />
                Spela ({selectedDevices.length})
              </Button>
              <Button variant="outline" onClick={() => handleBulkAction('pause')} className="gap-2">
                <Pause className="w-4 h-4" />
                Pausa ({selectedDevices.length})
              </Button>
              <Button variant="destructive" onClick={() => handleBulkAction('delete')} className="gap-2">
                <Trash2 className="w-4 h-4" />
                Ta bort ({selectedDevices.length})
              </Button>
            </>
          )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Lägg till Enhet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lägg till ny enhet</DialogTitle>
              <DialogDescription>
                Konfigurera en ny Raspberry Pi för ditt musiksystem
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Enhetsnamn</Label>
                  <Input
                    id="name"
                    placeholder="t.ex. Kök Radio"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ip">IP-adress</Label>
                  <Input
                    id="ip"
                    placeholder="192.168.1.100"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stream">Stream URL (valfritt)</Label>
                  <Input
                    id="stream"
                    placeholder="https://stream.example.com/radio"
                    value={formData.streamUrl}
                    onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Lägg till</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {devices.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-card rounded-lg border border-border">
          <Checkbox
            checked={selectedDevices.length === devices.length}
            onCheckedChange={toggleSelectAll}
            id="select-all"
          />
          <Label htmlFor="select-all" className="cursor-pointer">
            Välj alla ({devices.length} enheter)
          </Label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <Card 
            key={device.id} 
            className={`shadow-card cursor-pointer transition-all hover:shadow-glow ${
              selectedDevices.includes(device.id) ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => navigate(`/devices/${device.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedDevices.includes(device.id)}
                    onCheckedChange={() => toggleDeviceSelection(device.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <Radio className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{device.ipAddress}</p>
                  </div>
                </div>
                {getStatusBadge(device.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {device.streamUrl && (
                <div className="text-sm text-muted-foreground truncate">
                  🎵 {device.streamUrl}
                </div>
              )}
              
              {device.volume !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volym</span>
                    <span className="font-medium">{device.volume}%</span>
                  </div>
                  <Slider
                    value={[device.volume]}
                    onValueChange={([value]) => handleVolumeChange(device.id, value)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause(device);
                  }}
                  disabled={device.status === 'offline'}
                >
                  {device.status === 'playing' ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pausa
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Spela
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
            <h3 className="text-xl font-semibold mb-2">Inga enheter ännu</h3>
            <p className="text-muted-foreground mb-6">
              Lägg till din första Raspberry Pi-enhet för att komma igång
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Lägg till första enheten
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Devices;
