const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userEmail, userId } = JSON.parse(event.body);

    // First, try to find existing customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer if none exists
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.URL}?portal=return`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url
      })
    };

  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to create customer portal session',
        details: error.message 
      })
    };
  }
};
