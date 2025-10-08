const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // First, just check environment variables
  const hasUrl = !!process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_KEY;
  
  if (!hasUrl || !hasKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        message: 'Missing env vars',
        hasUrl,
        hasKey
      })
    };
  }

  // Return the first 20 chars of each to verify they're not empty
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      success: true,
      urlPreview: process.env.SUPABASE_URL.substring(0, 20),
      keyPreview: process.env.SUPABASE_SERVICE_KEY.substring(0, 20)
    })
  };
};
