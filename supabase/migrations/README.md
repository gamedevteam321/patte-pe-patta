# Database Migrations

This directory contains all database migrations for the Patte Pe Patta game.

## Migration Structure

Migrations are organized by date in the format `YYYYMMDDHHMMSS_description.sql`.

### Core Migrations

These migrations establish the core schema and functionality:

- `20240320000000_create_game_tables.sql` - Initial game tables
- `20240321000000_add_room_details.sql` - Room details
- `20240322000000_add_player_readiness.sql` - Player readiness
- `20240323000000_fix_player_readiness.sql` - Player readiness fixes
- `20240324000000_add_waiting_time_options.sql` - Waiting time options
- `20240325000000_setup_game_tables.sql` - Setup game tables (placeholder)
- `20240326000000_add_room_columns.sql` - Additional room columns
- `20240327000000_add_room_passkey.sql` - Room password protection
- `20240328000000_create_room_history.sql` - Room history tracking
- `20240329000000_add_user_balance.sql` - User balance system

### Balance and Transaction Fixes

These migrations fix issues with the balance and transaction system:

- `20240330000000_fix_update_user_balance.sql` - User balance updates
- `20240330000001_add_process_room_entry.sql` - Room entry processing
- `20240330000007_fix_game_result_processing.sql` - Game result processing
- `20240330000008_fix_balance_transaction_sequence.sql` - Transaction sequence
- `20240330000009_fix_transaction_notification.sql` - Transaction notifications
- `20240330000010_fix_vip_level_up.sql` - VIP level functionality fixes
- `20240330000012_remove_vip_level.sql` - Remove VIP level dependencies
- `20240330000013_fix_credit_winner.sql` - Fix credit winner functionality (Note: Similar to 20240331000002)
- `20240331000002_fix_process_game_result.sql` - Fix process game result without VIP dependencies (Note: Reinforces 20240330000013)

## Adding New Migrations

When adding new migrations:

1. Use the next sequential timestamp (YYYYMMDDHHMMSS)
2. Name the file clearly to describe its purpose
3. Include a descriptive comment at the top of the file
4. Test thoroughly before applying to production

## Deployment

Migrations are applied automatically during deployment using:

```
supabase db push
```

## Notes on Migration Cleaning

- The migration `20240325000000_setup_game_tables.sql` is empty but kept as a placeholder since it's already applied to the database
- Duplicate migrations have been noted above but kept since they are already applied to the database 