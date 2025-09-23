const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_TEST);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
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
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        const session = stripeEvent.data.object;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        const expiryDate = new Date(subscription.current_period_end * 1000);
        
        await supabase
          .from('user_profiles')
          .update({
            user_type: 'subscriber',
            subscription_id: subscription.id,
            subscription_status: 'active',
            access_expiry: expiryDate.toISOString(),
            last_payment_date: new Date().toISOString()
          })
          .eq('id', session.metadata.userId);
        
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
