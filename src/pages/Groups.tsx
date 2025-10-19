import { useState } from 'react';
import { useGroups } from '../hooks/useGroups';
import { groupsApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const Groups = () => {
  const { groups, loading } = useGroups();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    streamUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await groupsApi.create({
        name: formData.name,
        streamUrl: formData.streamUrl || undefined
      });
      toast.success('Grupp skapad!');
      setOpen(false);
      setFormData({ name: '', streamUrl: '' });
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Kunde inte skapa grupp');
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna grupp?')) return;
    try {
      await groupsApi.delete(groupId);
      toast.success('Grupp borttagen');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Kunde inte ta bort grupp');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Laddar grupper...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Grupper</h1>
          <p className="text-muted-foreground">Organisera enheter i grupper</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Skapa Grupp
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Skapa ny grupp</DialogTitle>
              <DialogDescription>
                Gruppera enheter för att hantera flera samtidigt
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Gruppnamn</Label>
                  <Input
                    id="name"
                    placeholder="t.ex. Kontoret"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stream">Stream URL (valfritt)</Label>
                  <Input
                    id="stream"
                    placeholder="https://stream.example.com/radio"
                    value={formData.streamUrl}
                    onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Skapa</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card key={group.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.streamUrl && (
                <div className="text-sm text-muted-foreground truncate">
                  🎵 {group.streamUrl}
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                {group.deviceCount || 0} enheter
              </div>

              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={() => handleDelete(group.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Ta bort
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Inga grupper ännu</h3>
            <p className="text-muted-foreground mb-6">
              Skapa din första grupp för att organisera enheter
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Skapa första gruppen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Groups;
