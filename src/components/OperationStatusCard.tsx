import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw, Activity, CheckCircle2 } from 'lucide-react';

interface OperationStatusCardProps {
  type: 'update' | 'restart';
  progress: number;
  status: string;
  isActive: boolean;
}

export function OperationStatusCard({ type, progress, status, isActive }: OperationStatusCardProps) {
  if (!isActive && progress === 0) return null;

  const isUpdate = type === 'update';
  const Icon = isUpdate ? Download : RefreshCw;
  const title = isUpdate ? 'System Update in Progress' : 'Device Restarting';
  const defaultStatus = isUpdate ? 'Preparing update...' : 'Restarting device...';

  return (
    <Card className="relative overflow-hidden border-primary shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 animate-pulse" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary overflow-hidden">
        <div className="h-full w-1/3 bg-white/30 animate-[shimmer_2s_infinite]" />
      </div>
      <CardContent className="relative py-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
                <div className="relative p-4 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg">
                  <Icon className={`w-8 h-8 text-primary-foreground ${isUpdate ? 'animate-bounce' : 'animate-spin'}`} />
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {title}
                  </h3>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-[ping_1s_ease-in-out_infinite]" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-[ping_1s_ease-in-out_0.2s_infinite]" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-[ping_1s_ease-in-out_0.4s_infinite]" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {status || defaultStatus}
                </p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-4xl font-bold bg-gradient-to-br from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {progress}%
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                <Activity className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progress} of 100</span>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-4 shadow-inner" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
            </div>
          </div>

          {progress > 75 && (
            <div className="flex items-center gap-2 text-sm text-primary animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">
                {isUpdate 
                  ? 'Almost done! Device will restart automatically...' 
                  : 'Almost done! Device will be back online soon...'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
