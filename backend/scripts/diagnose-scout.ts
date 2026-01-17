import mysql from 'mysql2/promise';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function diagnoseScout() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'tendertrack_db',
        });

        console.log('🔍 Scout Diagnostic Tool\n');
        console.log('='.repeat(60));

        // 1. Check Google API configuration
        console.log('\n1️⃣ Checking Google API Configuration...');
        const [apiKeyConfig] = await connection.query(
            "SELECT config_value FROM system_config WHERE config_key = 'google_search_api_key'"
        );
        const [engineIdConfig] = await connection.query(
            "SELECT config_value FROM system_config WHERE config_key = 'google_search_engine_id'"
        );

        const apiKey = (apiKeyConfig as any[])[0]?.config_value || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
        const engineId = (engineIdConfig as any[])[0]?.config_value || process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

        if (!apiKey || !engineId) {
            console.log('   ❌ Google API not configured!');
            console.log('   Please configure in Scout Settings');
            return;
        }
        console.log('   ✅ API Key: ' + apiKey.substring(0, 10) + '...');
        console.log('   ✅ Engine ID: ' + engineId);

        // 2. Check active interests
        console.log('\n2️⃣ Checking Active Interest Profiles...');
        const [interests] = await connection.query(
            'SELECT id, name, keywords FROM tender_scout_interests WHERE is_active = 1'
        );

        if ((interests as any[]).length === 0) {
            console.log('   ❌ No active interest profiles found!');
            return;
        }

        for (const interest of interests as any[]) {
            console.log(`   ✅ Profile: ${interest.name}`);
            const keywords = JSON.parse(interest.keywords);
            console.log(`      Keywords (${keywords.length}): ${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? '...' : ''}`);

            // 3. Test Google Search with first 3 keywords
            console.log(`\n3️⃣ Testing Google Search for "${interest.name}"...`);
            const query = `site:gov.in tender ${keywords.slice(0, 3).join(' OR ')}`;
            console.log(`   Query: "${query}"`);

            try {
                const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                    params: {
                        key: apiKey,
                        cx: engineId,
                        q: query,
                        num: 10,
                    },
                });

                if (response.data.items && response.data.items.length > 0) {
                    console.log(`   ✅ Found ${response.data.items.length} results from Google!`);
                    console.log('\n   📋 Sample Results:');
                    response.data.items.slice(0, 3).forEach((item: any, idx: number) => {
                        console.log(`\n   ${idx + 1}. ${item.title}`);
                        console.log(`      URL: ${item.link}`);
                        console.log(`      Snippet: ${item.snippet.substring(0, 100)}...`);
                    });

                    // 4. Check relevance scoring
                    console.log('\n4️⃣ Checking Relevance Scoring...');
                    for (const item of response.data.items.slice(0, 3)) {
                        const tenderText = `${item.title} ${item.snippet}`.toLowerCase();
                        let keywordScore = 0;
                        const matchedKeywords: string[] = [];

                        for (const keyword of keywords) {
                            if (tenderText.includes(keyword.toLowerCase())) {
                                keywordScore += 1;
                                matchedKeywords.push(keyword);
                            }
                        }

                        const relevanceScore = (keywordScore / keywords.length) * 60 + 10; // Base score
                        console.log(`\n   Result: "${item.title.substring(0, 50)}..."`);
                        console.log(`   Matched Keywords (${matchedKeywords.length}/${keywords.length}): ${matchedKeywords.slice(0, 5).join(', ')}`);
                        console.log(`   Relevance Score: ${relevanceScore.toFixed(1)}%`);

                        if (relevanceScore < 30) {
                            console.log(`   ⚠️  Score too low! (Threshold is usually 30%)`);
                        } else {
                            console.log(`   ✅ Score sufficient!`);
                        }
                    }

                } else {
                    console.log('   ❌ Google returned 0 results!');
                    console.log('   Possible reasons:');
                    console.log('      - Keywords too specific');
                    console.log('      - No gov.in sites match the query');
                    console.log('      - API quota exceeded');

                    if (response.data.searchInformation) {
                        console.log(`   Total results available: ${response.data.searchInformation.totalResults}`);
                    }
                }

            } catch (error: any) {
                console.log(`   ❌ Google API Error: ${error.message}`);
                if (error.response) {
                    console.log(`   Status: ${error.response.status}`);
                    console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n💡 Recommendations:');
        console.log('   1. If Google returns 0 results: Try even broader keywords');
        console.log('   2. If relevance scores are too low: Adjust scoring threshold');
        console.log('   3. If API errors: Check quota and credentials');

    } catch (error: any) {
        console.error('❌ Diagnostic error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

diagnoseScout();
