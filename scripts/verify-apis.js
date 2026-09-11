const fs = require('fs');
const path = require('path');
const axios = require('axios');
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

const RAPID_API_KEY = envVars.EXPO_PUBLIC_RAPID_API_KEY;
const GEMINI_API_KEY = envVars.EXPO_PUBLIC_GEMINI_API_KEY;

console.log('Checking keys...');
console.log('RAPID_API_KEY:', RAPID_API_KEY ? 'Present' : 'Missing');
console.log('GEMINI_API_KEY:', GEMINI_API_KEY ? 'Present' : 'Missing');

async function testStreamingApi() {
    console.log('\nTesting Streaming Availability API...');

    const endpoints = [
        '/shows/search/title',
        '/v2/shows/search/title',
        '/v3/shows/search/title'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Trying endpoint: ${endpoint}...`);
            const response = await axios.get(`https://streaming-availability.p.rapidapi.com${endpoint}`, {
                params: {
                    title: 'Inception',
                    country: 'br',
                    show_type: 'movie',
                    output_language: 'en'
                },
                headers: {
                    'X-RapidAPI-Key': RAPID_API_KEY,
                    'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
                }
            });
            console.log(`✅ Streaming API Success with ${endpoint}! Found:`, response.data.length || 'some', 'items');
            return; // Stop if found
        } catch (error) {
            console.log(`❌ Failed ${endpoint}:`, error.response ? error.response.status : error.message);
            if (error.response && error.response.data) {
                console.log('Error data:', JSON.stringify(error.response.data).substring(0, 100));
            }
        }
    }
}

async function testGeminiApi() {
    console.log('\nTesting Gemini API...');

    const models = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-pro',
        'gemini-1.5-pro'
    ];

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    for (const model of models) {
        try {
            console.log(`Trying model: ${model}...`);
            const response = await ai.models.generateContent({
                model: model,
                contents: 'Hello, are you working?',
            });
            console.log(`✅ Gemini API Success with ${model}! Response:`, response.text());
            return; // Stop if found
        } catch (error) {
            console.log(`❌ Failed ${model}:`, error.message);
        }
    }
}

async function run() {
    await testStreamingApi();
    await testGeminiApi();
}

run();
