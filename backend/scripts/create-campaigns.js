const http = require("http");

function apiCall(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost", port: 5002, path, method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    };
    const req = http.request(opts, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  const login = await apiCall("POST", "/api/v1/auth/login", { email: "admin@tendertrack.com", password: "Admin@123" });
  const token = login.data?.token;
  if (!token) { console.log("Login failed"); return; }

  const productLines = [
    {
      name: "EduPro",
      desc: "Education Management Platform with admissions, attendance, fee management, exams, timetable, and parent communication",
      audience: "School principals, college directors, education administrators",
      campaigns: [
        { name: "EduPro — Transform Your Institution Digitally", desc: "Showcase how EduPro eliminates paperwork and automates school operations end-to-end" },
        { name: "EduPro — Admissions Made Effortless", desc: "Online admissions, merit lists, and seat allocation for institutions struggling with manual processes" },
        { name: "EduPro — Zero Fee Leakage Guarantee", desc: "EduPro fee management solves fee collection challenges with online payment and defaulter tracking" },
        { name: "EduPro — Smart Attendance for Smart Schools", desc: "Biometric/RFID attendance with automated reports and real-time parent notifications" },
        { name: "EduPro — Exam & Results in One Click", desc: "Simplify exam scheduling, marks entry, report cards, and grade calculation for your institution" },
      ]
    },
    {
      name: "OpsSuite",
      desc: "Operations Management Suite for facility management, asset tracking, helpdesk, housekeeping, energy management",
      audience: "Operations managers, facility heads, admin directors, CXOs",
      campaigns: [
        { name: "OpsSuite — Cut Operational Costs by 30%", desc: "Data-driven facility management automation that reduces costs and improves efficiency" },
        { name: "OpsSuite — Never Miss a Maintenance Again", desc: "Preventive maintenance scheduling, asset lifecycle tracking, and compliance alerts" },
        { name: "OpsSuite — Helpdesk That Actually Resolves", desc: "Ticketing system with SLA tracking, escalation, and resolution analytics" },
        { name: "OpsSuite — Energy Management Intelligence", desc: "Meter reading automation, consumption tracking, bill verification, and cost reduction" },
        { name: "OpsSuite — Visitor & Security Management", desc: "Visitor pre-registration, ID verification, badge printing, and security integration" },
      ]
    },
    {
      name: "SCMPro",
      desc: "Supply Chain Management Platform for procurement, inventory, vendor management, purchase orders, GRN, GST compliance",
      audience: "Procurement heads, supply chain managers, CFOs, warehouse managers",
      campaigns: [
        { name: "SCMPro — Procurement Automation That Saves Millions", desc: "Automated purchase orders, vendor comparison, and rate contract management for enterprises" },
        { name: "SCMPro — Real-Time Inventory Visibility", desc: "Stock tracking, reorder alerts, warehouse management, and inventory aging analytics" },
        { name: "SCMPro — Vendor Management Excellence", desc: "Vendor registration, performance scoring, blacklist management, and compliance tracking" },
        { name: "SCMPro — GST-Ready Supply Chain", desc: "GST invoicing, e-way bills, HSN mapping, and returns filing made simple" },
        { name: "SCMPro — BOM & Production Planning", desc: "Bill of materials management, production orders, and material requirements planning" },
      ]
    },
    {
      name: "HREvO",
      desc: "HR Evolution Platform for core HR, attendance, payroll, leave, recruitment, training, performance, and employee self-service",
      audience: "HR directors, CHROs, HR managers, people operations leaders",
      campaigns: [
        { name: "HREvO — From Hiring to Retiring, All in One", desc: "Complete HR lifecycle management platform for mid-to-large enterprises" },
        { name: "HREvO — Payroll in Minutes, Not Days", desc: "Automated salary calculation, statutory compliance, tax computation, and payslip generation" },
        { name: "HREvO — Employee Self-Service Revolution", desc: "Mobile app for profile updates, payslips, leave apply, claims, and approvals on the go" },
        { name: "HREvO — Performance That Drives Results", desc: "Goal setting, KRA/KPI tracking, 360-degree feedback, appraisal cycles, and bell curve analysis" },
        { name: "HREvO — Attendance & Workforce Analytics", desc: "Biometric integration, shift management, overtime tracking, geo-fencing, and real-time dashboards" },
      ]
    },
  ];

  const channels = ["linkedin", "facebook", "twitter", "instagram", "youtube", "email"];
  const dates = ["2026-04-21", "2026-04-28", "2026-05-05", "2026-05-12", "2026-05-19"];
  const times = ["09:00", "10:30", "14:00", "11:00", "15:30"];

  let totalCampaigns = 0;
  let totalChannels = 0;

  for (const pl of productLines) {
    console.log("\n=== " + pl.name + " ===");
    for (let i = 0; i < pl.campaigns.length; i++) {
      const c = pl.campaigns[i];

      const res = await apiCall("POST", "/api/v1/marketing/campaigns", {
        name: c.name, description: c.desc, type: "multi-channel", status: "draft",
        start_date: dates[i], end_date: "2026-06-30", budget: 50000 + (i * 10000),
      }, token);

      if (!res.success && !res.data) {
        console.log("  FAIL create: " + c.name + " - " + (res.error || ""));
        continue;
      }

      const campaignId = res.data?.id;
      console.log("  Created: " + c.name + " (ID: " + campaignId + ")");
      totalCampaigns++;

      for (let j = 0; j < channels.length; j++) {
        const ch = channels[j];
        const schedDate = dates[i] + "T" + times[j % 5] + ":00";
        let content = "";
        let subjectLine = "";

        const sector = pl.name === "EduPro" ? "institution" : pl.name === "HREvO" ? "HR operations" : pl.name === "SCMPro" ? "supply chain" : "operations";
        const hashtags = pl.name === "EduPro" ? "#EdTech #SchoolERP #EducationManagement" : pl.name === "HREvO" ? "#HRTech #HRMS #PeopleOps" : pl.name === "SCMPro" ? "#SupplyChain #Procurement #SCM" : "#FacilityManagement #OpsManagement";

        if (ch === "email") {
          subjectLine = c.name + " | Book Your Free Demo Today";
          content = "<html><body style='font-family:Arial,sans-serif;color:#333;line-height:1.6'><div style='max-width:600px;margin:0 auto;padding:20px'><h2 style='color:#2c5aa0'>" + c.name + "</h2><p>Dear Decision Maker,</p><p>" + c.desc + "</p><p>With Mobilise App Lab Limited's <strong>" + pl.name + "</strong>, you can:</p><ul><li>Reduce manual work by 80%</li><li>Improve accuracy to 99.9%</li><li>Get real-time analytics and dashboards</li><li>Ensure compliance with industry regulations</li></ul><p><strong>Book a free 30-minute demo today</strong> and see how " + pl.name + " can transform your " + sector + ".</p><p style='margin-top:20px'><a href='https://mobilisepro.com/demo' style='background:#2c5aa0;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block'>Schedule Demo</a></p><p style='margin-top:20px'>Best regards,<br/>Mobilise App Lab Limited Team</p></div></body></html>";
        } else if (ch === "linkedin") {
          content = "🚀 " + c.name + "\n\n" + c.desc + "\n\nAt Mobilise App Lab Limited, we've helped 500+ organizations streamline their " + sector + " with " + pl.name + ".\n\nKey results our clients see:\n✅ 80% reduction in manual processes\n✅ Real-time dashboards & analytics\n✅ 99.9% data accuracy\n✅ Cloud-based, accessible anywhere\n\nReady to transform your " + sector + "?\n\n👉 Book a free demo: mobilisepro.com/demo\n\n#" + pl.name + " #DigitalTransformation #B2B #Mobilise " + hashtags;
        } else if (ch === "twitter") {
          content = "🔥 " + (c.name.split("—")[1] || c.name).trim() + "\n\nReduce costs by 30% with " + pl.name + " by @MobiliseAppLab\n\n👉 Free demo: mobilisepro.com/demo\n\n#" + pl.name + " #B2B " + hashtags;
        } else if (ch === "facebook") {
          content = "📢 " + c.name + "\n\n" + c.desc + "\n\nDiscover how Mobilise App Lab's " + pl.name + " helps organizations achieve:\n📊 80% less manual work\n⚡ Real-time analytics\n☁️ Cloud-based access anywhere\n\n👉 Book your free demo today!\nmobilisepro.com/demo\n\n#" + pl.name + " #DigitalTransformation #Enterprise " + hashtags;
        } else if (ch === "instagram") {
          content = "✨ " + (c.name.split("—")[1] || c.name).trim() + "\n\n" + c.desc + "\n\nSwipe to see how " + pl.name + " transforms businesses! 👆\n\n🔗 Link in bio for free demo\n\n#" + pl.name + " #MobiliseAppLab #DigitalTransformation #B2B #Enterprise #SaaS #CloudSoftware #Automation " + hashtags;
        } else if (ch === "youtube") {
          content = c.name + " | Mobilise App Lab Limited\n\n" + c.desc + "\n\nIn this video:\n⏱ 0:00 - Introduction\n⏱ 1:00 - Problem Statement\n⏱ 3:00 - " + pl.name + " Solution Demo\n⏱ 7:00 - Key Features\n⏱ 10:00 - Customer Testimonials\n⏱ 12:00 - How to Get Started\n\n🔗 Book demo: https://mobilisepro.com/demo\n📧 sales@mobilisepro.com\n\n#" + pl.name + " #MobiliseAppLab " + hashtags;
        }

        const chRes = await apiCall("POST", "/api/v1/marketing/campaigns/" + campaignId + "/channels", {
          channel_type: ch, content: content, subject_line: subjectLine || undefined, scheduled_at: schedDate, status: "draft",
        }, token);

        if (chRes.success || chRes.data) { totalChannels++; }
        else { console.log("    FAIL " + ch + ": " + (chRes.error || "")); }
      }
      console.log("    + 6 channels added");
    }
  }

  console.log("\n✅ Done! Created " + totalCampaigns + " campaigns with " + totalChannels + " channels.");
}

main().catch(console.error);
