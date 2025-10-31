import { useEffect, useState } from 'react';
import type { Device } from '@/types';

export function useTestDevice() {
  const [testDevice, setTestDevice] = useState<Device | null>(null);

  useEffect(() => {
    // Create initial test device
    const initialDevice: Device = {
      id: 'test-device-001',
      name: 'Test Device (Demo)',
      ipAddress: '192.168.1.100',
      status: 'online',
      volume: 75,
      lastSeen: new Date(),
      updateStatus: 'idle',
      updateProgress: 0,
      restartStatus: 'idle',
      restartProgress: 0,
      firmwareVersion: '1.0.0',
      wifiConnected: true,
      wifiSSID: 'Test-WiFi',
      ethernetConnected: false,
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 28,
      uptime: 3600,
    };

    setTestDevice(initialDevice);

    // Start update simulation after 2 seconds
    const startUpdateTimeout = setTimeout(() => {
      let updateProgress = 0;
      setTestDevice(prev => prev ? { 
        ...prev, 
        updateStatus: 'updating', 
        updateProgress: 0 
      } : prev);
      
      const updateInterval = setInterval(() => {
        updateProgress += 5;
        
        if (updateProgress <= 100) {
          setTestDevice(prev => prev ? { 
            ...prev, 
            updateProgress,
            lastSeen: new Date()
          } : prev);
        } else {
          // Update complete
          setTestDevice(prev => prev ? {
            ...prev,
            updateStatus: 'success',
            updateProgress: 100,
            firmwareVersion: '1.1.0',
            lastSeen: new Date()
          } : prev);
          
          clearInterval(updateInterval);
          
          // Start restart simulation after update completes
          setTimeout(() => {
            let restartProgress = 0;
            setTestDevice(prev => prev ? {
              ...prev,
              updateStatus: 'idle',
              updateProgress: 0,
              restartStatus: 'restarting',
              restartProgress: 0,
              lastSeen: new Date()
            } : prev);
            
            const restartInterval = setInterval(() => {
              restartProgress += 10;
              
              if (restartProgress <= 100) {
                setTestDevice(prev => prev ? {
                  ...prev,
                  restartProgress,
                  lastSeen: new Date()
                } : prev);
              } else {
                // Restart complete
                setTestDevice(prev => prev ? {
                  ...prev,
                  restartStatus: 'success',
                  restartProgress: 100,
                  lastSeen: new Date()
                } : prev);
                
                // Clear restart status after 3 seconds
                setTimeout(() => {
                  setTestDevice(prev => prev ? {
                    ...prev,
                    restartStatus: 'idle',
                    restartProgress: 0,
                    lastSeen: new Date()
                  } : prev);
                }, 3000);
                
                clearInterval(restartInterval);
              }
            }, 500); // Faster for restart
          }, 2000);
        }
      }, 1000); // Update every second
    }, 2000);

    return () => {
      clearTimeout(startUpdateTimeout);
    };
  }, []);

  return testDevice;
}
