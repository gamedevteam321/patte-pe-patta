import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Lobby from "./pages/Lobby";
import RoomCreate from "./pages/RoomCreate";
import GameRoom from "./pages/GameRoom";
import JoinByCode from "./pages/JoinByCode";
import { TransactionHistoryPage } from "./pages/TransactionHistoryPage";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { BalanceProvider } from "./context/BalanceContext";
import AuthGuard from "./components/AuthGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SocketProvider>
        <BalanceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/profile"
                  element={
                    <AuthGuard>
                      <Profile />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/lobby"
                  element={
                    <AuthGuard>
                      <Lobby />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/room/create"
                  element={
                    <AuthGuard>
                      <RoomCreate />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/room/:roomId"
                  element={
                    <AuthGuard>
                      <GameRoom />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/join/:code"
                  element={
                    <AuthGuard>
                      <JoinByCode />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <AuthGuard>
                      <TransactionHistoryPage />
                    </AuthGuard>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </BalanceProvider>
      </SocketProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
