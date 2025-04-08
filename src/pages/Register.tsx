
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { UserPlus } from "lucide-react";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure both passwords match.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      await register(username, email, password);
      toast({
        title: "Registration successful",
        description: "Welcome to Satta Kings Arena! You've received 1000 free coins.",
        variant: "default",
      });
      navigate("/lobby");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout showNav={false}>
      <div className="container max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-game-cyan text-glow">Satta Kings Arena</h1>
          <p className="text-gray-400">Create a new account</p>
        </div>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-game-magenta">Register</CardTitle>
            <CardDescription>Create an account and get 1000 free coins</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="username" className="text-sm">Username</label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="coolplayer123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-black/50 border-white/20"
                  />
                </div>
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
                <div className="grid gap-2">
                  <label htmlFor="confirm-password" className="text-sm">Confirm Password</label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-black/50 border-white/20"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-game-magenta text-black hover:bg-game-magenta/80"
                >
                  {isLoading ? "Creating account..." : "Register"}
                  <UserPlus className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-400 text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-game-cyan hover:underline">
                Login
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

export default Register;
