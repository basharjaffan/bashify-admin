import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Device, Group, User } from '../types';

// Devices API
export const devicesApi = {
  subscribe: (callback: (devices: Device[]) => void) => {
    const devicesRef = collection(db, 'config', 'devices', 'list');
    const q = query(devicesRef, orderBy('lastSeen', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const devices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Device[];
      callback(devices);
    });
  },

  create: async (data: Omit<Device, 'id'>) => {
    const devicesRef = collection(db, 'config', 'devices', 'list');
    await addDoc(devicesRef, {
      ...data,
      status: data.status || 'offline',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });
  },

  update: async (deviceId: string, data: Partial<Device>) => {
    const deviceRef = doc(db, 'config', 'devices', 'list', deviceId);
    await updateDoc(deviceRef, data);
  },

  delete: async (deviceId: string) => {
    const deviceRef = doc(db, 'config', 'devices', 'list', deviceId);
    await deleteDoc(deviceRef);
  }
};

// Groups API
export const groupsApi = {
  subscribe: (callback: (groups: Group[]) => void) => {
    const groupsRef = collection(db, 'config', 'groups', 'list');
    const q = query(groupsRef, orderBy('name', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      callback(groups);
    });
  },

  create: async (data: Omit<Group, 'id'>) => {
    const groupsRef = collection(db, 'config', 'groups', 'list');
    await addDoc(groupsRef, {
      ...data,
      createdAt: serverTimestamp()
    });
  },

  update: async (groupId: string, data: Partial<Group>) => {
    const groupRef = doc(db, 'config', 'groups', 'list', groupId);
    await updateDoc(groupRef, data);
  },

  delete: async (groupId: string) => {
    const groupRef = doc(db, 'config', 'groups', 'list', groupId);
    await deleteDoc(groupRef);
  }
};

// Users API
export const usersApi = {
  subscribe: (callback: (users: User[]) => void) => {
    const usersRef = collection(db, 'config', 'users', 'list');
    
    return onSnapshot(usersRef, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      callback(users);
    });
  },

  create: async (data: Omit<User, 'id'>) => {
    const usersRef = collection(db, 'config', 'users', 'list');
    await addDoc(usersRef, {
      ...data,
      createdAt: serverTimestamp()
    });
  },

  update: async (userId: string, data: Partial<User>) => {
    const userRef = doc(db, 'config', 'users', 'list', userId);
    await updateDoc(userRef, data);
  },

  delete: async (userId: string) => {
    const userRef = doc(db, 'config', 'users', 'list', userId);
    await deleteDoc(userRef);
  }
};

// Commands API
export const commandsApi = {
  send: async (deviceId: string, action: string, streamUrl?: string, volume?: number) => {
    const commandsRef = collection(db, 'config', 'commands', 'list');
    await addDoc(commandsRef, {
      deviceId,
      action,
      streamUrl: streamUrl || null,
      volume: volume || null,
      processed: false,
      createdAt: serverTimestamp()
    });
  }
};
