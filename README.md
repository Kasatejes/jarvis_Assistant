# ⚡ J.A.R.V.I.S. - Core System AI Assistant

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203-F55036?style=for-the-badge)](https://groq.com/)
[![Three.js](https://img.shields.io/badge/3D-Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://microsoft.com/windows)

An Iron Man-inspired, futuristic desktop AI assistant featuring a holographic cybernetic HUD, ultra-low latency voice duplex powered by **Groq**, native **Windows Win32 system automation**, generative **3D holographic modeling**, and **optical computer vision**.

---

## 🌟 Key Features

### 🎙️ 1. Voice Intelligence & Audio Duplex
- **Groq LLM Acceleration**: Lightning-fast conversational responses under 500ms using Groq's high-speed inference engine.
- **Audio Duplex & Voice Commands**: Continuous listening, intelligent command routing, and interactive speech confirmation.
- **Tool Calling System**: Executes complex system tasks directly from natural language.

### 💻 2. Native Windows Automation Core
- **Application Control**: Open any system application, website, or utility via voice or text (`"Open Chrome"`, `"Launch Spotify"`).
- **Safe Browser Tab Management**: Closes active or target tabs (`"Close YouTube"`, `"Close all tabs"`) using physical Win32 keyboard scan codes while strictly preserving the J.A.R.V.I.S. Core System.
- **CoreAudio Volume Adjustment**: Real-time master volume level control, mute, and unmute via native Windows audio endpoints.
- **Process & Terminal Execution**: Execute background shell commands and automated system queries.

### 🧊 3. 3D Holographic Viewport & AI CAD Synthesis
- **Generative 3D Modeling**: Uses Groq as a 3D CAD architect to procedurally synthesize complex 3D blueprints and volumetric primitives.
- **Interactive Three.js Hologram Canvas**: 360° orbital rotation, metallic shader effects, holographic pedestal grid, and sci-fi glowing particle fields.
- **Local Model Library**: Load and inspect predefined and synthesized models (`dinosaur`, `car`, `guitar`, `aircraft`, `duck`, etc.).

### 👁️ 4. Optical Scanner & Screen Vision
- **Computer Vision & OCR**: Instant full-desktop screenshot capture and optical character recognition (`ocr_scanner.ps1`).
- **Visual Intelligence**: Inspect and summarize on-screen content, code, documents, and active windows.

### 📊 5. Real-Time Telemetry & Tactical HUD
- **Hardware Diagnostics**: Live monitoring of CPU load, RAM allocation, thread counts, and system uptime.
- **Tactical Chrono & Atmosphere**: Live regional weather reporting, barometric pressure, wind speed, and animated sci-fi audio visualizers.
- **Draggable & Dockable Widgets**: Fully customizable HUD layout with dynamic cybernetic widgets.

### 🎵 6. Media Hub
- **Playback Control**: Spotify and YouTube media status detection, playback toggling, track skipping, and status telemetry.

---

## 🏗️ Project Architecture

```
J.A.R.V.I.S/
├── backend/
│   ├── server.js              # Express API & Tool-Calling Engine
│   ├── ai3dSynthesizer.js     # Generative 3D CAD synthesis engine
│   ├── knowledgeEngine.js    # Local memory & factual knowledge base
│   ├── mathEngine.js         # Computational math & reasoning agent
│   ├── reminderEngine.js     # Scheduled reminders & protocol alerts
│   ├── close_tab.ps1         # Win32 desktop API tab closing automation
│   ├── volume_control.ps1    # Windows CoreAudio volume integration
│   ├── ocr_scanner.ps1       # Optical screen scanner & text extraction
│   └── package.json          # Backend dependencies (Groq SDK, Express, etc.)
│
├── frontend/
│   ├── public/               # Static assets & index.html
│   └── src/
│       ├── components/       # HUD widgets, 3D Viewport, Vision Modals
│       ├── utils/            # Audio effects & SFX engine
│       ├── App.js            # Main HUD layout & command orchestrator
│       └── package.json      # Frontend dependencies (React, Three.js, Lucide)
│
├── start-all.bat             # One-click launcher for backend & frontend
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Operating System**: Windows 10 or Windows 11 (recommended for Win32 automation)
- **Node.js**: v18.0.0 or higher
- **Groq API Key**: Free API key from [console.groq.com](https://console.groq.com/)

---

### Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Kasatejes/jarvis_Assistant.git
cd jarvis_Assistant
```

#### 2. Configure Backend Environment
Navigate to the `backend` folder and create your `.env` file:
```bash
cd backend
```
Create a file named `.env` and add your Groq API key:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
PORT=5000
```

#### 3. Install Dependencies
Install dependencies for both backend and frontend:

```bash
# In backend/ directory:
npm install

# In frontend/ directory:
cd ../frontend
npm install
```

---

## ⚡ Running J.A.R.V.I.S.

### Option A: One-Click Launch (Recommended)
Double-click **`start-all.bat`** in the root project folder, or run:
```cmd
start-all.bat
```
This automatically boots both the backend API server on port `5000` and the React cybernetic HUD on `http://localhost:3000`.

### Option B: Manual Launch
Open two terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
node server.js
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

Open [http://localhost:3000](http://localhost:3000) in Google Chrome or Microsoft Edge to enter the J.A.R.V.I.S. interface.

---

## 🗣️ Example Voice / Text Commands

| Command | Action Performed |
| :--- | :--- |
| `"Open YouTube and search for Lo-Fi"` | Launches browser to YouTube with query |
| `"Close all tabs"` | Safely closes browsing tabs while keeping J.A.R.V.I.S. online |
| `"Set volume to 40%"` | Adjusts master system audio level via CoreAudio |
| `"Mute system audio"` | Instantly toggles system mute |
| `"Generate a 3D supercar"` | Synthesizes and renders 3D model in the Holo Viewport |
| `"Scan my screen"` | Captures screen, runs OCR, and analyzes active content |
| `"What is my system load?"` | Reports current CPU, RAM, and hardware telemetry |
| `"Solve 45 * 18 / 3"` | Solves mathematical expressions via Math Agent |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Three.js, Lucide Icons, Vanilla CSS Glassmorphism
- **Backend**: Node.js, Express, Groq Cloud SDK (`groq-sdk`)
- **System Automation**: Windows PowerShell (Win32 User32 Desktop API, CoreAudio Endpoint API)
- **Computer Vision**: Windows Screen Capture & Tesseract/PowerShell OCR pipeline

---

## 📄 License

This project is created by [Kasatejes](https://github.com/Kasatejes) for educational and personal AI assistant development.
All rights reserved.
