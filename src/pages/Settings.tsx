import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Settings as SettingsIcon, Database, Shield, Bell } from 'lucide-react';
import { Badge } from '../components/ui/badge';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure the system</p>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Database className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Firebase Database</CardTitle>
                <CardDescription>Connection status and configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Project ID</span>
                <code className="text-sm">bashify-af01b</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Real-time Sync</span>
                <Badge variant="default">Active</Badge>
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
                <CardTitle>Security</CardTitle>
                <CardDescription>Authentication and access</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Firebase Auth</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">2FA</span>
                <Badge variant="outline">Disabled</Badge>
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
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Alerts and reminders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Device alerts</span>
                <Badge variant="default">On</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email notifications</span>
                <Badge variant="default">On</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
