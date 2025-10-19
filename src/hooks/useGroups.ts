import { useState, useEffect } from 'react';
import { groupsApi } from '../services/firebase-api';
import type { Group } from '../types';

export const useGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = groupsApi.subscribe((data) => {
      setGroups(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { groups, loading };
};
