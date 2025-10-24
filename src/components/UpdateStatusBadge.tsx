import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Device } from '@/types';

interface UpdateStatusBadgeProps {
  device: Device;
  variant?: 'compact' | 'detailed';
}

export function UpdateStatusBadge({ device, variant = 'compact' }: UpdateStatusBadgeProps) {
  const progress = device.updateProgress || 0;
  const status = device.updateStatus || '';
  const isUpdating = progress > 0 && progress < 100;
  const isComplete = progress === 100;

  if (!isUpdating && !isComplete && !status) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Badge 
        className={`
          ${isUpdating ? 'bg-primary/20 text-primary border-primary/50' : ''}
          ${isComplete ? 'bg-success/20 text-success border-success/50' : ''}
          flex items-center gap-2 px-3 py-1
        `}
        variant="outline"
      >
        {isUpdating && <Download className="h-3 w-3 animate-pulse" />}
        {isComplete && <CheckCircle2 className="h-3 w-3" />}
        <span className="font-semibold">{progress}%</span>
      </Badge>
    );
  }

  return (
    <Card className="shadow-card border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5">
      <CardContent className="py-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/20 rounded-full">
                {isUpdating && <Download className="w-4 h-4 text-primary animate-pulse" />}
                {isComplete && <CheckCircle2 className="w-4 h-4 text-success" />}
                {!isUpdating && !isComplete && <AlertCircle className="w-4 h-4 text-warning" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary">
                  {isComplete ? 'Uppdatering klar' : 'Uppdaterar...'}
                </h4>
                <p className="text-xs text-muted-foreground">{status || 'Väntar på enhetsrespons...'}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{progress}%</div>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
