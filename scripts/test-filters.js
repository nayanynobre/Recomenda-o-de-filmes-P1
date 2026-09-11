const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

async function testFiltersEndpoint() {
    console.log('Testing /shows/search/filters endpoint...');
    try {
        const response = await axios.get('https://streaming-availability.p.rapidapi.com/shows/search/filters', {
            params: {
                country: 'br',
                service: 'netflix',
                show_type: 'movie',
                order_by: 'popularity_1week',
                desc: 'true',
                output_language: 'en'
            },
            headers: {
                'X-RapidAPI-Key': RAPID_API_KEY,
                'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
            }
        });

        console.log('✅ Success! Status:', response.status);
        console.log('Response keys:', Object.keys(response.data));
        if (response.data.shows) {
            console.log('Shows found:', response.data.shows.length);
            console.log('First show:', JSON.stringify(response.data.shows[0], null, 2));
        } else if (Array.isArray(response.data)) {
            console.log('Array response found:', response.data.length);
            console.log('First item:', JSON.stringify(response.data[0], null, 2));
        } else {
            console.log('Unexpected structure:', JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Failed:', error.response ? error.response.status : error.message);
        if (error.response && error.response.data) {
            console.log('Error data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testFiltersEndpoint();
