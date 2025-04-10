
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { LogIn } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Login successful",
        description: "Welcome back to Patte pe Patta!",
        variant: "default",
      });
      navigate("/lobby");
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout showNav={false}>
      <div className="container max-w-md mx-auto px-4 py-8 md:py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-game-cyan text-glow">Patte pe Patta</h1>
          <p className="text-gray-400">Login to your account</p>
        </div>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-game-cyan">Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm">Email</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-black/50 border-white/20"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm">Password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-black/50 border-white/20"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-game-cyan text-white hover:bg-game-cyan/80"
                >
                  {isLoading ? "Logging in..." : "Login"}
                  <LogIn className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-400 text-center">
              Don't have an account?{" "}
              <Link to="/register" className="text-game-magenta hover:underline">
                Register
              </Link>
            </div>
            <div className="text-sm text-gray-400 text-center">
              <Link to="/" className="text-game-cyan hover:underline">
                Back to Home
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default Login;
