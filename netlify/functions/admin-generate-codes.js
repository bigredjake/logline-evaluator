const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { quantity, months, adminUserId } = JSON.parse(event.body);
    
    if (!quantity || !months || !adminUserId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
    // Initialize Supabase with SERVICE_KEY
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Verify admin status
    const { data: admin, error: adminError } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', adminUserId)
      .single();
      
    if (adminError || !admin || !admin.is_admin) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
      };
    }
    
    // Generate codes
    const codes = [];
    for (let i = 0; i < quantity; i++) {
      const code = 'STUDENT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      codes.push({
        code: code,
        code_type: 'time_based',
        months: months,
        credits: 0,
        created_by: adminUserId,
        used: false
      });
    }
    
    // Insert codes
    const { data, error } = await supabase
      .from('student_codes')
      .insert(codes)
      .select();
      
    if (error) {
      console.error('Error creating codes:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, codes: data })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
