const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { adminUserId, action, targetEmail, updateData } = JSON.parse(event.body);
    
    if (!adminUserId || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
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
    
    // Find target user
    const { data: targetUser, error: findError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', targetEmail)
      .single();
      
    if (findError || !targetUser) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }
    
    // Prevent modifying admin users
    if (targetUser.is_admin) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Cannot modify admin users' })
      };
    }
    
    // Perform action
    let result;
    switch (action) {
      case 'search':
        result = { user: targetUser };
        break;
        
      case 'setTime': {
        const months = updateData.months || 0;
        if (months === 0) {
          // Convert to subscriber requiring purchase
          result = await supabase
            .from('user_profiles')
            .update({
              user_type: 'subscriber',
              subscription_status: 'expired',
              access_expiry: null
            })
            .eq('id', targetUser.id)
            .select()
            .single();
        } else {
          // Set as student with expiry
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + months);
          result = await supabase
            .from('user_profiles')
            .update({
              user_type: 'student',
              access_expiry: expiry.toISOString()
            })
            .eq('id', targetUser.id)
            .select()
            .single();
        }
        break;
      }
        
      case 'suspend':
        result = await supabase
          .from('user_profiles')
          .update({ status: 'suspended' })
          .eq('id', targetUser.id)
          .select()
          .single();
        break;
        
      case 'unsuspend':
        result = await supabase
          .from('user_profiles')
          .update({ status: 'active' })
          .eq('id', targetUser.id)
          .select()
          .single();
        break;
        
      case 'delete':
        result = await supabase
          .from('user_profiles')
          .update({ status: 'deleted' })
          .eq('id', targetUser.id)
          .select()
          .single();
        break;
        
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }
    
    if (result.error) {
      console.error('Action error:', result.error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: result.error.message })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        data: result.data || result.user 
      })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
