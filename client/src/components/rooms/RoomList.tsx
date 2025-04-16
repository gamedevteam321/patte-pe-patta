import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, Coins, RefreshCw, List, Grid, Globe, Home } from "lucide-react";
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import JoinRoomDialog from './JoinRoomDialog';
import { toast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { formatDistanceToNow } from 'date-fns';

interface RoomItem {
  id: string;
  name: string;
  status: string;
  betAmount: number;
  maxPlayers: number;
  playerCount: number;
  hostName: string;
  isPrivate: boolean;
  createdAt: string;
  players?: Array<{
    id: string;
    username: string;
    isReady: boolean;
  }>;
}

const RoomList: React.FC = () => {
  const { availableRooms, fetchRooms, joinRoom } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'my'>('all');

  useEffect(() => {
    const loadRooms = async () => {
      try {
        setIsLoading(true);
        await fetchRooms();
      } catch (error) {
        console.error('Error loading rooms:', error);
        toast({
          title: "Error",
          description: "Failed to load rooms. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadRooms();
  }, [fetchRooms]);

  // Add debug logging for room data
  useEffect(() => {
    if (availableRooms) {
      console.log('Available Rooms:', availableRooms);
    }
  }, [availableRooms]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRooms();
    } catch (error) {
      console.error('Error refreshing rooms:', error);
      toast({
        title: "Error",
        description: "Failed to refresh rooms. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleJoinClick = (room: RoomItem) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to join a room",
        variant: "destructive"
      });
      return;
    }
    
    if (room.isPrivate) {
      setSelectedRoom(room);
      setIsDialogOpen(true);
    } else {
      handleJoinRoom(room.id, room.betAmount > 0 ? room.betAmount.toString() : undefined);
    }
  };

  const handleJoinRoom = async (roomId: string, password?: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to join a room",
        variant: "destructive"
      });
      return;
    }
    
    const success = await joinRoom(roomId, password);
    if (success) {
      navigate(`/room/${roomId}`);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Check if dateString is valid
      if (!dateString) {
        return 'Just now';
      }

      // Try to parse the date
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Just now';
      }

      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Just now';
    }
  };

  // Cast availableRooms to the proper interface and ensure number values
  const rooms = (availableRooms as unknown as RoomItem[]).map(room => ({
    ...room,
    playerCount: Number(room.playerCount) || 0,
    maxPlayers: Number(room.maxPlayers) || 2
  }));

  // Filter rooms based on selected filter
  const filteredRooms = rooms.filter(room => {
    switch (filter) {
      case 'public':
        return !room.isPrivate;
      case 'private':
        return room.isPrivate;
      case 'my':
        return user && room.hostName === user.username;
      default:
        return true;
    }
  });

  const calculatePoolMoney = (room: RoomItem) => {
    const betAmount = Number(room.betAmount) || 0;
    const joinedPlayers = Number(room.playerCount) || 0;
    return betAmount * joinedPlayers;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Available Rooms</h2>
          <div className="flex items-center gap-4">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'list' | 'grid')}
            >
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Room Filters */}
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(value) => setFilter(value as 'all' | 'public' | 'private' | 'my')}
            className="flex-wrap"
          >
            <ToggleGroupItem value="all" aria-label="All rooms">
              <span className="flex items-center gap-2">
                <List className="h-4 w-4" />
                All
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem value="public" aria-label="Public rooms">
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem value="private" aria-label="Private rooms">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Private
              </span>
            </ToggleGroupItem>
            {user && (
              <ToggleGroupItem value="my" aria-label="My rooms">
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  My Rooms
                </span>
              </ToggleGroupItem>
            )}
          </ToggleGroup>
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {filter === 'all' ? 'No rooms available' :
             filter === 'public' ? 'No public rooms available' :
             filter === 'private' ? 'No private rooms available' :
             'No rooms created by you'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{room.name || "Game Room"}</CardTitle>
                    <CardDescription>
                      Hosted by {room.hostName || "Anonymous"} • {formatDate(room.createdAt)}
                    </CardDescription>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Players ({room.playerCount || 0}/{room.maxPlayers || 2})</span>
                    </div>
                    {room.players && room.players.length > 0 && (
                      <div className="text-sm text-muted-foreground pl-6">
                        {room.players.map((player, index) => (
                          <div key={player.id} className="flex items-center gap-2">
                            <span> {player.username}</span>
                            {player.isReady && (
                              <Badge variant="outline" className="text-xs">Ready</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">₹{room.betAmount || 0}</div>
                      <div className="text-sm text-muted-foreground">Bet Amount</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₹{calculatePoolMoney(room)}</div>
                      <div className="text-sm text-muted-foreground">Pool Amount</div>
                    </div>
                    <Button
                      onClick={() => handleJoinClick(room)}
                      disabled={room.playerCount >= room.maxPlayers}
                    >
                      {room.playerCount >= room.maxPlayers ? 'Full' : 'Join'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="hover:bg-accent/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg">{room.name || "Game Room"}</CardTitle>
                <CardDescription>
                  Hosted by {room.hostName || "Anonymous"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{formatDate(room.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bet Amount</span>
                  <span className="text-sm font-medium">₹{room.betAmount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pool Amount</span>
                  <span className="text-sm font-medium">₹{calculatePoolMoney(room)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Players ({room.playerCount || 0}/{room.maxPlayers || 2})
                  </span>
                </div>
                {room.players && room.players.length > 0 && (
                  <div className="space-y-1 mt-2 border-t pt-2">
                    {room.players.map((player, index) => (
                      <div key={player.id} className="flex items-center justify-between text-sm">
                        <span>{player.username}</span>
                        {player.isReady && (
                          <Badge variant="outline" className="text-xs">Ready</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleJoinClick(room)}
                  disabled={room.playerCount >= room.maxPlayers}
                >
                  {room.playerCount >= room.maxPlayers ? 'Full' : 'Join'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedRoom && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Private Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Enter room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                className="w-full"
                onClick={() => {
                  if (selectedRoom) {
                    handleJoinRoom(selectedRoom.id, password);
                    setIsDialogOpen(false);
                    setPassword('');
                  }
                }}
              >
                Join Room
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RoomList;
