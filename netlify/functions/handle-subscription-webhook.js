const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_TEST);
const { createClient } = require('@supabase/supabase-js');

// Email helper function using fetch (REST API)
async function sendSubscriptionEmail(toEmail, emailType, data = {}) {
  const emailContent = {
    welcome: {
      subject: 'Your Subscription is Active!',
      message: `Hi ${data.userName || toEmail.split('@')[0]},

Your subscription to the BRS Labs Logline Evaluator is now active!

🎉 You now have unlimited access to professional logline evaluations while your subscription is active!

🔖 BOOKMARK THIS LINK: ${data.siteUrl || 'https://logline-evaluator.netlify.app'}

Ready to get started?
1. Click the link above to access the evaluator
2. Fill out the logline form with your story details
3. Get instant professional feedback on your logline
4. Use the suggestions to refine and improve

Your subscription includes:
- Unlimited logline evaluations
- Professional-quality feedback
- Alternative logline suggestions
- Title recommendations

Need help? Contact us at support@bigredstripe.com

Happy writing!
The BRS Labs Team`
    }
  };

  const content = emailContent[emailType];
  if (!content) {
    console.error(`Unknown email type: ${emailType}`);
    return;
  }

  const templateParams = {
    to_email: toEmail,
    user_name: toEmail.split('@')[0],
    subject: content.subject,
    message: content.message,
    timestamp: Date.now()
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'service_z3nppt7',
        template_id: 'template_8xpn9tn',
        user_id: '7cimGrBdlHCn4gSDy',
        template_params: templateParams
      })
    });

    if (response.ok) {
      console.log(`${emailType} email sent successfully to ${toEmail}`);
    } else {
      console.error(`Failed to send ${emailType} email:`, response.status);
    }
  } catch (error) {
    console.error(`Failed to send ${emailType} email:`, error);
  }
}

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
        const stripeCustomerId = session.customer;
        const customerEmail = session.customer_email || session.customer_details?.email;
        
        // Update user to subscriber type with subscription ID and customer ID
        const { error } = await supabase
          .from('user_profiles')
          .update({
            user_type: 'subscriber',
            subscription_id: subscriptionId,
            stripe_customer_id: stripeCustomerId,
            subscription_status: 'active',
            last_payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (error) {
          console.error('Error updating user after checkout:', error);
          throw error;
        }
        
        console.log(`User ${userId} subscribed with subscription ${subscriptionId}`);
        
        // Send welcome email
        if (customerEmail) {
          await sendSubscriptionEmail(customerEmail, 'welcome', {
            userName: customerEmail.split('@')[0],
            siteUrl: process.env.URL || 'https://logline-evaluator.netlify.app'
          });
        }
        
        break;
      }

   case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        
        // Check if subscription is set to cancel at period end
        let updateData = {
          subscription_status: status,
          updated_at: new Date().toISOString()
        };
        
        if (subscription.cancel_at_period_end) {
          // User canceled but still has access until period end
          const periodEnd = new Date(subscription.current_period_end * 1000);
          updateData.access_expiry = periodEnd.toISOString();
          console.log(`Subscription ${subscriptionId} will cancel on ${periodEnd.toISOString()}`);
        } else if (subscription.status === 'active') {
          // Subscription is active and not canceling - clear access_expiry
          updateData.access_expiry = null;
        }
        
        const { error } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('subscription_id', subscriptionId);
        
        if (error) {
          console.error('Error updating subscription:', error);
          throw error;
        }
        
        console.log(`Subscription ${subscriptionId} updated to status: ${status}`);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object;
        const subscriptionId = subscription.id;
        
        // Subscription has actually ended - set status to canceled
        const { error } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('subscription_id', subscriptionId);
        
        if (error) {
          console.error('Error updating canceled subscription:', error);
          throw error;
        }
        
        console.log(`Subscription ${subscriptionId} canceled and ended`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object;
        const subscriptionId = invoice.subscription;

        // Update user status to past_due when payment fails
        const { error } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating user after payment failure:', error);
          throw error;
        }

        console.log(`Payment failed for subscription ${subscriptionId} - status set to past_due`);
        break;
      }

        case 'invoice.paid': {
        const invoice = stripeEvent.data.object;
        const subscriptionId = invoice.subscription;
        
        // Only process subscription invoices (not one-time payments)
        if (!subscriptionId) {
          console.log('Invoice paid but not for a subscription, skipping');
          break;
        }
        
        // Update last_payment_date when subscription renews successfully
        const { error } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'active',
            last_payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('subscription_id', subscriptionId);
        
        if (error) {
          console.error('Error updating user after successful renewal:', error);
          throw error;
        }
        
        console.log(`Subscription ${subscriptionId} renewed successfully - last_payment_date updated`);
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
