import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroups } from '../hooks/useGroups';
import { groupsApi, storageApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Slider } from '../components/ui/slider';
import { Layers, Plus, Trash2, Radio, Link as LinkIcon, Upload, Pencil, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const groupNameSchema = z.object({
  name: z.string().trim().min(1, { message: "Namn kan inte vara tomt" }).max(100, { message: "Namn måste vara mindre än 100 tecken" })
});

const Groups = () => {
  const navigate = useNavigate();
  const { groups, loading } = useGroups();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'url' | 'local'>('url');
  const [formData, setFormData] = useState({
    name: '',
    streamUrl: '',
    announcementInterval: 10,
    announcementVolume: 100
  });
  const [localFiles, setLocalFiles] = useState<FileList | null>(null);
  const [announcementFiles, setAnnouncementFiles] = useState<FileList | null>(null);
  const [showAnnouncementUpload, setShowAnnouncementUpload] = useState(false);
  const [selectedGroupForAnnouncement, setSelectedGroupForAnnouncement] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      toast.info('Creating group...');
      
      const groupData: any = {
        name: formData.name,
        uploadType
      };

      if (uploadType === 'url') {
        groupData.streamUrl = formData.streamUrl;
        await groupsApi.create(groupData);
        toast.success('Group created successfully!');
      } else if (localFiles && localFiles.length > 0) {
        toast.info('Uploading files...');
        // Generate temporary ID for file organization
        const tempGroupId = `group-${Date.now()}`;
        
        // Upload files to Firebase Storage
        const uploadedFiles = await storageApi.uploadGroupFiles(tempGroupId, localFiles);
        groupData.localFiles = uploadedFiles;
        // Set streamUrl to first file
        groupData.streamUrl = uploadedFiles[0]?.url || null;
        
        // Create group with uploaded file references
        await groupsApi.create(groupData);
        toast.success(`Group created with ${uploadedFiles.length} files!`);
      }

      setOpen(false);
      setFormData({ name: '', streamUrl: '', announcementInterval: 10, announcementVolume: 100 });
      setLocalFiles(null);
      setUploadType('url');
    } catch (error: any) {
      console.error('Error creating group:', error);
      if (error?.code === 'storage/unauthorized') {
        toast.error('Storage permission denied. Please configure Firebase Storage rules.');
      } else {
        toast.error('Failed to create group');
      }
    }
  };

  const handleDelete = async (groupId: string) => {
    try {
      await groupsApi.delete(groupId);
      toast.success('Group deleted');
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const handleEditClick = (e: React.MouseEvent, group: any) => {
    e.stopPropagation();
    setEditingGroup(group);
    setEditName(group.name);
    setEditOpen(true);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = groupNameSchema.parse({ name: editName });
      await groupsApi.update(editingGroup.id, { name: validated.name });
      toast.success('Gruppnamn uppdaterat');
      setEditOpen(false);
      setEditingGroup(null);
      setEditName('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Error updating group name:', error);
        toast.error('Misslyckades att uppdatera gruppnamn');
      }
    }
  };

  const handleAnnouncementUpload = async (groupId: string) => {
    if (!announcementFiles || announcementFiles.length === 0) {
      toast.error('Please select announcement files');
      return;
    }

    try {
      toast.info('Uploading announcements...');
      const group = groups.find(g => g.id === groupId);
      const uploadedAnnouncements = await storageApi.uploadAnnouncements(groupId, announcementFiles);
      
      const existingAnnouncements = group?.announcements || [];
      await groupsApi.update(groupId, { 
        announcements: [...existingAnnouncements, ...uploadedAnnouncements],
        announcementInterval: formData.announcementInterval,
        announcementVolume: formData.announcementVolume
      });
      
      toast.success(`${uploadedAnnouncements.length} announcement(s) uploaded!`);
      setShowAnnouncementUpload(false);
      setAnnouncementFiles(null);
      setSelectedGroupForAnnouncement(null);
    } catch (error) {
      console.error('Error uploading announcements:', error);
      toast.error('Failed to upload announcements');
    }
  };

  const handleDeleteAnnouncement = async (groupId: string, announcementIndex: number) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group || !group.announcements) return;

      const updatedAnnouncements = group.announcements.filter((_, idx) => idx !== announcementIndex);
      await groupsApi.update(groupId, { announcements: updatedAnnouncements });
      toast.success('Announcement deleted');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Groups</h1>
          <p className="text-muted-foreground">Organize devices into groups</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Set up a new device group with streaming configuration
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    placeholder="Kitchen Speakers"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Audio Source</Label>
                  <RadioGroup value={uploadType} onValueChange={(value: any) => setUploadType(value)}>
                    <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="url" id="url" />
                      <Label htmlFor="url" className="flex items-center gap-2 cursor-pointer flex-1">
                        <LinkIcon className="w-4 h-4" />
                        Stream URL
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="local" id="local" />
                      <Label htmlFor="local" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Upload className="w-4 h-4" />
                        Local Files
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {uploadType === 'url' ? (
                  <div className="space-y-2">
                    <Label htmlFor="stream">Stream URL</Label>
                    <Input
                      id="stream"
                      placeholder="https://stream-url.com/radio"
                      value={formData.streamUrl}
                      onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                      required={uploadType === 'url'}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="files">Upload Audio Files</Label>
                    <Input
                      id="files"
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={(e) => setLocalFiles(e.target.files)}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Files will be synced to all devices in this group
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit">Create Group</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card 
            key={group.id} 
            className="shadow-card cursor-pointer hover:shadow-glow transition-shadow"
            onClick={() => navigate(`/groups/${group.id}`)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => handleEditClick(e, group)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Radio className="w-3 h-3" />
                    {group.deviceCount || 0} devices
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.uploadType === 'local' && group.localFiles ? (
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Upload className="w-3 h-3" />
                    Local Files ({group.localFiles.length})
                  </div>
                  <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto space-y-1">
                    {group.localFiles.slice(0, 3).map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="truncate">{file.name}</span>
                        <span className="text-[10px] ml-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ))}
                    {group.localFiles.length > 3 && <div>+{group.localFiles.length - 3} more files</div>}
                  </div>
                </div>
              ) : group.streamUrl ? (
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <LinkIcon className="w-3 h-3" />
                    Stream URL
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {group.streamUrl}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No audio source configured</div>
              )}

              {/* Announcements Section */}
              {group.announcements && group.announcements.length > 0 && (
                <div className="text-sm space-y-1 pt-2 border-t border-border">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Volume2 className="w-3 h-3" />
                    📢 {group.announcements.length} announcements
                    {group.announcementInterval && (
                      <span className="text-[10px]">• Every {group.announcementInterval} min</span>
                    )}
                    {group.announcementVolume !== undefined && (
                      <span className="text-[10px]">• Vol: {group.announcementVolume}%</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground max-h-16 overflow-y-auto space-y-1">
                    {group.announcements.slice(0, 2).map((announcement, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="truncate">{announcement.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnnouncement(group.id, idx);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {group.announcements.length > 2 && <div>+{group.announcements.length - 2} more</div>}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroupForAnnouncement(group.id);
                    setShowAnnouncementUpload(true);
                  }}
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Announcements
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGroupToDelete(group.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first group to organize devices
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera gruppnamn</DialogTitle>
            <DialogDescription>
              Ändra namnet på gruppen
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateName}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Gruppnamn</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Spara</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort grupp</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort denna grupp? Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => groupToDelete && handleDelete(groupToDelete)}>
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Announcement Upload Dialog */}
      <Dialog open={showAnnouncementUpload} onOpenChange={setShowAnnouncementUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Announcements</DialogTitle>
            <DialogDescription>
              Upload voice messages to play at regular intervals
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-files">Audio Files</Label>
              <Input
                id="announcement-files"
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => setAnnouncementFiles(e.target.files)}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Upload MP3, WAV or other audio files for announcements
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">Play Interval (minutes)</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                max="1440"
                value={formData.announcementInterval}
                onChange={(e) => setFormData({ ...formData, announcementInterval: parseInt(e.target.value) || 10 })}
              />
              <p className="text-xs text-muted-foreground">
                How often announcements should play (1-1440 minutes)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Announcement Volume</Label>
              <div className="flex items-center gap-4">
                <Volume2 className="h-4 w-4" />
                <Slider
                  value={[formData.announcementVolume]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(value) => setFormData({ ...formData, announcementVolume: value[0] })}
                  className="flex-1"
                />
                <span className="text-sm font-bold min-w-[3ch] text-right">
                  {formData.announcementVolume}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Volume for voice announcements (music will duck to 50%)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => selectedGroupForAnnouncement && handleAnnouncementUpload(selectedGroupForAnnouncement)}
              disabled={!announcementFiles || announcementFiles.length === 0}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Groups;
