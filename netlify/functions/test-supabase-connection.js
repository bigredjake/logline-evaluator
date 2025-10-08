const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Pick the first user from the previous test
    const testUserId = 'd98337e4-e3c4-409c-83c6-123c931d1585';

    // Read current value
    const { data: beforeData, error: readError } = await supabase
      .from('user_profiles')
      .select('credits, updated_at')
      .eq('id', testUserId)
      .single();

    if (readError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          step: 'read',
          error: readError.message
        })
      };
    }

    // Try to update updated_at timestamp (this won't break anything)
    const { data: afterData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', testUserId)
      .select('credits, updated_at')
      .single();

    if (updateError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          step: 'write',
          error: updateError.message,
          code: updateError.code
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Successfully wrote to user_profiles',
        before: beforeData,
        after: afterData
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message
      })
    };
  }
};
