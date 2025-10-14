const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { adminUserId } = JSON.parse(event.body);
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Verify admin
    const { data: admin } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', adminUserId)
      .single();
      
    if (!admin || !admin.is_admin) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    // Get all submissions with user email
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        user_profiles (email)
      `)
      .order('timestamp', { ascending: false });
      
    if (error) {
      console.error('Error fetching submissions:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, submissions: data })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
