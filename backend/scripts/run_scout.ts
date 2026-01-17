import { TenderScoutService } from '../src/services/tenderScoutService';


const runScoutManual = async () => {
    try {
        console.log('🚀 Starting Manual Scout Run...');

        const results = await TenderScoutService.runScout();

        console.log('\n✅ Scout Run Completed!');
        console.log(JSON.stringify(results, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('❌ Scout Run Failed:', error);
        process.exit(1);
    }
};

runScoutManual();
