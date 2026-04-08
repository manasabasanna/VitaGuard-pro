🏥 VitaGuard Pro
📌 Overview

VitaGuard Pro is a Multi-Agent Healthcare System built on the Model Context Protocol (MCP). Three AI agents work together with shared memory to monitor patients, detect health risks, and send automated email alerts.🤖 The 3 Agents
Agent	Name	Role	What It Does
Agent 1	Monitor	Data Collector	Simulates patient vitals (BP, Heart Rate, Glucose) and writes to MCP shared memory
Agent 2	Diagnosis	Clinical Analyst	Reads vitals from MCP, detects anomalies using ACC/AHA & ADA medical guidelines, provides diagnosis with confidence score
Agent 3	Workflow	Alert Executor	Reads analysis from MCP, sends professional HTML email alerts to patients✨ Features

    📥 CSV Bulk Import - Upload multiple patients at once

    ➕ Add Individual Patient - Register patients manually

    🔍 Search Patients - By name, ID, or state

    📡 Simulate Vitals - Generate realistic clinical data

    🧠 AI Clinical Analysis - Evidence-based diagnosis (ACC/AHA, ADA guidelines)

    📧 Email Alerts - Send professional HTML emails to patients

    📊 Real-time Dashboard - View patient data and alert history

    📝 MCP Event Log - Complete audit trail of all agent actions🛠️ Tech Stack
Layer	Technology
Frontend	HTML5, CSS3, JavaScript, Chart.js
Backend	Node.js, Express.js
Email Service	Nodemailer (Gmail SMTP)
File Upload	Multer
Architecture	MCP (Model Context Protocol)
Email Credentials	Gmail App Password
