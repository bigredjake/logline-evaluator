exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request body
    const { formData } = JSON.parse(event.body);
    
    // Validate required fields
    if (!formData.genre || !formData.tone || !formData.mainCharacter || !formData.incitingIncident || !formData.logline) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Build the prompt (your exact prompt)
    const prompt = `Evaluate the following logline as a marketing tool to hook an industry reader. It should be short (able to be read in 10-15 seconds or less), communicate the tone and basic premise of the screenplay, hint at who the main character(s) is/are, and introduce the world of the movie or TV show. Its purpose is **not just to describe the story, but to make the reader immediately want to request and read the script**.

**Context Note:** This logline will be included in a **query email to screenwriting managers, producers, and their screenplay readers or interns**, who decide whether to request the script. Therefore, it must be **clear, emotionally compelling, and instantly convey marketability** while avoiding sounding generic or amateurish.

Other Notes:
• The logline does **not have to be one complete sentence**; fragments are fine if they evoke emotion and intrigue.
• Loglines are **sales pieces**, so while they shouldn't sound canned or generic, punchy and slightly over-the-top phrasing is acceptable and often desirable.

Please do the following:
1. **Evaluate** how well the logline achieves these goals, noting any weaknesses, redundancies, or missed opportunities to hook the reader.
2. Then, **provide three alternative loglines** that maintain the intended concept but improve clarity, marketability, emotional impact, or intrigue while staying within the definition of a logline above.
3. Make sure each alternative includes:
   • The main character or group (with a defining trait or role)
   • The inciting incident or core conflict
   • The stakes or urgency
   • A tone or phrase that hints at the genre/world
4. Feel free to use **sentence fragments, stylized phrasing, or evocative language** to maximize emotional resonance and market appeal. Professional loglines often read like **taglines mixed with concept pitches**, not stiff grammar exercises.

**Include the following details for context before the logline:**
• **Genre:** ${formData.genre}
• **Tone:** ${formData.tone}
• **Main character broad strokes:** ${formData.mainCharacter}
• **Setup or inciting incident summary:** ${formData.incitingIncident}
• **Logline:** ${formData.logline}

Please format your response with clear sections for the evaluation and the three alternatives.`;

    // Call Claude API from server (no CORS issues here)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API Error:', errorData);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Claude API error', details: errorData }),
      };
    }

    const data = await response.json();
    const claudeResponse = data.content[0].text;

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ 
        evaluation: claudeResponse,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};