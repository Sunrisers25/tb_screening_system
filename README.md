# 🫁 AI-Powered TB Screening System

> **A Next-Generation Web Application for Tuberculosis Detection using Deep Learning.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8%2B-blue)
![React](https://img.shields.io/badge/react-18-cyan)
![Flask](https://img.shields.io/badge/flask-2.0-green)

## 📖 Overview

The **TB Screening AI** is a robust web application designed to assist healthcare professionals in the early detection of Tuberculosis (TB) from Chest X-Rays.

Powered by a **DenseNet121** deep learning model, the system analyzes uploaded X-ray images to predict the probability of TB infection. It goes beyond simple prediction by providing **Visual Heatmaps (Explainable AI)** and **Automated Medical Reports**, making it a transparent and practical tool for clinical settings.

---

## ✨ Key Features

*   **🧠 Advanced AI Analysis**: Utilizes a pre-trained `DenseNet121` model optimized for medical image classification.
*   **🔍 Visual Explanations (Heatmaps)**: Generates Grad-CAM heatmaps to highlight suspicious regions in the lungs, helping doctors understand *why* a diagnosis was made.
*   **📄 Automated PDF Reporting**: instantly generates downloadable, professional medical reports containing the diagnosis, confidence score, and visual analysis.
*   **📊 Interactive Dashboard**: A modern, responsive React-based dashboard for easy patient screening and history tracking.
*   **💾 Local Database**: Uses **SQLite** for lightweight, zero-config storage of user accounts and screening history logs.
*   **🔒 Secure Auth**: Robust Login/Signup system to secure patient data.

---

## 🏗️ System Architecture

The system follows a modern decoupled architecture:

The system follows a modern decoupled architecture.


### 🔄 System Workflow & Architecture Breakdown

| **Step** | **Component** | **Action** | **Technical Details** |
| :--- | :--- | :--- | :--- |
| 1 | User (Doctor) | Uploads X-Ray | Interacts with the React Dashboard to select and upload a medical image. |
| 2 | Frontend | Sends Request | Triggers a POST request to the /api/predict endpoint with the image payload. |
| 3 | Backend API | Preprocessing | Flask server receives the image, validates the format, and converts it into a numerical Tensor. |
| 4 | AI Engine | Inference | A pre-trained DenseNet121 model analyzes image features to calculate risk probability. |
| 5 | Explainability | Generates Heatmap | Grad-CAM extracts feature maps to visualize the specific regions influencing the AI's decision. |
| 6 | Database | Logging | Prediction results, metadata, and timestamps are stored in a local SQLite database. |
| 7 | Frontend | Display & Report | Dashboard updates with the diagnosis and heatmap; a PDF Report is generated for the patient. |

<br>

| **Layer** | **Technology Stack** | **Role** |
| :--- | :--- | :--- |
| **🎨 Frontend** | **React + Vite + Tailwind** | Responsive UI, state management, and PDF generation. |
| **⚙️ Backend** | **Flask (Python)** | REST API, Business logic, and AI model orchestration. |
| **🧠 AI Model** | **PyTorch + DenseNet121** | Deep learning operations and image classification. |
| **💾 Database** | **SQLite** | Lightweight local storage for user auth and screening logs. |

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
