const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { priceId, userEmail, userId } = JSON.parse(event.body);

    if (!priceId || !userEmail || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      metadata: {
        userId: userId,
      },
     success_url: `${process.env.BRANCH_URL || process.env.URL}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BRANCH_URL || process.env.URL}?subscription=cancelled`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id })
    };

  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to create subscription session',
        details: error.message 
      })
    };
  }
};
