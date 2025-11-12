const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { code, userId } = JSON.parse(event.body);
    
    if (!code || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing code or userId' })
      };
    }
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Validate code
    const { data: studentCode, error: codeError } = await supabase
      .from('student_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('used', false)
      .single();
      
    if (codeError || !studentCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid or already used student code' 
        })
      };
    }
    
    // Calculate expiry date
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + studentCode.months);
    
    // Apply code to user
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        user_type: 'student',
        access_expiry: expiry.toISOString()
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Error applying code:', updateError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false,
          error: 'Failed to apply code to account' 
        })
      };
    }
    
    // Mark code as used
    await supabase
      .from('student_codes')
      .update({
        used: true,
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('code', code.trim().toUpperCase());
      
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: `${studentCode.months} months of unlimited access added!`,
        expiryDate: expiry.toISOString()
      })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
};
