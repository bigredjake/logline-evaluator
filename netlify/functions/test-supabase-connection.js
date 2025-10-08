exports.handler = async (event, context) => { 
  const results = {};
  
  // Test 1: Can we fetch a simple external site?
  try {
    const testResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    results.externalFetchWorks = testResponse.ok;
    results.externalStatus = testResponse.status;
  } catch (error) {
    results.externalFetchWorks = false;
    results.externalError = error.message;
  }
  
  // Test 2: What's the actual Supabase URL?
  results.supabaseUrl = process.env.SUPABASE_URL;
  results.hasAnonKey = !!process.env.SUPABASE_ANON_KEY;
  results.anonKeyLength = process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 0;
  
  // Test 3: Try Supabase
  try {
    const supabaseResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY
      }
    });
    results.supabaseFetchWorks = true;
    results.supabaseStatus = supabaseResponse.status;
  } catch (error) {
    results.supabaseFetchWorks = false;
    results.supabaseError = error.message;
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify(results, null, 2)
  };
};
