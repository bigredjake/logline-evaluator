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

    // Build the shared prompt content
    const promptContent = `I'm a screenwriter wanting to get the attention of Hollywood decision makers. Evaluate the following logline as a marketing tool that will be included in a query email, and it needs to hook an industry reader so they would be interested enough to request the screenplay so they can read it.

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

    // Function to call Claude API
    async function callClaude() {
      console.log('Starting Claude API attempt...');
      
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Claude attempt ${attempt}/2`);
          
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
                content: promptContent
              }]
            })
          });

          console.log(`Claude response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log('Claude API success');
            return {
              success: true,
              content: data.content[0].text,
              provider: 'Claude'
            };
          }
          
          // If 529 (overloaded) and not final attempt, wait and retry
          if (attempt < 2 && response.status === 529) {
            console.log('Claude overloaded (529), retrying...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          
          // For other errors or final attempt, log and break
          const errorText = await response.text();
          console.error(`Claude failed: ${response.status} - ${errorText}`);
          break;
          
        } catch (error) {
          console.error(`Claude attempt ${attempt} exception:`, error.message);
          if (attempt === 2) break;
        }
      }
      
      console.log('Claude completely failed, will try OpenAI');
      return { success: false };
    }

    // Function to call OpenAI API
    async function callOpenAI() {
      console.log('Starting OpenAI API attempt...');
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{
              role: 'user',
              content: promptContent
            }],
            max_tokens: 2000,
            temperature: 0.7
          })
        });

        console.log(`OpenAI response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('OpenAI API success');
          
          // Verify we got content back
          if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            return {
              success: true,
              content: data.choices[0].message.content,
              provider: 'OpenAI'
            };
          } else {
            console.error('OpenAI returned empty content:', JSON.stringify(data, null, 2));
            return {
              success: false,
              error: 'OpenAI returned empty content'
            };
          }
        } else {
          const errorText = await response.text();
          console.error(`OpenAI failed: ${response.status} - ${errorText}`);
          return {
            success: false,
            error: `OpenAI API error: ${response.status}`
          };
        }
      } catch (error) {
        console.error('OpenAI exception:', error.message);
        return {
          success: false,
          error: `OpenAI exception: ${error.message}`
        };
      }
    }

    // Try Claude first
    console.log('Starting evaluation process...');
    let result = await callClaude();
    
    // If Claude fails, try OpenAI
    if (!result.success) {
      console.log('Claude failed, attempting OpenAI fallback...');
      result = await callOpenAI();
    }

    // If both fail, return error
    if (!result.success) {
      console.error('Both APIs failed completely');
      return {
        statusCode: 503,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({ 
          error: 'Both AI services are currently unavailable. Please try again in a few minutes.',
          details: result.error || 'Unknown error'
        }),
      };
    }

    // Verify we have content
    if (!result.content || result.content.trim().length === 0) {
      console.error('No content in successful result');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({ 
          error: 'AI service returned empty response',
          provider: result.provider
        }),
      };
    }

    // Success - return the evaluation
    console.log(`Success with ${result.provider}, content length: ${result.content.length}`);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ 
        evaluation: result.content,
        provider: result.provider,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Function top-level error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
    };
  }
};
