import { supabase } from '../utils/supabase';
import { Database } from '../types/supabase';

type TableName = keyof Database['public']['Tables'];
type QueryFilter = Record<string, any>;

class DatabaseHelper {
  async query(table: TableName, query: QueryFilter) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .match(query);
    
    if (error) throw error;
    return data;
  }

  async insert<T extends TableName>(
    table: T,
    data: Database['public']['Tables'][T]['Insert']
  ) {
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select();
    
    if (error) throw error;
    return result[0];
  }

  async update<T extends TableName>(
    table: T,
    id: string,
    data: Partial<Database['public']['Tables'][T]['Update']>
  ) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return result[0];
  }

  async delete(table: TableName, id: string): Promise<boolean> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
}

export const db = new DatabaseHelper(); 