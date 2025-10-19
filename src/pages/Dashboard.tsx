import { useDevices } from '../hooks/useDevices';
import { useGroups } from '../hooks/useGroups';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Radio, Layers, Activity, Users, Play, Circle, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';

const Dashboard = () => {
  const { devices, loading: devicesLoading } = useDevices();
  const { groups, loading: groupsLoading } = useGroups();

  const onlineDevices = devices.filter(d => d.status === 'online' || d.status === 'playing').length;
  const playingDevices = devices.filter(d => d.status === 'playing').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;

  const stats = [
    {
      title: 'Total Devices',
      value: devices.length,
      icon: Radio,
      description: `${onlineDevices} online`,
      color: 'text-blue-500'
    },
    {
      title: 'Playing Now',
      value: playingDevices,
      icon: Play,
      description: `${devices.length > 0 ? Math.round((playingDevices / devices.length) * 100) : 0}% of total`,
      color: 'text-primary'
    },
    {
      title: 'Groups',
      value: groups.length,
      icon: Layers,
      description: 'Device groups',
      color: 'text-purple-500'
    },
    {
      title: 'Users',
      value: 2,
      icon: Users,
      description: 'System users',
      color: 'text-green-500'
    }
  ];

  // Activity data (last 7 days)
  const activityData = [
    { date: 'Oct 13', deviceEvents: 16, playbackEvents: 12 },
    { date: 'Oct 14', deviceEvents: 28, playbackEvents: 8 },
    { date: 'Oct 15', deviceEvents: 12, playbackEvents: 8 },
    { date: 'Oct 16', deviceEvents: 24, playbackEvents: 6 },
    { date: 'Oct 17', deviceEvents: 20, playbackEvents: 8 },
    { date: 'Oct 18', deviceEvents: 30, playbackEvents: 14 },
    { date: 'Oct 19', deviceEvents: 28, playbackEvents: 12 },
  ];

  // Devices per group
  const devicesPerGroup = groups.map(group => ({
    name: group.name,
    devices: devices.filter(d => d.groupId === group.id).length
  })).filter(g => g.devices > 0);

  // Status distribution
  const statusData = [
    { name: 'Online', value: devices.filter(d => d.status === 'online').length },
    { name: 'Playing', value: playingDevices },
    { name: 'Offline', value: offlineDevices },
    { name: 'Paused', value: devices.filter(d => d.status === 'paused').length },
  ].filter(s => s.value > 0);

  // Recent activity (mock data)
  const recentActivity = [
    { type: 'play', message: 'Kitchen Radio started playing', time: '2 minutes ago', icon: Play, color: 'text-blue-500' },
    { type: 'group', message: 'New group "Living Room" created', time: '15 minutes ago', icon: Layers, color: 'text-purple-500' },
    { type: 'offline', message: 'Bedroom Radio went offline', time: '1 hour ago', icon: XCircle, color: 'text-red-500' },
    { type: 'user', message: 'New user added to system', time: '3 hours ago', icon: Users, color: 'text-green-500' },
  ];

  // System health
  const systemHealth = [
    { label: 'Firebase Connection', status: 'Connected', value: null, statusColor: 'text-green-500' },
    { label: 'MQTT Broker', status: 'Offline', value: null, statusColor: 'text-red-500' },
    { label: 'Active Devices', status: null, value: `${onlineDevices}/${devices.length}`, statusColor: 'text-blue-500' },
    { label: 'Offline Devices', status: null, value: offlineDevices.toString(), statusColor: 'text-muted-foreground' },
  ];

  if (devicesLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your music system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Device Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No device data available
              </div>
            ) : (
              <div className="space-y-3">
                {statusData.map((status) => (
                  <div key={status.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        status.name === 'Online' ? 'bg-green-500' :
                        status.name === 'Playing' ? 'bg-blue-500' :
                        status.name === 'Offline' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`} />
                      <span className="text-sm">{status.name}</span>
                    </div>
                    <span className="font-semibold">{status.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devices per Group */}
        <Card>
          <CardHeader>
            <CardTitle>Devices per Group</CardTitle>
          </CardHeader>
          <CardContent>
            {devicesPerGroup.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No groups with devices
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={devicesPerGroup}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="devices" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="deviceEvents" 
                stroke="hsl(217, 91%, 60%)" 
                strokeWidth={2}
                name="Device Events"
                dot={{ fill: 'hsl(217, 91%, 60%)', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="playbackEvents" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Playback Events"
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* System Health & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.statusColor === 'text-green-500' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : item.statusColor === 'text-red-500' ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Circle className={`w-4 h-4 ${item.statusColor}`} />
                    )}
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${item.statusColor}`}>
                    {item.status || item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
