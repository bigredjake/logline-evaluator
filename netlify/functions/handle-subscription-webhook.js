const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_TEST);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST;

  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  // Initialize Supabase with service role key for RLS bypass
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const userId = session.metadata.userId;
        const subscriptionId = session.subscription;

        // Update user to subscriber type with subscription ID
        const { error } = await supabase
          .from('user_profiles')
          .update({
            user_type: 'subscriber',
            subscription_id: subscriptionId,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          console.error('Error updating user after checkout:', error);
          throw error;
        }

        console.log(`User ${userId} subscribed with subscription ${subscriptionId}`);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object;
        const subscriptionId = subscription.id;
        const status = subscription.status;

        // Update subscription status
        const { error } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription status:', error);
          throw error;
        }

        console.log(`Subscription ${subscriptionId} updated to status: ${status}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error.message 
      })
    };
  }
};
