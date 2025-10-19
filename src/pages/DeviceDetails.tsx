import { useParams, useNavigate } from 'react-router-dom';
import { useDevices } from '../hooks/useDevices';
import { devicesApi, commandsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Radio, Play, Pause, Volume2, Wifi, Clock, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { devices } = useDevices();
  const device = devices.find(d => d.id === id);
  const [streamUrl, setStreamUrl] = useState(device?.streamUrl || '');

  if (!device) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/devices')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Tillbaka
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Enhet hittades inte</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const handlePlayPause = async () => {
    try {
      const action = device.status === 'playing' ? 'pause' : 'play';
      await commandsApi.send(device.id, action, device.streamUrl);
      toast.success(`Kommando skickat: ${action}`);
    } catch (error) {
      console.error('Error sending command:', error);
      toast.error('Kunde inte skicka kommando');
    }
  };

  const handleVolumeChange = async (volume: number) => {
    try {
      await commandsApi.send(device.id, 'volume', undefined, volume);
      await devicesApi.update(device.id, { volume });
      toast.success('Volym ändrad');
    } catch (error) {
      console.error('Error changing volume:', error);
      toast.error('Kunde inte ändra volym');
    }
  };

  const handleUpdateStream = async () => {
    try {
      await devicesApi.update(device.id, { streamUrl });
      toast.success('Stream URL uppdaterad');
    } catch (error) {
      console.error('Error updating stream:', error);
      toast.error('Kunde inte uppdatera stream');
    }
  };

  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return 'Aldrig';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/devices')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Tillbaka
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Radio className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{device.name}</h1>
            <p className="text-muted-foreground">{device.ipAddress}</p>
          </div>
        </div>
        {getStatusBadge(device.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="w-4 h-4 text-primary" />
              Anslutning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{device.status === 'offline' ? 'Offline' : 'Online'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Senast Sedd
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{formatLastSeen(device.lastSeen)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              Aktivitet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{device.status === 'playing' ? 'Spelar' : 'Inaktiv'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kontroller</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button
              size="lg"
              className="flex-1 gap-2"
              onClick={handlePlayPause}
              disabled={device.status === 'offline'}
            >
              {device.status === 'playing' ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pausa
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Spela
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Volym
              </Label>
              <span className="text-sm font-medium">{device.volume || 50}%</span>
            </div>
            <Slider
              value={[device.volume || 50]}
              onValueChange={([value]) => handleVolumeChange(value)}
              max={100}
              step={5}
              disabled={device.status === 'offline'}
            />
          </div>

          <div className="space-y-3">
            <Label>Stream URL</Label>
            <div className="flex gap-2">
              <Input
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://stream.example.com/radio"
              />
              <Button onClick={handleUpdateStream}>Uppdatera</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enhetsinformation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Enhets-ID</span>
            <span className="font-mono text-sm">{device.id}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">IP-adress</span>
            <span className="font-mono">{device.ipAddress}</span>
          </div>
          {device.deviceId && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Device ID</span>
              <span className="font-mono text-sm">{device.deviceId}</span>
            </div>
          )}
          {device.groupId && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Grupp-ID</span>
              <span className="font-mono text-sm">{device.groupId}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceDetails;
