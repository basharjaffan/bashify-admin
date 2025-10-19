import { useState, useEffect } from 'react';
import { devicesApi } from '../services/firebase-api';
import type { Device } from '../types';

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = devicesApi.subscribe((data) => {
      setDevices(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { devices, loading };
};
