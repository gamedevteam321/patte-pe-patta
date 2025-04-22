export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_balance: {
        Row: {
          user_id: string
          balance: number
          demo_balance: number
          created_at: string
          updated_at: string
          seasonal_points: number
          total_seasonal_points: number
          last_season_reset: string | null
          is_suspicious: boolean
          last_security_check: string | null
        }
        Insert: {
          user_id: string
          balance?: number
          demo_balance?: number
          created_at?: string
          updated_at?: string
          seasonal_points?: number
          total_seasonal_points?: number
          last_season_reset?: string | null
          is_suspicious?: boolean
          last_security_check?: string | null
        }
        Update: {
          user_id?: string
          balance?: number
          demo_balance?: number
          created_at?: string
          updated_at?: string
          seasonal_points?: number
          total_seasonal_points?: number
          last_season_reset?: string | null
          is_suspicious?: boolean
          last_security_check?: string | null
        }
      }
      balance_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance_type: string
          transaction_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          balance_type: string
          transaction_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          balance_type?: string
          transaction_type?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      balance_history: {
        Row: {
          id: string
          user_id: string
          balance_type: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance_type: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance_type?: string
          amount?: number
          created_at?: string
        }
      }
      transaction_notifications: {
        Row: {
          id: string
          user_id: string
          transaction_id: string
          notification_type: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_id: string
          notification_type: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_id?: string
          notification_type?: string
          is_read?: boolean
          created_at?: string
        }
      }
      loyalty_rewards: {
        Row: {
          id: string
          name: string
          description: string | null
          points_required: number
          reward_type: string
          reward_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          points_required: number
          reward_type: string
          reward_amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          points_required?: number
          reward_type?: string
          reward_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_loyalty_rewards: {
        Row: {
          id: string
          user_id: string
          loyalty_reward_id: string
          is_claimed: boolean
          claimed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          loyalty_reward_id: string
          is_claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          loyalty_reward_id?: string
          is_claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_rewards: {
        Row: {
          id: string
          name: string
          description: string | null
          messages_required: number
          reward_type: string
          reward_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          messages_required: number
          reward_type: string
          reward_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          messages_required?: number
          reward_type?: string
          reward_amount?: number
          created_at?: string
        }
      }
      user_chat_rewards: {
        Row: {
          id: string
          user_id: string
          chat_reward_id: string
          is_claimed: boolean
          claimed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          chat_reward_id: string
          is_claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          chat_reward_id?: string
          is_claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          name: string
          description: string | null
          start_time: string
          end_time: string
          entry_fee: number
          prize_pool: number
          max_players: number
          min_vip_level: number
          is_demo_mode: boolean
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_time: string
          end_time: string
          entry_fee: number
          prize_pool: number
          max_players: number
          min_vip_level: number
          is_demo_mode: boolean
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_time?: string
          end_time?: string
          entry_fee?: number
          prize_pool?: number
          max_players?: number
          min_vip_level?: number
          is_demo_mode?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      tournament_participants: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          points: number
          rank: number | null
          prize: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          points?: number
          rank?: number | null
          prize?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          points?: number
          rank?: number | null
          prize?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      special_events: {
        Row: {
          id: string
          name: string
          description: string | null
          start_time: string
          end_time: string
          bonus_multiplier: number
          min_vip_level: number
          is_demo_mode: boolean
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_time: string
          end_time: string
          bonus_multiplier: number
          min_vip_level: number
          is_demo_mode: boolean
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_time?: string
          end_time?: string
          bonus_multiplier?: number
          min_vip_level?: number
          is_demo_mode?: boolean
          status?: string
          created_at?: string
        }
      }
      daily_rewards: {
        Row: {
          day: number
          demo_coins: number
          real_coins: number
          created_at: string
        }
        Insert: {
          day: number
          demo_coins: number
          real_coins: number
          created_at?: string
        }
        Update: {
          day?: number
          demo_coins?: number
          real_coins?: number
          created_at?: string
        }
      }
      achievements: {
        Row: {
          id: string
          name: string
          description: string
          icon_url: string | null
          points: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon_url?: string | null
          points: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon_url?: string | null
          points?: number
          created_at?: string
        }
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          progress: number
          is_completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          progress?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          progress?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vip_levels: {
        Row: {
          level: number
          name: string
          min_games: number
          min_wins: number
          win_rate: number
          bonus_multiplier: number
          daily_bonus: number
          created_at: string
        }
        Insert: {
          level: number
          name: string
          min_games: number
          min_wins: number
          win_rate: number
          bonus_multiplier: number
          daily_bonus: number
          created_at?: string
        }
        Update: {
          level?: number
          name?: string
          min_games?: number
          min_wins?: number
          win_rate?: number
          bonus_multiplier?: number
          daily_bonus?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_user_balance: {
        Args: {
          p_user_id: string
          p_amount: number
          p_balance_type: string
          p_transaction_type: string
          p_metadata: Json
        }
        Returns: number
      }
      claim_daily_reward: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      process_loyalty_points: {
        Args: {
          p_user_id: string
          p_event_type: string
          p_event_data: Json
        }
        Returns: number
      }
      process_chat_rewards: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
      join_tournament: {
        Args: {
          p_user_id: string
          p_tournament_id: string
        }
        Returns: number
      }
      process_game_result: {
        Args: {
          p_user_id: string
          p_is_winner: boolean
          p_amount: number
          p_balance_type: string
        }
        Returns: number
      }
      process_referral_bonus: {
        Args: {
          p_referrer_id: string
          p_referred_id: string
        }
        Returns: number
      }
      can_join_room: {
        Args: {
          p_user_id: string
          p_room_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 