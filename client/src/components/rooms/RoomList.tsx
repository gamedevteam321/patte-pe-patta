import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
import { Lock, Users, Coins, RefreshCw, List, Grid, Globe, Home, Clock, Key, Plus } from "lucide-react";
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import JoinRoomDialog from './JoinRoomDialog';
import { toast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { RoomData } from '@/context/SocketContext';

interface RoomListProps {
  initialFilter?: 'all' | 'public' | 'private' | 'my';
  filterByCode?: string;
  showFilters?: boolean;
  roomType?: string | null;
}

const RoomList: React.FC<RoomListProps> = ({ 
  initialFilter = 'all',
  filterByCode,
  showFilters = true,
  roomType: propRoomType
}) => {
  const { availableRooms, fetchRooms, joinRoom, socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isJoinByCodeDialogOpen, setIsJoinByCodeDialogOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [password, setPassword] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'my'>(initialFilter);
  const [currentGameType, setCurrentGameType] = useState<string | null>(null);

  // Get game type from URL and store it
  useEffect(() => {
    const gameType = searchParams.get('game');
    if (gameType) {
      console.log('Setting game type from URL:', gameType);
      setCurrentGameType(gameType);
    }
  }, [searchParams]);

  // Get room type from navigation state or props
  const effectiveRoomType = currentGameType || propRoomType || (location.state as { roomType?: string })?.roomType || null;

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

  // Add listener for room creation
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = () => {
      console.log('Room created event received in RoomList');
      fetchRooms();
    };

    socket.on('room:created', handleRoomCreated);

    return () => {
      socket.off('room:created', handleRoomCreated);
    };
  }, [socket, fetchRooms]);

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

  const handleJoinClick = (room: RoomData) => {
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
      navigate(`/room/${roomId}`, { state: { gameType: currentGameType } });
    }
  };

  const handleJoinByCode = async () => {
    if (!roomCode) {
      toast({
        title: "Error",
        description: "Please enter a room code",
        variant: "destructive"
      });
      return;
    }

    try {
      const success = await joinRoom(roomCode, password);
      if (success) {
        setIsJoinByCodeDialogOpen(false);
        setRoomCode('');
        setPassword('');
        navigate(`/room/${roomCode}`, { state: { gameType: currentGameType } });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateRoom = () => {
    navigate(`/room/create${currentGameType ? `?game=${currentGameType}` : ''}`);
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

  // Filter rooms based on game type
  const filteredRooms = React.useMemo(() => {
    let rooms = availableRooms;
    
    // Filter by game type if specified
    if (effectiveRoomType) {
      console.log('Filtering rooms by game type:', effectiveRoomType);
      rooms = rooms.filter(room => room.roomType === effectiveRoomType);
    }
    
    // Apply other filters
    switch (filter) {
      case 'public':
        rooms = rooms.filter(room => !room.isPrivate);
        break;
      case 'private':
        rooms = rooms.filter(room => room.isPrivate);
        break;
      case 'my':
        rooms = rooms.filter(room => room.hostName === user?.username);
        break;
    }
    
    return rooms;
  }, [availableRooms, effectiveRoomType, filter, user?.username]);

  const calculatePoolMoney = (room: RoomData) => {
    const betAmount = room.betAmount || 0;
    const joinedPlayers = room.playerCount || 0;
    return betAmount * joinedPlayers;
  };

  const renderRoomCard = (room: RoomData) => {
    const poolMoney = calculatePoolMoney(room);
    const isFull = room.playerCount >= room.maxPlayers;
    const isHost = user?.username === room.hostName;
    const isNewRoom = Date.now() - new Date(room.createdAt || '').getTime() < 60000; // Room is new if created within last minute
    const config = room.config || {
      turnTime: 30000, // Default 30 seconds
      gameDuration: 300000, // Default 5 minutes
      maxPlayers: 4,
      minBet: 0,
      maxBet: 1000,
      shufflesAllowed: 3,
      description: 'Casual game room',
      cardDistribution: {}
    };

    return (
      <Card key={room.id} className={`glass-panel ${isNewRoom ? 'border-2 border-game-cyan' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="truncate">{room.name}</span>
            <div className="flex items-center gap-2">
              {room.isPrivate && <Lock className="h-4 w-4 text-gray-400" />}
              {isNewRoom && <Badge variant="secondary" className="bg-game-cyan">New</Badge>}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{room.playerCount}/{room.maxPlayers} Players</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span>Bet: {room.betAmount || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Turn Time: {config.turnTime / 1000}s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {config.description}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {room.roomType?.charAt(0).toUpperCase() + (room.roomType?.slice(1) || '')}
            </Badge>
            <span className="text-sm text-gray-400">
              {formatDistanceToNow(new Date(room.createdAt || ''), { addSuffix: true })}
            </span>
          </div>
          <Button
            onClick={() => handleJoinClick(room)}
            disabled={isFull && !isHost}
            className="bg-game-cyan hover:bg-game-cyan/80"
          >
            {isFull ? 'Full' : 'Join'}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-cyan"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-2xl font-bold">Available Rooms</h2>
          <div className="flex items-center gap-4 text-white">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'list' | 'grid')}
              className="[&>button[data-state=on]]:bg-game-blue [&>button[data-state=on]]:text-white [&>button[data-state=on]>span>svg]:text-white"
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
        {showFilters && (
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={filter}
              onValueChange={(value) => setFilter(value as 'all' | 'public' | 'private' | 'my')}
              className="flex-wrap [&>button[data-state=on]]:bg-game-blue [&>button[data-state=on]]:text-white [&>button[data-state=on]>span>svg]:text-white"
            >
              <ToggleGroupItem value="all" aria-label="All rooms">
                <span className="text-white flex items-center gap-2">
                  <List className="h-4 w-4" />
                  All
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem value="public" aria-label="Public rooms">
                <span className="text-white flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Public
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem value="private" aria-label="Private rooms">
                <span className="text-white flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Private
                </span>
              </ToggleGroupItem>
              {user && (
                <ToggleGroupItem value="my" aria-label="My rooms">
                  <span className="text-white flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    My Rooms
                  </span>
                </ToggleGroupItem>
              )}
            </ToggleGroup>
          </div>
        )}
      </div>

      {filteredRooms.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No rooms available</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredRooms.map((room) => renderRoomCard(room))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => renderRoomCard(room))}
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

      {/* Join by Code Dialog */}
      <Dialog open={isJoinByCodeDialogOpen} onOpenChange={setIsJoinByCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Room by Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Enter room password (if private)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={handleJoinByCode}
            >
              Join Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomList;
