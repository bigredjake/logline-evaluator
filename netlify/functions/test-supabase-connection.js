const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    // Check if environment variables exist
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing environment variables',
          hasUrl: !!process.env.SUPABASE_URL,
          hasKey: !!process.env.SUPABASE_SERVICE_KEY
        })
      };
    }

    // Initialize Supabase client with service key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Try to read one user
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, user_type')
      .limit(1)
      .single();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: error.message 
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Connection successful',
        user: data
      })
    };
} catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack
      })
    };
  }
 
};
