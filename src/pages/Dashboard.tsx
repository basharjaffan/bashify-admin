import { useDevices } from '../hooks/useDevices';
import { useGroups } from '../hooks/useGroups';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Radio, Layers, Activity, Users } from 'lucide-react';

const Dashboard = () => {
  const { devices, loading: devicesLoading } = useDevices();
  const { groups, loading: groupsLoading } = useGroups();

  const onlineDevices = devices.filter(d => d.status === 'online' || d.status === 'playing').length;
  const playingDevices = devices.filter(d => d.status === 'playing').length;

  const stats = [
    {
      title: 'Totalt Enheter',
      value: devices.length,
      icon: Radio,
      description: `${onlineDevices} online`,
      color: 'text-primary'
    },
    {
      title: 'Spelar Nu',
      value: playingDevices,
      icon: Activity,
      description: 'Aktiva strömmar',
      color: 'text-accent'
    },
    {
      title: 'Grupper',
      value: groups.length,
      icon: Layers,
      description: 'Konfigurerade grupper',
      color: 'text-success'
    },
    {
      title: 'Offline',
      value: devices.length - onlineDevices,
      icon: Users,
      description: 'Kräver uppmärksamhet',
      color: 'text-destructive'
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      online: { variant: 'default', label: 'Online' },
      playing: { variant: 'default', label: 'Spelar' },
      offline: { variant: 'destructive', label: 'Offline' },
      paused: { variant: 'secondary', label: 'Pausad' },
      unconfigured: { variant: 'outline', label: 'Okonfigurerad' }
    };
    const config = variants[status] || variants.offline;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (devicesLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Översikt över ditt musiksystem</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Devices */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Senaste Enheter</CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Inga enheter konfigurerade än
            </div>
          ) : (
            <div className="space-y-4">
              {devices.slice(0, 5).map((device) => (
                <div key={device.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <Radio className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-muted-foreground">{device.ipAddress}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {device.volume !== undefined && (
                      <div className="text-sm text-muted-foreground">Vol: {device.volume}%</div>
                    )}
                    {getStatusBadge(device.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
