const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const db = {
  async query(table, query) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .match(query);
    
    if (error) throw error;
    return data;
  },

  async insert(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select();
    
    if (error) throw error;
    return result[0];
  },

  async update(table, id, data) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return result[0];
  },

  async delete(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

module.exports = db; 