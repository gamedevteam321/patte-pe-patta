-- Insert some test game rooms
insert into public.game_rooms (id, name, host_id, host_name, max_players, bet_amount, is_private, status)
values 
  ('test-room-1', 'Public Room 1', 'test-host-1', 'Test Host 1', 4, 100, false, 'waiting'),
  ('test-room-2', 'Private Room 1', 'test-host-2', 'Test Host 2', 2, 500, true, 'waiting');

-- Insert some test players
insert into public.game_players (id, room_id, user_id, username, is_host)
values
  ('test-player-1', 'test-room-1', 'test-host-1', 'Test Host 1', true),
  ('test-player-2', 'test-room-1', 'test-user-1', 'Test User 1', false),
  ('test-player-3', 'test-room-2', 'test-host-2', 'Test Host 2', true); 