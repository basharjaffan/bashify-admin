import { useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TEST_DEVICE_ID = 'test-device-001';

export function useTestDevice() {
  useEffect(() => {
    const createTestDevice = async () => {
      const deviceRef = doc(db, 'config', 'devices', 'list', TEST_DEVICE_ID);
      
      // Create a test device that simulates an update in progress
      await setDoc(deviceRef, {
        name: 'Test Device (Uppdaterar)',
        ipAddress: '192.168.1.100',
        status: 'online',
        volume: 75,
        lastSeen: serverTimestamp(),
        updateStatus: 'updating',
        updateProgress: 35,
        firmwareVersion: '1.0.0',
        wifiConnected: true,
        wifiSSID: 'Test-WiFi',
        ethernetConnected: false,
        cpuUsage: 45,
        memoryUsage: 62,
        diskUsage: 28,
        uptime: 3600,
      }, { merge: true });

      // Simulate progress updates
      let progress = 35;
      const interval = setInterval(async () => {
        progress += 5;
        
        if (progress <= 100) {
          await setDoc(deviceRef, {
            updateProgress: progress,
            lastSeen: serverTimestamp(),
          }, { merge: true });
        } else {
          // Update complete
          await setDoc(deviceRef, {
            updateStatus: 'success',
            updateProgress: 100,
            firmwareVersion: '1.1.0',
            lastSeen: serverTimestamp(),
          }, { merge: true });
          
          // Clear status after 3 seconds
          setTimeout(async () => {
            await setDoc(deviceRef, {
              updateStatus: null,
              updateProgress: null,
              lastSeen: serverTimestamp(),
            }, { merge: true });
          }, 3000);
          
          clearInterval(interval);
        }
      }, 2000); // Update every 2 seconds

      return () => clearInterval(interval);
    };

    createTestDevice();
  }, []);
}
