import db from '../src/config/database';
import axios from 'axios';

const testGoogleApi = async () => {
    try {
        // 1. Get API credentials
        const [apiKeyConfig] = await db.query(
            "SELECT config_value FROM system_config WHERE config_key = 'google_search_api_key'"
        );
        const [engineIdConfig] = await db.query(
            "SELECT config_value FROM system_config WHERE config_key = 'google_search_engine_id'"
        );

        const apiKey = (apiKeyConfig as any[])[0]?.config_value || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
        const engineId = (engineIdConfig as any[])[0]?.config_value || process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

        if (!apiKey || !engineId) {
            console.error('❌ API Key or Engine ID missing!');
            process.exit(1);
        }

        console.log('🔑 Credentials found.');
        console.log(`   API Key: ${apiKey.substring(0, 5)}...`);
        console.log(`   Engine ID: ${engineId}`);

        // 2. Get active interest profile for the query
        const [interests] = await db.query(
            'SELECT * FROM tender_scout_interests WHERE is_active = TRUE LIMIT 1'
        );
        const interest = (interests as any[])[0];
        const keywords = JSON.parse(interest.keywords);
        const query = `site:gov.in tender ${keywords.slice(0, 3).join(' OR ')}`;

        console.log(`\n🔍 Query: "${query}"`);
        console.log('⏳ Calling Google Custom Search API...');

        // 3. Call the API
        try {
            const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: apiKey,
                    cx: engineId,
                    q: query,
                    num: 10,
                },
            });

            const items = response.data.items || [];
            console.log(`\n✅ API Response: Found ${items.length} results.`);

            if (items.length > 0) {
                console.log('\n--- First 3 Results ---');
                items.slice(0, 3).forEach((item: any, i: number) => {
                    console.log(`\n[${i + 1}] ${item.title}`);
                    console.log(`    Link: ${item.link}`);
                });
            } else {
                console.log('\n⚠️  The API returned 0 results.');
                console.log('   Possible reasons:');
                console.log('   1. The "Search Engine" (CX) is configured to search ONLY specific sites, not the whole web.');
                console.log('   2. You need to enable "Search the entire web" in your Programmable Search Engine settings.');
            }

        } catch (error: any) {
            console.error('\n❌ API Call Failed:');
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
            } else {
                console.error(`   Error: ${error.message}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Script Error:', error);
        process.exit(1);
    }
};

testGoogleApi();
