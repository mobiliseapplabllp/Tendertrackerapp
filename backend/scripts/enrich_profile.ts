import db from '../src/config/database';


const enrichProfile = async () => {
    try {
        const profileId = 2; // The ID we saw in the logs

        const newKeywords = [
            // Core Software
            "Software Development", "Web Application", "Mobile App Development", "Custom Software",
            "Software Maintenance", "AMC Software", "System Integration", "API Integration",

            // SaaS & Cloud
            "SaaS", "Software as a Service", "Cloud Computing", "Cloud Services", "Hosting",
            "Azure", "AWS", "Google Cloud", "Cloud Migration",

            // Enterprise Solutions
            "ERP Implementation", "CRM Software", "HRMS", "Document Management System",
            "Workflow Automation", "Business Intelligence", "Data Analytics",

            // Emerging Tech
            "Artificial Intelligence", "Machine Learning", "AI/ML", "Chatbot",
            "Blockchain", "IoT", "Internet of Things",

            // IT Services
            "IT Managed Services", "Helpdesk Support", "Technical Support",
            "Digitization", "E-Governance", "Portal Development", "Website Design",

            // Specific Terms
            "Tender Management System", "Procurement Portal", "E-Auction",
            "Fixed Asset Management", "Complaint Management"
        ];

        const newCategories = [
            "Information Technology",
            "Software Services",
            "Computer Hardware & Software",
            "Consultancy Services",
            "Telecom Services"
        ];

        const newRegions = [
            "India",
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
            "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
            "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
            "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
            "Uttarakhand", "West Bengal",
            "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
            "Lakshadweep", "Delhi", "Puducherry", "Ladakh", "Jammu and Kashmir"
        ];

        console.log(`🚀 Enriching profile ID ${profileId}...`);

        await db.query(
            `UPDATE tender_scout_interests 
             SET keywords = ?, categories = ?, regions = ?, is_active = 1
             WHERE id = ?`,
            [
                JSON.stringify(newKeywords),
                JSON.stringify(newCategories),
                JSON.stringify(newRegions),
                profileId
            ]
        );

        console.log('✅ Profile enriched successfully!');
        console.log(`   - Added ${newKeywords.length} keywords`);
        console.log(`   - Added ${newCategories.length} categories`);
        console.log(`   - Added ${newRegions.length} regions`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error enriching profile:', error);
        process.exit(1);
    }
};

enrichProfile();
