import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bluetooth, Radio, Loader2 } from 'lucide-react';
import { commandsApi } from '../services/firebase-api';
import { toast } from 'sonner';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface BluetoothDevice {
  mac: string;
  name: string;
}

interface BluetoothSettingsProps {
  deviceId: string;
}

export const BluetoothSettings = ({ deviceId }: BluetoothSettingsProps) => {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Listen to device document for Bluetooth updates
  useEffect(() => {
    const deviceRef = doc(db, 'config', 'devices', 'list', deviceId);
    
    const unsubscribe = onSnapshot(deviceRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;

      // Update devices list if available
      if (data.bluetoothDevices && Array.isArray(data.bluetoothDevices)) {
        setDevices(data.bluetoothDevices);
        setScanning(false);
      }

      // Update connected device
      if (data.bluetoothConnected) {
        setConnectedDevice(data.bluetoothConnected);
        setConnecting(null);
      } else if (data.bluetoothConnected === null) {
        setConnectedDevice(null);
        setConnecting(null);
      }
    });

    return () => unsubscribe();
  }, [deviceId]);

  const handleScan = async () => {
    try {
      setScanning(true);
      setDevices([]);
      toast.info('Scanning for Bluetooth devices...');
      
      await commandsApi.send(deviceId, 'bluetooth_scan');
      
      // Scanning takes about 10 seconds
      setTimeout(() => {
        if (devices.length === 0) {
          toast.info('Scan in progress, please wait...');
        }
      }, 12000);
    } catch (error) {
      console.error('Error scanning Bluetooth devices:', error);
      toast.error('Failed to start Bluetooth scan');
      setScanning(false);
    }
  };

  const handlePairAndConnect = async (mac: string, name: string) => {
    try {
      setConnecting(mac);
      toast.info(`Pairing with ${name}...`);
      
      // First pair
      await commandsApi.send(deviceId, 'bluetooth_pair', undefined, undefined, { mac });
      
      // Wait 2 seconds for pairing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Then connect
      toast.info(`Connecting to ${name}...`);
      await commandsApi.send(deviceId, 'bluetooth_connect', undefined, undefined, { mac });
      
      toast.success(`Connected to ${name}`);
    } catch (error) {
      console.error('Error pairing/connecting Bluetooth device:', error);
      toast.error('Failed to connect to Bluetooth device');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (mac: string, name: string) => {
    try {
      setConnecting(mac);
      toast.info(`Disconnecting from ${name}...`);
      
      await commandsApi.send(deviceId, 'bluetooth_disconnect', undefined, undefined, { mac });
      
      toast.success(`Disconnected from ${name}`);
    } catch (error) {
      console.error('Error disconnecting Bluetooth device:', error);
      toast.error('Failed to disconnect Bluetooth device');
      setConnecting(null);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bluetooth className="w-5 h-5" />
          Bluetooth Audio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Connect to Bluetooth speakers or headphones
          </p>
          <Button 
            onClick={handleScan} 
            disabled={scanning}
            variant="outline"
            className="gap-2"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                Scan for Devices
              </>
            )}
          </Button>
        </div>

        {devices.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Available Devices:</p>
            <div className="space-y-2">
              {devices.map((device) => {
                const isConnected = connectedDevice === device.mac;
                const isConnecting = connecting === device.mac;
                
                return (
                  <div
                    key={device.mac}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Bluetooth className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">{device.mac}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected && (
                        <Badge variant="default" className="gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Connected
                        </Badge>
                      )}
                      {isConnected ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisconnect(device.mac, device.name)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? 'Disconnecting...' : 'Disconnect'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handlePairAndConnect(device.mac, device.name)}
                          disabled={isConnecting || !!connectedDevice}
                        >
                          {isConnecting ? 'Connecting...' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {scanning && devices.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Searching for Bluetooth devices...</p>
          </div>
        )}

        {!scanning && devices.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bluetooth className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No devices found. Click "Scan for Devices" to start.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
