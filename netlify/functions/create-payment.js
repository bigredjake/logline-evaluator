const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, price, userEmail, userId, isBeta } = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${amount} Logline Evaluations${isBeta ? ' (Beta Discount)' : ''}`,
              description: `Credits for BRS Labs Logline Evaluator`,
            },
            unit_amount: price * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&amount=${amount}&user_id=${userId}`,
      cancel_url: `${process.env.URL}`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        creditAmount: amount.toString(),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id }),
    };
  } catch (error) {
    console.error('Error creating payment session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create payment session' }),
    };
  }
};// JavaScript Document