// VitaGuard Pro - MCP-Based Multi-Agent Healthcare System
// Email Alerts Only (using Gmail API)

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

// ============ MCP SHARED CONTEXT MEMORY ============
const MCPContext = {
    patients: [],
    alertHistory: [],
    emailLog: [],
    clinicalGuidelines: {
        hypertension: "ACC/AHA: BP ≥130/80 mmHg indicates hypertension",
        diabetes: "ADA: Fasting glucose ≥126 mg/dL indicates diabetes",
        tachycardia: "AHA: Resting heart rate >100 bpm requires evaluation"
    },
    agentStates: {
        agent1: { status: "idle", lastAction: null },
        agent2: { status: "idle", lastAnalysis: null },
        agent3: { status: "idle", lastWorkflow: null }
    },
    lastUpdated: new Date().toISOString()
};

let nextId = 1001;

// Email Transporter (Gmail)
let emailTransporter = null;
let emailConfigured = false;

try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        emailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        emailConfigured = true;
        console.log('✅ Email service configured');
    } else {
        console.log('⚠️ Email not configured - create .env file with EMAIL_USER and EMAIL_PASS');
    }
} catch(e) {
    console.log('❌ Email configuration error:', e.message);
}

// Add demo patient
MCPContext.patients.push({
    id: 1001,
    name: "Manasa C B",
    age: 22,
    gender: "Female",
    state: "Karnataka",
    phone: "+917760784048",
    email: "manasacbbasanna2004@gmail.com",
    condition: "Under Observation",
    bpSystolic: 158,
    glucose: 148,
    heartRate: 100,
    outcome: "Active",
    admissionDate: new Date().toLocaleDateString(),
    alertHistory: [],
    lastVitalsUpdate: new Date().toISOString()
});

// ============ MCP TOOLS ============

// Clinical Analysis Engine
function clinicalAnalysisEngine(vitals) {
    const { bpSystolic, glucose, heartRate } = vitals;
    let diagnosis = "", confidence = 70, severity = "info", recommendations = [];
    
    if (bpSystolic && bpSystolic >= 150) {
        diagnosis = "HYPERTENSIVE CRISIS - Immediate medical attention required";
        recommendations = ["Start antihypertensive medication", "Schedule cardiology consult", "Monitor BP every 2 hours"];
        confidence = 94;
        severity = "critical";
    } 
    else if (bpSystolic && bpSystolic >= 130) {
        diagnosis = "STAGE 1 HYPERTENSION - Lifestyle modifications needed";
        recommendations = ["DASH diet", "Reduce sodium intake", "Exercise 30 min daily", "Follow-up in 2 weeks"];
        confidence = 87;
        severity = "warning";
    }
    else if (glucose && glucose >= 180) {
        diagnosis = "CRITICAL HYPERGLYCEMIA - Diabetes management needed";
        recommendations = ["Adjust insulin dosage", "Check ketones", "Dietary consultation", "Monitor glucose every 4 hours"];
        confidence = 92;
        severity = "critical";
    }
    else if (glucose && glucose >= 140) {
        diagnosis = "ELEVATED GLUCOSE - Poor glycemic control";
        recommendations = ["Increase physical activity", "Review carbohydrate intake", "Medication adjustment may be needed"];
        confidence = 85;
        severity = "warning";
    }
    else if (heartRate && heartRate > 100) {
        diagnosis = "TACHYCARDIA - Cardiac evaluation recommended";
        recommendations = ["ECG recommended", "Stress management", "Avoid caffeine", "Beta-blocker evaluation"];
        confidence = 82;
        severity = "warning";
    }
    else {
        diagnosis = "ALL VITALS NORMAL - Patient stable";
        recommendations = ["Routine follow-up in 3 months", "Maintain healthy lifestyle", "Continue current medications"];
        confidence = 96;
        severity = "info";
    }
    
    return { diagnosis, recommendations, confidence, severity };
}

// Send Email Alert
async function sendEmailAlert(patient, analysis) {
    if (!emailConfigured) {
        return { success: false, error: "Email not configured", demo: true };
    }
    
    if (!patient.email || patient.email === '') {
        return { success: false, error: "No email address for patient", demo: true };
    }
    
    let subject = "";
    let htmlContent = "";
    let textContent = "";
    
    if (analysis.severity === "critical") {
        subject = `🚨 URGENT: Health Alert for ${patient.name} - Critical Condition`;
        htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background: #dc2626; padding: 20px; text-align: center; color: white;">
                    <h2 style="margin: 0;">🚨 URGENT HEALTH ALERT</h2>
                </div>
                <div style="padding: 20px;">
                    <p style="font-size: 18px; color: #dc2626; font-weight: bold;">${analysis.diagnosis}</p>
                    <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin: 0 0 10px 0;">📋 Immediate Recommendations:</h3>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${analysis.recommendations.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                        <p><strong>🎯 Clinical Confidence:</strong> ${analysis.confidence}%</p>
                        <p><strong>📅 Alert Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p style="margin-top: 20px; color: #64748b; font-size: 12px;">This is an automated message from VitaGuard Pro. Please contact your healthcare provider immediately.</p>
                </div>
            </div>
        `;
        textContent = `URGENT: ${analysis.diagnosis}\n\nRecommendations:\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}\n\nConfidence: ${analysis.confidence}%`;
    } 
    else if (analysis.severity === "warning") {
        subject = `⚠️ Health Advisory for ${patient.name} - Follow-up Recommended`;
        htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background: #f59e0b; padding: 20px; text-align: center; color: white;">
                    <h2 style="margin: 0;">⚠️ Health Advisory</h2>
                </div>
                <div style="padding: 20px;">
                    <p style="font-size: 18px; color: #f59e0b; font-weight: bold;">${analysis.diagnosis}</p>
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin: 0 0 10px 0;">📋 Recommendations:</h3>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${analysis.recommendations.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                        <p><strong>🎯 Clinical Confidence:</strong> ${analysis.confidence}%</p>
                        <p><strong>📅 Alert Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p style="margin-top: 20px; color: #64748b; font-size: 12px;">This is an automated message from VitaGuard Pro. Please follow up with your doctor.</p>
                </div>
            </div>
        `;
        textContent = `Health Advisory: ${analysis.diagnosis}\n\nRecommendations:\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}\n\nConfidence: ${analysis.confidence}%`;
    }
    else {
        subject = `ℹ️ Health Update for ${patient.name} - Routine Information`;
        htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background: #10b981; padding: 20px; text-align: center; color: white;">
                    <h2 style="margin: 0;">ℹ️ Health Update</h2>
                </div>
                <div style="padding: 20px;">
                    <p style="font-size: 18px; color: #10b981; font-weight: bold;">${analysis.diagnosis}</p>
                    <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin: 0 0 10px 0;">📋 Recommendations:</h3>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${analysis.recommendations.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                        <p><strong>🎯 Clinical Confidence:</strong> ${analysis.confidence}%</p>
                        <p><strong>📅 Alert Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p style="margin-top: 20px; color: #64748b; font-size: 12px;">This is an automated message from VitaGuard Pro. Thank you for using our service.</p>
                </div>
            </div>
        `;
        textContent = `Health Update: ${analysis.diagnosis}\n\nRecommendations:\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}\n\nConfidence: ${analysis.confidence}%`;
    }
    
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: patient.email,
            subject: subject,
            html: htmlContent,
            text: textContent
        };
        
        const result = await emailTransporter.sendMail(mailOptions);
        
        // Log to MCP context
        const emailRecord = {
            id: Date.now(),
            patientId: patient.id,
            patientName: patient.name,
            to: patient.email,
            subject: subject,
            severity: analysis.severity,
            status: "sent",
            messageId: result.messageId,
            timestamp: new Date().toISOString()
        };
        
        MCPContext.emailLog.push(emailRecord);
        MCPContext.alertHistory.push(emailRecord);
        
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}

// ============ API ENDPOINTS ============

// Health check
app.get('/api/mcp/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        emailConfigured: emailConfigured,
        patientsCount: MCPContext.patients.length,
        alertsCount: MCPContext.alertHistory.length
    });
});

// Get all patients
app.get('/api/mcp/patients', (req, res) => {
    res.json(MCPContext.patients);
});

// Search patients
app.get('/api/mcp/patients/search', (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    if (!query) return res.json(MCPContext.patients);
    
    const filtered = MCPContext.patients.filter(p => 
        p.name.toLowerCase().includes(query) ||
        String(p.id).includes(query) ||
        (p.phone && p.phone.includes(query)) ||
        (p.state && p.state.toLowerCase().includes(query))
    );
    res.json(filtered);
});

// Get single patient
app.get('/api/mcp/patients/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const patient = MCPContext.patients.find(p => p.id === id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
});

// Add new patient
app.post('/api/mcp/patients', (req, res) => {
    const { name, age, gender, state, phone, email, condition, bpSystolic, glucose, heartRate } = req.body;
    
    if (!name || !age || !state) {
        return res.status(400).json({ error: 'Name, Age, and State are required' });
    }
    
    const newPatient = {
        id: nextId++,
        name, age: parseInt(age), gender, state, phone, email,
        condition: condition || 'General',
        bpSystolic: bpSystolic ? parseInt(bpSystolic) : null,
        glucose: glucose ? parseInt(glucose) : null,
        heartRate: heartRate ? parseInt(heartRate) : null,
        outcome: 'Active',
        admissionDate: new Date().toLocaleDateString(),
        alertHistory: [],
        lastVitalsUpdate: new Date().toISOString()
    };
    MCPContext.patients.push(newPatient);
    res.json({ success: true, patient: newPatient });
});

// Update patient vitals
app.put('/api/mcp/patients/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const patient = MCPContext.patients.find(p => p.id === id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    
    Object.assign(patient, req.body);
    patient.lastVitalsUpdate = new Date().toISOString();
    res.json({ success: true, patient });
});

// Agent 2: Clinical Analysis
app.post('/api/mcp/analyze', (req, res) => {
    const { patientId } = req.body;
    const patient = MCPContext.patients.find(p => p.id === patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    
    const analysis = clinicalAnalysisEngine({
        bpSystolic: patient.bpSystolic,
        glucose: patient.glucose,
        heartRate: patient.heartRate
    });
    
    MCPContext.agentStates.agent2 = {
        status: "completed",
        lastAnalysis: analysis,
        timestamp: new Date().toISOString()
    };
    
    res.json({ success: true, analysis });
});

// Agent 3: Send Email Alert
app.post('/api/mcp/send-email-alert', async (req, res) => {
    const { patientId, analysis } = req.body;
    const patient = MCPContext.patients.find(p => p.id === patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    
    if (!patient.email) {
        return res.json({ success: false, error: "No email address for patient" });
    }
    
    const result = await sendEmailAlert(patient, analysis);
    
    MCPContext.agentStates.agent3 = {
        status: "completed",
        lastWorkflow: { patientId: patient.id, severity: analysis.severity, emailSent: result.success },
        timestamp: new Date().toISOString()
    };
    
    res.json({ success: result.success, result });
});

// CSV Upload
app.post('/api/mcp/upload-csv', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const csvData = fs.readFileSync(req.file.path, 'utf8');
    const lines = csvData.split(/\r?\n/);
    if (lines.length < 2) return res.json({ success: false, importedCount: 0 });
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));
    let importedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim().replace(/["']/g, ''));
        let patient = {};
        headers.forEach((h, idx) => { patient[h] = values[idx] || ''; });
        
        let id = parseInt(patient.Patient_ID) || parseInt(patient.id) || (nextId++);
        if (!MCPContext.patients.some(p => p.id === id)) {
            MCPContext.patients.push({
                id, name: patient.Name || patient.name || `Patient_${id}`,
                age: parseInt(patient.Age) || 0,
                gender: patient.Gender || patient.gender || 'Other',
                state: patient.State || patient.state || 'Unknown',
                phone: patient.Phone || patient.phone || '',
                email: patient.Email || patient.email || '',
                condition: patient.Condition || 'General',
                bpSystolic: parseInt(patient.BP_Systolic) || null,
                glucose: parseInt(patient.Glucose) || null,
                heartRate: parseInt(patient.HeartRate) || null,
                outcome: 'Active',
                admissionDate: new Date().toLocaleDateString(),
                alertHistory: [],
                lastVitalsUpdate: new Date().toISOString()
            });
            importedCount++;
        }
    }
    
    fs.unlinkSync(req.file.path);
    res.json({ success: true, importedCount, totalPatients: MCPContext.patients.length });
});

// Get stats
app.get('/api/mcp/stats', (req, res) => {
    const abnormalCount = MCPContext.patients.filter(p => 
        (p.bpSystolic && p.bpSystolic > 140) || 
        (p.glucose && p.glucose > 140)
    ).length;
    
    res.json({
        totalPatients: MCPContext.patients.length,
        totalAlerts: MCPContext.alertHistory.length,
        emailsSent: MCPContext.emailLog.length,
        activeAlerts: abnormalCount,
        criticalAlerts: MCPContext.alertHistory.filter(a => a.severity === 'critical').length,
        emailConfigured: emailConfigured
    });
});

// Get email log
app.get('/api/mcp/email-log', (req, res) => {
    res.json(MCPContext.emailLog);
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║     🏥 VITAGUARD PRO - MCP-Based Multi-Agent Healthcare System               ║
║                          (Email Alerts Only)                                  ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  📍 MCP Server URL: http://localhost:${PORT}                                    ║
║                                                                               ║
║  📧 Email Service: ${emailConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}                                    ║
║                                                                               ║
║  🤖 AGENT STATUS:                                                            ║
║     • Agent 1 (Monitor):    Simulates vitals → Writes to MCP                 ║
║     • Agent 2 (Diagnosis):  Reads MCP → Clinical analysis                    ║
║     • Agent 3 (Workflow):   Reads analysis → Sends Email alerts              ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  📋 To configure Email:                                                      ║
║     1. Create .env file with:                                               ║
║        EMAIL_USER=your-email@gmail.com                                       ║
║        EMAIL_PASS=your-app-password                                          ║
║     2. Restart server                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);
});