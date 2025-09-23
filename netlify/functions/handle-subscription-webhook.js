const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_TEST);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

exports.handler = async (event, context) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { 
      statusCode: 400, 
      body: `Webhook Error: ${err.message}` 
    };
  }

 try {
    console.log('Webhook event received:', stripeEvent.type);
    
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        const session = stripeEvent.data.object;
        console.log('Session metadata userId:', session.metadata?.userId);
        
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        console.log('Subscription retrieved:', subscription.id);
        
        const expiryDate = new Date(subscription.current_period_end * 1000);
        console.log('Expiry date calculated:', expiryDate.toISOString());
        
        // Verify user exists first
const { data: existingUser, error: fetchError } = await supabase
  .from('user_profiles')
  .select('id, email')
  .eq('id', session.metadata.userId)
  .single();

console.log('User lookup result:', existingUser, fetchError);

if (fetchError || !existingUser) {
  throw new Error(`User not found: ${session.metadata.userId}, Error: ${JSON.stringify(fetchError)}`);
}

const { data, error } = await supabase
  .from('user_profiles')
  .update({
    user_type: 'subscriber',
    subscription_id: subscription.id,
    subscription_status: 'active',
    access_expiry: expiryDate.toISOString(),
    last_payment_date: new Date().toISOString()
  })
  .eq('id', session.metadata.userId)
  .select();

console.log('Update result - Data:', data);
console.log('Update result - Error:', error);

if (error) {
  throw new Error(`Supabase update failed: ${JSON.stringify(error)}`);
}

if (!data || data.length === 0) {
  throw new Error('No rows were updated - user ID may not exist');
}
        
        break;

      case 'invoice.payment_succeeded':
        const invoice = stripeEvent.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          
          await supabase
            .from('user_profiles')
            .update({
              access_expiry: new Date(sub.current_period_end * 1000).toISOString(),
              subscription_status: 'active',
              last_payment_date: new Date().toISOString()
            })
            .eq('subscription_id', invoice.subscription);
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSub = stripeEvent.data.object;
        
        await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'cancelled',
            subscription_id: null
          })
          .eq('subscription_id', deletedSub.id);
        
        break;

      case 'invoice.payment_failed':
        const failedInvoice = stripeEvent.data.object;
        
        if (failedInvoice.subscription) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'past_due'
            })
            .eq('subscription_id', failedInvoice.subscription);
        }
        break;
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ received: true }) 
    };
  } catch (error) {
    console.error('Webhook processing error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
