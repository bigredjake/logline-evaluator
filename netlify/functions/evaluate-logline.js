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
    if (!formData.genre || !formData.tone || !formData.mainCharacter || !formData.antagonist || !formData.incitingIncident || !formData.storyDetails || !formData.logline) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Build the prompt (your updated prompt)
    const prompt = `I'm a screenwriter wanting to get the attention of Hollywood decision makers. Evaluate the following logline as a marketing tool that will be included in a query email, and it needs to hook an industry reader so they would be interested enough to request the screenplay so they can read it.

The logline should:
• be short (able to be read in 10-15 seconds or less)
• communicate the tone and basic premise of the screenplay
• hint at who the main character(s) is/are
• communicate the stakes as to what will be gained or lost
• imply (or outright state) who the main antagonist or antagonistic force is who is opposing the main character
• introduce the world of the movie or TV show
• use simple but highly engaging language
• limit punctuation to commas, periods, ellipses, perhaps the occasional exclamation point (limit of one per logline), and of course capitalized letters where appropriate

Important! Loglines do not have to check all of these boxes to be considered successful. So if a few are missing, that's fine. The logline's key purposes are to both **give a good indication of what the story is and it's marketable qualities, and more importantly, to make the reader immediately want to request and read the script**.

**Context Note:** This logline will be included in a **query email to screenwriting managers, producers, and their screenplay readers or interns**, who decide whether to request the script. Therefore, it must be **clear, emotionally compelling, and instantly convey marketability** while avoiding sounding generic or amateurish.

Other Notes:
• The logline does **not have to be one complete sentence**; fragments are fine as the primary goal is for the logline to evoke emotion and intrigue.
• Loglines are **sales pieces**, so while they shouldn't sound canned or generic. Punchy and slightly over-the-top phrasing is acceptable and often desirable.
• There are different types of loglines, but ones that are based in more formal writing do not perform as well unless the concept is so compelling it doesn't matter how the sentence(s) are structured. Feel free to experiment with structure, but prioritize clarity first, then emotional intrigue second, and brevity third.

Please do the following:
1. **Evaluate** how well the logline achieves these goals, noting any weaknesses, redundancies, or missed opportunities to hook the reader.
2. Then, **provide five alternative loglines** that maintain the intended concept but improve clarity, emotional impact, brevity, marketability, or intrigue while staying within the definition of a logline above.
3. Make sure each alternative includes, not necessarily in this order:
   • The main character or group (with a defining trait or role)
   • The inciting incident or core conflict
   • The stakes or urgency
   • A tone or phrase that hints at the genre/world
4. Feel free to use **sentence fragments, stylized phrasing, or evocative language** to maximize emotional resonance and market appeal. Professional loglines often read like **taglines mixed with concept pitches**, not stiff grammar exercises.
5. Additionally, create five possible titles for the movie / TV show being marketed. Ideally, these are one or two word titles that add intrigue and curiosity to the logline, but the titles can be longer if necessary

**Include the following details for context before the logline:**
• **Genre:** ${formData.genre}
• **Tone:** ${formData.tone}
• **Protagonist broad strokes:** ${formData.mainCharacter}
• **Antagonist / Antagonistic force:** ${formData.antagonist}
• **Setup or inciting incident summary:** ${formData.incitingIncident}
• **1-2 interesting details about the story:** ${formData.storyDetails}
• **Logline:** ${formData.logline}

Please format your response with clear sections for the evaluation, the five alternatives, and the five possible titles.`;

   // Call Claude API with retry logic for overloaded servers
let response;
for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch('https://api.anthropic.com/v1/messages', {
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

    if (response.ok) {
        break; // Success, exit retry loop
    }
    
    if (attempt < 3 && response.status === 529) {
        // Wait 2-5 seconds before retry for overloaded server
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        continue;
    }
    
    // If not 529 or final attempt, handle as error
    if (!response.ok) {
        const errorData = await response.text();
        console.error('Claude API Error:', errorData);
        return {
            statusCode: response.status,
            body: JSON.stringify({ error: 'Claude API error', details: errorData }),
        };
    }
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
