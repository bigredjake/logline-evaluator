exports.handler = async (event, context) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Try direct REST API call instead of using the client library
    const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=id,email,user_type&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        statusCode: response.status,
        responsePreview: responseText.substring(0, 200)
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
