# Abstract

**Project Title:** AI-Powered Tuberculosis Screening System with Explainable Diagnostics

**Overview**
Tuberculosis (TB) remains one of the top 10 causes of death worldwide, with early detection being the most critical factor in successful treatment. However, in many resource-constrained regions, access to expert radiologists is limited, leading to diagnostic delays. This project presents a novel, web-based Artificial Intelligence system designed to automate the screening of Chest X-rays (CXRs) for signs of Tuberculosis, serving as a reliable clinical decision support tool for healthcare professionals.

**Methodology**
The core of the system is built upon a Deep Learning architecture utilizing the **DenseNet121** Convolutional Neural Network (CNN). The model was pre-trained on the ImageNet dataset and fine-tuned on medical X-ray imagery to identify pathological features associated with TB. The application architecture follows a modern decoupled approach, featuring a **Flask (Python)** backend for inference and API management, and a **React.js** frontend for a responsive user interface. Data persistence, including user authentication and screening logs, is managed via a cloud-based **Supabase (PostgreSQL)** database.

**Key Innovations**
Unlike traditional "black-box" AI systems, this solution prioritizes transparency through **Explainable AI (XAI)**. It integrates **Grad-CAM (Gradient-weighted Class Activation Mapping)** technology to generate visual heatmaps, which are overlaid on the original X-rays. These heatmaps highlight the specific regions of the lung that influenced the AI’s prediction, allowing doctors to verify the diagnosis visually rather than blindly trusting the algorithm. Additionally, the system includes an automated reporting module that generates downloadable, professional PDF medical reports containing the diagnosis, confidence score, and visual analysis.

**Conclusion**
The developed system demonstrates high accuracy in distinguishing between normal and TB-infected lungs. By combining state-of-the-art Deep Learning with intuitive visualization tools and seamless workflow integration, this project offers a scalable, low-cost solution to bridge the gap in radiological expertise and improve TB screening efficiency in healthcare facilities globally.
