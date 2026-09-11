const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// Load env vars manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const GEMINI_API_KEY = envVars.EXPO_PUBLIC_GEMINI_API_KEY;

console.log('GEMINI_API_KEY:', GEMINI_API_KEY ? 'Present' : 'Missing');

async function testGeminiApi() {
    console.log('\nTesting Gemini API...');

    const models = [
        'gemini-2.5-flash',
    ];

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    for (const model of models) {
        try {
            console.log(`Trying model: ${model}...`);
            const response = await ai.models.generateContent({
                model: model,
                contents: 'Hello, are you working?',
            });

            console.log(`✅ Gemini API Success with ${model}!`);

            // Debug response structure
            if (response && typeof response.text === 'function') {
                console.log('Response text():', response.text());
            } else if (response && response.text) {
                console.log('Response text property:', response.text);
            } else {
                console.log('Response object keys:', Object.keys(response));
                console.log('Full response:', JSON.stringify(response, null, 2));
            }

            return; // Stop if found
        } catch (error) {
            console.log(`❌ Failed ${model}:`, error.message);
        }
    }
}

testGeminiApi();
