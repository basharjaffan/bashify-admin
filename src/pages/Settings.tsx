import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Settings as SettingsIcon, Database, Shield, Bell } from 'lucide-react';
import { Badge } from '../components/ui/badge';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Inställningar</h1>
        <p className="text-muted-foreground">Konfigurera systemet</p>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Database className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Firebase Databas</CardTitle>
                <CardDescription>Anslutningsstatus och konfiguration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="default">Ansluten</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Project ID</span>
                <code className="text-sm">bashify-af01b</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Real-time Sync</span>
                <Badge variant="default">Aktiv</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Säkerhet</CardTitle>
                <CardDescription>Autentisering och åtkomst</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Firebase Auth</span>
                <Badge variant="default">Aktiverad</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">2FA</span>
                <Badge variant="outline">Inaktiverad</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Notifikationer</CardTitle>
                <CardDescription>Aviseringar och påminnelser</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Enhetsaviseringar</span>
                <Badge variant="default">På</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">E-postnotiser</span>
                <Badge variant="default">På</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
