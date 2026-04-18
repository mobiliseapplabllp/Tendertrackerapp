const http = require("http");
function apiCall(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: "localhost", port: 5002, path, method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) } };
    const req = http.request(opts, (res) => { let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } }); });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const login = await apiCall("POST", "/api/v1/auth/login", { email: "admin@tendertrack.com", password: "Admin@123" });
  const token = login.data?.token;
  if (!token) { console.log("Login failed"); return; }

  const channels = ["linkedin","facebook","twitter","instagram","youtube","email"];

  // Fix SCMPro BOM (ID 41) channels
  console.log("Fixing SCMPro BOM channels...");
  for (const ch of channels) {
    await wait(800);
    const content = ch === "email" ? "<html><body><h2>SCMPro BOM & Production Planning</h2><p>Streamline manufacturing. Book demo at mobilisepro.com/demo</p></body></html>"
      : ch === "linkedin" ? "🚀 SCMPro BOM & Production Planning\n\nBill of materials, production orders, MRP.\n\n✅ 80% less manual work\n✅ Real-time analytics\n\n👉 mobilisepro.com/demo\n\n#SCMPro #SupplyChain"
      : ch === "twitter" ? "🔥 BOM & Production Planning — Streamline with SCMPro\n👉 mobilisepro.com/demo\n#SCMPro #SCM"
      : ch === "facebook" ? "📢 SCMPro BOM & Production Planning\nStreamline manufacturing. mobilisepro.com/demo\n#SCMPro"
      : ch === "instagram" ? "✨ BOM & Production Planning\nStreamline manufacturing!\n#SCMPro #SupplyChain #Manufacturing"
      : "SCMPro BOM | Mobilise App Lab\nProduction planning made simple.\n#SCMPro";
    const r = await apiCall("POST", "/api/v1/marketing/campaigns/41/channels", { channel_type: ch, content: content, scheduled_at: "2026-05-19T09:00:00", status: "draft" }, token);
    console.log("  " + ch + ": " + (r.success ? "OK" : r.error || "FAIL"));
  }

  // HREvO campaigns
  const hrCampaigns = [
    { name: "HREvO — From Hiring to Retiring, All in One", desc: "Complete HR lifecycle management platform for mid-to-large enterprises", date: "2026-04-21" },
    { name: "HREvO — Payroll in Minutes, Not Days", desc: "Automated salary calculation, statutory compliance, tax computation, payslip generation", date: "2026-04-28" },
    { name: "HREvO — Employee Self-Service Revolution", desc: "Mobile app for profile updates, payslips, leave apply, claims, approvals on the go", date: "2026-05-05" },
    { name: "HREvO — Performance That Drives Results", desc: "Goal setting, KRA/KPI tracking, 360-degree feedback, appraisal cycles, bell curve", date: "2026-05-12" },
    { name: "HREvO — Attendance & Workforce Analytics", desc: "Biometric integration, shift management, overtime tracking, geo-fencing, dashboards", date: "2026-05-19" },
  ];

  console.log("\n=== HREvO ===");
  for (let i = 0; i < hrCampaigns.length; i++) {
    const c = hrCampaigns[i];
    await wait(1500);
    const res = await apiCall("POST", "/api/v1/marketing/campaigns", { name: c.name, description: c.desc, type: "multi-channel", status: "draft", start_date: c.date, end_date: "2026-06-30", budget: 50000 + (i * 10000) }, token);
    if (!res.success && !res.data) { console.log("  FAIL: " + c.name + " - " + (res.error || "")); continue; }
    const cid = res.data?.id;
    console.log("  Created: " + c.name + " (ID: " + cid + ")");

    for (const ch of channels) {
      await wait(500);
      let content, subj;
      const tag = "#HREvO #HRTech #HRMS #PeopleOps";
      if (ch === "email") {
        subj = c.name + " | Free Demo";
        content = "<html><body style='font-family:Arial,sans-serif;color:#333;line-height:1.6'><div style='max-width:600px;margin:0 auto;padding:20px'><h2 style='color:#2c5aa0'>" + c.name + "</h2><p>Dear HR Leader,</p><p>" + c.desc + "</p><p>With <strong>HREvO</strong> by Mobilise App Lab Limited:</p><ul><li>Reduce HR admin work by 80%</li><li>99.9% payroll accuracy</li><li>Real-time workforce analytics</li><li>Employee self-service on mobile</li></ul><p><a href='https://mobilisepro.com/demo' style='background:#2c5aa0;color:white;padding:12px 24px;border-radius:6px;text-decoration:none'>Schedule Demo</a></p><p>Best regards,<br/>Mobilise App Lab Limited</p></div></body></html>";
      } else if (ch === "linkedin") {
        content = "🚀 " + c.name + "\n\n" + c.desc + "\n\nMobilise App Lab's HREvO helps 500+ organizations.\n✅ 80% less manual HR work\n✅ Real-time dashboards\n✅ Mobile self-service\n\n👉 mobilisepro.com/demo\n\n" + tag;
      } else if (ch === "twitter") {
        content = "🔥 " + (c.name.split("—")[1] || c.name).trim() + "\nTransform HR with HREvO by @MobiliseAppLab\n👉 mobilisepro.com/demo\n" + tag;
      } else if (ch === "facebook") {
        content = "📢 " + c.name + "\n\n" + c.desc + "\n\n📊 80% less manual work\n⚡ Real-time analytics\n\n👉 mobilisepro.com/demo\n" + tag;
      } else if (ch === "instagram") {
        content = "✨ " + (c.name.split("—")[1] || c.name).trim() + "\n\n" + c.desc + "\n🔗 Link in bio for demo\n" + tag + " #Automation #CloudSoftware";
      } else {
        content = c.name + " | Mobilise App Lab\n\n" + c.desc + "\n\n⏱ 0:00 Intro\n⏱ 3:00 Demo\n⏱ 7:00 Features\n⏱ 10:00 Get Started\n\nmobilisepro.com/demo\n" + tag;
      }
      const r = await apiCall("POST", "/api/v1/marketing/campaigns/" + cid + "/channels", { channel_type: ch, content: content, subject_line: subj, scheduled_at: c.date + "T09:00:00", status: "draft" }, token);
      if (!r.success && !r.data) console.log("    FAIL " + ch + ": " + (r.error || ""));
    }
    console.log("    + 6 channels");
  }
  console.log("\nDone!");
}
main().catch(console.error);
