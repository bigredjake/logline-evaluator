const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_TEST);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  const { subscriptionId, userId } = JSON.parse(event.body);

  try {
    // Cancel the subscription at period end (user keeps access until then)
    const canceledSubscription = await stripe.subscriptions.update(
      subscriptionId,
      { cancel_at_period_end: true }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Subscription will cancel at period end',
        periodEnd: canceledSubscription.current_period_end
      })
    };
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
