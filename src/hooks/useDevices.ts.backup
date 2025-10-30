import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Device } from '@/types';

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const devicesRef = collection(db, 'config', 'devices', 'list');
    const q = query(devicesRef, orderBy('name', 'asc'));

    // Real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const devicesData: Device[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Check if device is offline (no heartbeat in last 30 seconds)
          const lastSeen = data.lastSeen?.toDate() || new Date(0);
          const now = new Date();
          const secondsSinceLastSeen = (now.getTime() - lastSeen.getTime()) / 1000;
          const isOffline = secondsSinceLastSeen > 30;
          
          // Determine status: offline takes priority, then use Firebase status
          let deviceStatus: 'online' | 'offline' | 'playing' | 'paused' = 'online';
          if (isOffline) {
            deviceStatus = 'offline';
          } else if (data.status) {
            // Use exact status from Firebase if available
            deviceStatus = data.status;
          }
          
          // Log status changes for debugging
          console.log(`Device ${doc.id} (${data.name}): status="${data.status}", isOffline=${isOffline}, finalStatus="${deviceStatus}"`);
          
          devicesData.push({
            id: doc.id,
            name: data.name || doc.id,
            ipAddress: data.ipAddress || 'unknown',
            status: deviceStatus,
            volume: data.volume || 50,
            currentUrl: data.currentUrl,
            streamUrl: data.streamUrl,
            groupId: data.groupId || data.group,
            group: data.group,
            lastSeen: lastSeen,
            uptime: data.uptime,
            firmwareVersion: data.firmwareVersion,
            wifiConnected: data.wifiConnected,
            ethernetConnected: data.ethernetConnected,
            cpuUsage: data.cpuUsage,
            memoryUsage: data.memoryUsage,
            diskUsage: data.diskUsage,
          });
        });
        
        setDevices(devicesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to devices:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  return { devices, loading, error };
}
