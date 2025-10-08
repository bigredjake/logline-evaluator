const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    // Create client with explicit fetch (Netlify Functions environment)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          fetch: fetch
        }
      }
    );

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, user_type')
      .limit(1);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: error.message,
          code: error.code
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Connection successful',
        rowCount: data ? data.length : 0
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      })
    };
  }
};
