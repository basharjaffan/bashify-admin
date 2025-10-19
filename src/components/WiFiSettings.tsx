import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Wifi, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { commandsApi } from '@/services/firebase-api';

interface WiFiSettingsProps {
  deviceId: string;
  currentSsid?: string;
}

export function WiFiSettings({ deviceId, currentSsid }: WiFiSettingsProps) {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeWiFi = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ssid || !password) {
      toast.error('Please enter both SSID and password');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await commandsApi.send(deviceId, {
        action: 'wifi',
        ssid,
        password
      });
      
      toast.success(`WiFi change command sent! Device will connect to "${ssid}"`, {
        description: 'Please wait 15-30 seconds for the device to reconnect'
      });
      
      setSsid('');
      setPassword('');
    } catch (error) {
      toast.error('Failed to send WiFi change command');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          WiFi Settings
        </CardTitle>
        {currentSsid && (
          <p className="text-sm text-muted-foreground">
            Currently connected to: <strong>{currentSsid}</strong>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangeWiFi} className="space-y-4">
          <div>
            <Label htmlFor="ssid">Network Name (SSID)</Label>
            <Input
              id="ssid"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              placeholder="Enter WiFi network name"
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter WiFi password"
              disabled={loading}
              required
              minLength={8}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Changing WiFi...
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Change WiFi Network
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            ⚠️ Device will disconnect briefly while connecting to the new network
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
