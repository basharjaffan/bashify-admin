import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  // Navigera till dashboard om användaren redan är inloggad
  useEffect(() => {
    if (currentUser) {
      toast.success('Welcome back, Admin!');
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // signInWithRedirect redirectar användaren bort från sidan
      // så ingen kod efter detta kommer köras
      await loginWithGoogle();
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error('Sign in failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm bg-card/95 animate-scale-in relative z-10">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="mx-auto relative">
            <div className="absolute inset-0 bg-gradient-primary blur-2xl opacity-50" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <ShieldCheck className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Bashify Admin
            </CardTitle>
            <CardDescription className="text-base">
              Sign in to manage your music system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <Button 
            type="button" 
            className="w-full h-14 text-base font-semibold shadow-button hover:shadow-button-hover" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 py-1 text-muted-foreground font-medium rounded-full">
                Administrators Only
              </span>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
