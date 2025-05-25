// Test script to verify Azure OpenAI connection using fetch (like curl)
const endpoint = "https://stefanoshub2178064662.openai.azure.com/openai/deployments/makeathon/chat/completions?api-version=2025-01-01-preview";
const apiKey = "D0RG9qu7Bv8OuN7Q2UcI2jaCUekY1YJkBaoy90ASpuW8013J8IynJQQJ99BDACPV0roXJ3w3AAAAACOGnWDy";

async function testConnection() {
  try {
    console.log('Testing Azure OpenAI connection with fetch...');
    
    const response = await fetch(endpoint, {
      method: 'POST',      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "Hello, can you respond in Greek? Just say 'Γεια σας!' to test."
          }
        ],
        max_tokens: 100,
        temperature: 1,
        top_p: 1,
        model: "makeathon"
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Response:', data.choices[0]?.message?.content);
    } else {
      console.log('❌ Error response:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testConnection();
