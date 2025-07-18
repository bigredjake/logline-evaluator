const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { sessionId, userId, expectedAmount } = JSON.parse(event.body);

    // Verify the payment session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Payment not completed',
          status: session.payment_status 
        })
      };
    }

    // Verify the metadata matches what we expect
    if (session.metadata.userId !== userId || 
        parseInt(session.metadata.creditAmount) !== expectedAmount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Payment verification failed - metadata mismatch' 
        })
      };
    }

    // Return success with payment details
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        creditAmount: parseInt(session.metadata.creditAmount),
        paymentAmount: session.amount_total / 100, // Convert from cents
        customerEmail: session.customer_email,
        sessionId: sessionId
      })
    };

  } catch (error) {
    console.error('Error verifying payment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to verify payment',
        details: error.message 
      })
    };
  }
};
