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
          id: string
          user_id: string
          demo_balance: number
          real_balance: number
          daily_demo_limit: number
          daily_real_limit: number
          withdrawal_limit: number
          referral_bonus: number
          referral_count: number
          vip_level: number
          total_wins: number
          total_games: number
          win_streak: number
          max_win_streak: number
          last_daily_reward: string | null
          daily_reward_streak: number
          tournament_points: number
          seasonal_points: number
          total_seasonal_points: number
          last_season_reset: string | null
          is_suspicious: boolean
          last_security_check: string | null
          loyalty_points: number
          total_loyalty_points: number
          chat_level: number
          chat_points: number
          last_chat_reward: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          demo_balance?: number
          real_balance?: number
          daily_demo_limit?: number
          daily_real_limit?: number
          withdrawal_limit?: number
          referral_bonus?: number
          referral_count?: number
          vip_level?: number
          total_wins?: number
          total_games?: number
          win_streak?: number
          max_win_streak?: number
          last_daily_reward?: string | null
          daily_reward_streak?: number
          tournament_points?: number
          seasonal_points?: number
          total_seasonal_points?: number
          last_season_reset?: string | null
          is_suspicious?: boolean
          last_security_check?: string | null
          loyalty_points?: number
          total_loyalty_points?: number
          chat_level?: number
          chat_points?: number
          last_chat_reward?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          demo_balance?: number
          real_balance?: number
          daily_demo_limit?: number
          daily_real_limit?: number
          withdrawal_limit?: number
          referral_bonus?: number
          referral_count?: number
          vip_level?: number
          total_wins?: number
          total_games?: number
          win_streak?: number
          max_win_streak?: number
          last_daily_reward?: string | null
          daily_reward_streak?: number
          tournament_points?: number
          seasonal_points?: number
          total_seasonal_points?: number
          last_season_reset?: string | null
          is_suspicious?: boolean
          last_security_check?: string | null
          loyalty_points?: number
          total_loyalty_points?: number
          chat_level?: number
          chat_points?: number
          last_chat_reward?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      balance_transactions: {
        Row: {
          id: string
          user_id: string
          transaction_type: string
          amount: number
          balance_type: string
          room_id: string | null
          tournament_id: string | null
          event_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_type: string
          amount: number
          balance_type: string
          room_id?: string | null
          tournament_id?: string | null
          event_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_type?: string
          amount?: number
          balance_type?: string
          room_id?: string | null
          tournament_id?: string | null
          event_id?: string | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 