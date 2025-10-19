import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroups } from '../hooks/useGroups';
import { groupsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Layers, Plus, Trash2, Radio, Link as LinkIcon, Upload, Pencil } from 'lucide-react';
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
    streamUrl: ''
  });
  const [localFiles, setLocalFiles] = useState<FileList | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const groupData: any = {
        name: formData.name,
        uploadType
      };

      if (uploadType === 'url') {
        groupData.streamUrl = formData.streamUrl;
      } else if (localFiles && localFiles.length > 0) {
        // In a real implementation, you would upload files to storage
        // For now, we'll store the file names as a reference
        groupData.localFiles = Array.from(localFiles).map(f => f.name);
        toast.info('Local file upload will sync to devices');
      }

      await groupsApi.create(groupData);
      toast.success('Group created successfully!');
      setOpen(false);
      setFormData({ name: '', streamUrl: '' });
      setLocalFiles(null);
      setUploadType('url');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
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
                  <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                    {group.localFiles.slice(0, 3).join(', ')}
                    {group.localFiles.length > 3 && '...'}
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
              
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setGroupToDelete(group.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
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
    </div>
  );
};

export default Groups;
