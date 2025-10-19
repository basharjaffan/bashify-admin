import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Radio, 
  Users, 
  Layers, 
  Settings,
  Music2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Enheter', path: '/devices', icon: Radio },
  { name: 'Grupper', path: '/groups', icon: Layers },
  { name: 'Användare', path: '/users', icon: Users },
  { name: 'Inställningar', path: '/settings', icon: Settings },
];

const Layout = () => {
  const location = useLocation();

  const isActive = (path: string) => 
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-6">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                  <Music2 className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Bashify
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Musiksystem
                </p>
              </div>
            </Link>

            {/* Center Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "group flex flex-col items-center gap-1.5 px-6 py-3 rounded-2xl text-xs font-medium transition-all duration-200",
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-glow scale-105"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 transition-transform",
                      active ? "scale-110" : "group-hover:scale-110"
                    )} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Status Indicator */}
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-full border border-border/50">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-success" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-success animate-ping opacity-75" />
              </div>
              <span className="text-xs font-semibold hidden sm:inline">Online</span>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden pb-4">
            <div className="flex gap-2 overflow-x-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
