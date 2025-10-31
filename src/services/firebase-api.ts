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
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
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
    // First get the group to check for files to delete
    const groupRef = doc(db, 'config', 'groups', 'list', groupId);
    const groupSnapshot = await getDocs(query(collection(db, 'config', 'groups', 'list')));
    const groupData = groupSnapshot.docs.find(d => d.id === groupId)?.data();
    
    // Delete files from storage if this is a local upload group
    if (groupData?.uploadType === 'local' && groupData?.localFiles) {
      const deletePromises = groupData.localFiles
        .filter((file: any) => file.url.startsWith('https://')) // Only delete uploaded files
        .map((file: any) => {
          try {
            const filePath = `groups/${groupId}/${file.name}`;
            return storageApi.deleteFile(filePath);
          } catch (error) {
            console.error(`Failed to delete file ${file.name}:`, error);
            return Promise.resolve(); // Continue even if one file fails
          }
        });
      await Promise.allSettled(deletePromises);
    }
    
    // Update all devices in this group to have null groupId
    const devicesRef = collection(db, 'config', 'devices', 'list');
    const devicesSnapshot = await getDocs(devicesRef);
    
    const updatePromises = devicesSnapshot.docs
      .filter(doc => doc.data().groupId === groupId)
      .map(doc => updateDoc(doc.ref, { groupId: null, group: null, streamUrl: null }));
    
    await Promise.all(updatePromises);
    
    // Finally delete the group
    await deleteDoc(groupRef);
  }
};

// Users API
export const usersApi = {
  subscribe: (callback: (users: User[]) => void) => {
    const usersRef = collection(db, 'users');
    
    return onSnapshot(usersRef, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      callback(users);
    });
  },

  create: async (data: Omit<User, 'id'>) => {
    const usersRef = collection(db, 'users');
    await addDoc(usersRef, {
      ...data,
      createdAt: serverTimestamp()
    });
  },

  update: async (userId: string, data: Partial<User>) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
  },

  delete: async (userId: string) => {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  }
};

// Commands API
export const commandsApi = {
  send: async (deviceId: string, action: string | { action: string; ssid?: string; password?: string }, streamUrl?: string, volume?: number) => {
    const commandsRef = collection(db, 'config', 'devices', 'list', deviceId, 'commands');

    // Handle both string actions and object actions (for WiFi commands)
    if (typeof action === 'object') {
      await addDoc(commandsRef, {
        action: action.action,
        ssid: action.ssid || null,
        password: action.password || null,
        streamUrl: null,
        volume: null,
        processed: false,
        createdAt: serverTimestamp()
      });
    } else {
      await addDoc(commandsRef, {
        action,
        streamUrl: streamUrl || null,
        volume: volume || null,
        processed: false,
        createdAt: serverTimestamp()
      });
    }
  }
};

// Storage API for file uploads
export const storageApi = {
  uploadFile: async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  },

  uploadGroupFiles: async (groupId: string, files: FileList): Promise<Array<{ name: string; url: string; size: number }>> => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const path = `groups/${groupId}/${file.name}`;
      const url = await storageApi.uploadFile(file, path);
      return {
        name: file.name,
        url,
        size: file.size
      };
    });
    return Promise.all(uploadPromises);
  },

  uploadAnnouncements: async (groupId: string, files: FileList): Promise<Array<{ name: string; url: string; size: number; uploadedAt: any }>> => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const path = `groups/${groupId}/announcements/${file.name}`;
      const url = await storageApi.uploadFile(file, path);
      return {
        name: file.name,
        url,
        size: file.size,
        uploadedAt: new Date()
      };
    });
    return Promise.all(uploadPromises);
  },

  deleteFile: async (path: string) => {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }
};

// Add wifi command type
export interface WiFiCommand {
  action: 'wifi';
  ssid: string;
  password: string;
}
