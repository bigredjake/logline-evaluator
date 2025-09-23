const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_TEST);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  const { priceId, userEmail, userId, discount } = JSON.parse(event.body);

  try {
    // Create or retrieve Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId: userId }
      });
    }

    // Build checkout session parameters
    const sessionParams = {
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
     success_url: `https://subscription-system--logline-evaluator.netlify.app/?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `https://subscription-system--logline-evaluator.netlify.app/?subscription=cancelled`,
      metadata: {
        userId: userId,
      }
    };

    // Apply discount if provided
    if (discount > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: discount,
        duration: 'once',
        name: discount === 50 ? 'Beta Adopter' : 'Early Adopter'
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id })
    };
  } catch (error) {
    console.error('Subscription creation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
