import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Välkommen tillbaka, Admin!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google login error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Inloggning avbruten');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domän ej auktoriserad i Firebase Console');
      } else {
        toast.error('Inloggning misslyckades');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-purple-500/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Bashify Admin</CardTitle>
            <CardDescription>Logga in för att hantera systemet</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            type="button" 
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loggar in...
              </>
            ) : (
              'Logga in med Google'
            )}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Endast för administratörer
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
