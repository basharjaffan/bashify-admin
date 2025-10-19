import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const GroupDetails = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gruppdetaljer</h1>
      <Card>
        <CardHeader>
          <CardTitle>Grupp {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Detaljerad vy kommer snart...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupDetails;
