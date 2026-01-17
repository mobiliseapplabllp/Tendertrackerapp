import db from '../src/config/database';

const testGoogleQuery = async () => {
    try {
        // 1. Get the active interest profile
        const [interests] = await db.query(
            'SELECT * FROM tender_scout_interests WHERE is_active = TRUE LIMIT 1'
        );

        const interest = (interests as any[])[0];
        if (!interest) {
            console.error('❌ No active interest profile found.');
            process.exit(1);
        }

        console.log(`✅ Found active profile: "${interest.name}"`);

        // 2. Construct the query exactly as the service does
        const keywords = JSON.parse(interest.keywords);
        const query = `site:gov.in tender ${keywords.slice(0, 3).join(' OR ')}`;

        console.log('\n🔍 Generated Search Query:');
        console.log(`   "${query}"`);

        // 3. Generate a clickable Google URL
        const encodedQuery = encodeURIComponent(query);
        const googleUrl = `https://www.google.com/search?q=${encodedQuery}`;

        console.log('\n🌐 Click to test in browser:');
        console.log(`   ${googleUrl}`);

        // 4. Check API Configuration
        const [apiKeyConfig] = await db.query(
            "SELECT config_value FROM system_config WHERE config_key = 'google_search_api_key'"
        );
        const [engineIdConfig] = await db.query(
            "SELECT config_value FROM system_config WHERE config_key = 'google_search_engine_id'"
        );

        const apiKey = (apiKeyConfig as any[])[0]?.config_value || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
        const engineId = (engineIdConfig as any[])[0]?.config_value || process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

        console.log('\n⚙️  API Configuration Status:');
        console.log(`   API Key: ${apiKey ? '✅ Configured' : '❌ Missing'}`);
        console.log(`   Engine ID: ${engineId ? '✅ Configured' : '❌ Missing'}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

testGoogleQuery();
