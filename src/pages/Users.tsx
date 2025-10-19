import { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { usersApi } from '../services/firebase-api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Users as UsersIcon, Plus, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';

const Users = () => {
  const { users, loading } = useUsers();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.create({
        name: formData.name,
        email: formData.email
      });
      toast.success('Användare tillagd!');
      setOpen(false);
      setFormData({ name: '', email: '' });
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Kunde inte lägga till användare');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna användare?')) return;
    try {
      await usersApi.delete(userId);
      toast.success('Användare borttagen');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Kunde inte ta bort användare');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Laddar användare...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Användare</h1>
          <p className="text-muted-foreground">Hantera systemanvändare</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Lägg till Användare
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lägg till ny användare</DialogTitle>
              <DialogDescription>
                Skapa en ny användare för systemet
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Namn</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Lägg till</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <Card key={user.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{user.name}</CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={() => handleDelete(user.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Ta bort
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <UsersIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Inga användare ännu</h3>
            <p className="text-muted-foreground mb-6">
              Lägg till din första användare för att komma igång
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Lägg till första användaren
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Users;
