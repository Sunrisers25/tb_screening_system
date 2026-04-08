# 🫁 AI-Powered TB Screening System

> **A Next-Generation Web Application for Tuberculosis Detection using Deep Learning.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8%2B-blue)
![React](https://img.shields.io/badge/react-18-cyan)
![Flask](https://img.shields.io/badge/flask-2.0-green)

## 📖 Overview

The **TB Screening AI** has evolved into a comprehensive, multi-disease chest X-ray diagnostic hub. 

Powered by an ensemble of **DenseNet121 and ResNet50**, the system analyzes uploaded X-ray images to predict the probability of **Tuberculosis, Pneumonia, COVID-19, and Normal** findings simultaneously. It provides dynamic **Grad-CAM visual heatmaps**, automated **multilingual medical reports**, and rigorous **Role-Based Access Control (RBAC)** making it a transparent, secure, and practical tool for clinical settings.

---

## ✨ Key Capabilities

### 🫁 Multi-Disease Medical AI
*   **Ensemble Engine**: Utilizes pre-trained `DenseNet121` and `ResNet50` models optimized for multi-class medical image classification.
*   **Targeted Visual Explanations**: Generates dynamic Grad-CAM heatmaps that automatically target the most likely pathology to highlight suspicious regions in the lungs.
*   **Heuristic Lung Segmentation**: Custom OpenCV masking isolates the lung fields, significantly reducing edge noise and false positive heatmaps.

### 👩‍⚕️ Clinical Workflow & Security
*   **Role-Based Access Control**: Secure login system with distinct privileges for `admin`, `doctor`, `radiographer`, and `patient`.
*   **Admin Approval Gate**: New user registrations remain locked until manually verified by an Administrator.
*   **Immutable Audit Trails**: A secure backend logger tracks every login, report generation, and AI override for HIPAA-ready compliance.
*   **Doctor "Human-in-the-Loop" Review**: Doctors can review AI findings, override risk levels, input clinical notes, and electronically "sign" the diagnosis.

### 🚀 Analytics & Reporting
*   **Multilingual PDF Reports**: Instantly generates downloadable, professional medical reports in **English, Hindi, Telugu, and Kannada**.
*   **Longitudinal History**: Compare the Patient's Latest and Previous X-rays side-by-side to track treatment progression over months.
*   **Radar Chart Analysis**: A visual dashboard spider chart displaying the percentage breakdown of all 4 disease probabilities.
*   **Hospital Analytics Dashboard**: 7-day trend aggregations helping clinical managers track screening volumes and risk distribution.

---

## 🏗️ System Architecture

### 🔄 System Workflow & Architecture Breakdown

| **Layer** | **Technology Stack** | **Role** |
| :--- | :--- | :--- |
| **🎨 Frontend** | **React + Vite + Tailwind + Recharts** | Modern glassmorphism UI, interactive data visualizations, and client-side routing. |
| **⚙️ Backend** | **Flask (Python) + fpdf2** | REST API, RBAC validation, audit logging, and multilingual PDF typography orchestration. |
| **🧠 AI Model** | **PyTorch (DenseNet + ResNet)** | Deep learning multi-disease classification and Grad-CAM backpropagation. |
| **💾 Database** | **SQLite** | Local relational storage handling schemas for credentials, screening logic, and JSON disease probabilities. |

---

## 🚀 Getting Started

### Prerequisites
*   **Python 3.8+**
*   **Node.js 16+**

### ⚡ Quick Start (Windows)

We have provided a convenient script to launch both the Backend and Frontend with a single command:

```powershell
.\run_app.ps1
```
*(If you encounter a permission error, try: `powershell -ExecutionPolicy Bypass -File .\run_app.ps1`)*

### 🛠️ Manual Installation

If you prefer to run services manually:

#### 1. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the Flask Server
python backend.py
# Server runs on: http://localhost:5000
```

#### 2. Frontend Setup
```bash
cd frontend_lovable/vitri-scan-ui-main

# Install Node dependencies
npm install

# Start the React App
npm run dev
# App runs on: http://localhost:8080
```

---

## 📚 API Documentation

The Backend exposes the following RESTful endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Check if the backend is running. |
| `POST` | `/api/predict` | Upload an image file for TB analysis. Returns JSON with risk, confidence, and heatmap. |
| `POST` | `/api/auth/login` | Authenticate a user. |
| `POST` | `/api/auth/signup` | Register a new user. |

---

## 📂 Project Structure

```
tb_screening_system/
├── backend.py              # Main Flask Application
├── model.py                # AI Model Logic & Grad-CAM Implementation
├── database.py             # Supabase Connection & Helper Functions
├── requirements.txt        # Python Dependencies
├── run_app.ps1             # One-click startup script
└── frontend_lovable/       # Frontend Application Code
    └── vitri-scan-ui-main/
        ├── src/
        │   ├── components/ # Reusable UI Components (ScoreCard, Charts)
        │   └── pages/      # Application Pages (Dashboard, Login)
        └── package.json    # Frontend Dependencies
```

---

## 🛡️ License

This project is open-source and available under the [MIT License](LICENSE).
