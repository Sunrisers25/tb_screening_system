import streamlit as st
from PIL import Image
import time
import torch
from model import TBModel
import database as db

# Page Configuration
st.set_page_config(
    page_title="AI TB Screening System",
    page_icon="🫁",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Initialize Database (Silent)
try:
    db.init_db()
except Exception as e:
    print(f"DB Init Error: {e}")

# --- Custom CSS for Premium UI ---
st.markdown("""
<style>
    /* Global Font */
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    /* Main Background */
    .main {
        background-color: #f8f9fa;
    }
    
    /* Header Gradient */
    .header-container {
        background: linear-gradient(135deg, #0d47a1 0%, #42a5f5 100%);
        padding: 2rem;
        border-radius: 15px;
        color: white;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        text-align: center;
    }
    
    .header-title {
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0;
    }
    
    .header-subtitle {
        font-size: 1.1rem;
        opacity: 0.9;
        margin-top: 0.5rem;
    }

    /* Metric Cards */
    div[data-testid="stMetric"] {
        background-color: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        border: 1px solid #e0e0e0;
        text-align: center;
    }
    
    /* Buttons */
    .stButton>button {
        width: 100%;
        border-radius: 8px;
        font-weight: 600;
        height: 3em;
        transition: all 0.3s ease;
    }
    
    /* Primary Action Button (Blue) */
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    /* Success/Error Messages */
    .stAlert {
        border-radius: 8px;
    }
    
    /* Sidebar styling */
    section[data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #e0e0e0;
    }
    
</style>
""", unsafe_allow_html=True)

@st.cache_resource
def load_inference_model():
    """Lazily load the model to avoid reloading on every interaction."""
    return TBModel()

def render_login_page():
    # Centered Layout for Login with styling
    col1, col2, col3 = st.columns([1, 1.5, 1])
    
    with col2:
        st.markdown("""
        <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4rem;">🫁</div>
            <h1 style="color: #0d47a1;">TB Screening AI</h1>
            <p style="color: #666;">Secure Login Portal</p>
        </div>
        """, unsafe_allow_html=True)

        tab1, tab2 = st.tabs(["🔐 Login", "📝 Sign Up"])

        with tab1:
            with st.form("login_form"):
                identifier = st.text_input("Username or Email", placeholder="Enter username or email")
                password = st.text_input("Password", type="password")
                submitted = st.form_submit_button("Sign In", type="primary")
                
                if submitted:
                    success, username = db.authenticate_user(identifier, password)
                    if success:
                        st.session_state['is_logged_in'] = True
                        st.session_state['user_email'] = identifier
                        st.session_state['user_name'] = username
                        # Save session locally
                        db.save_local_session(username)
                        st.toast("Login successful!")
                        time.sleep(0.5)
                        st.rerun()
                    else:
                        st.error("Invalid credentials. Please try again.")

        with tab2:
            with st.form("signup_form"):
                new_username = st.text_input("Username", placeholder="e.g., DoctorSmith")
                new_email = st.text_input("Email", placeholder="new@example.com")
                new_pass = st.text_input("Password", type="password")
                confirm_pass = st.text_input("Confirm Password", type="password")
                submitted = st.form_submit_button("Create Account")
                
                if submitted:
                    if new_pass != confirm_pass:
                        st.error("Passwords do not match!")
                    elif len(new_pass) < 6:
                        st.error("Password must be at least 6 characters.")
                    elif not new_username:
                        st.error("Username is required.")
                    else:
                        success, msg = db.create_user(new_email, new_pass, new_username)
                        if success:
                            st.success(msg)
                            st.info("Please switch to the Login tab to sign in.")
                        else:
                            st.error(msg)

# Page Configuration (Already set at top)

# ... (imports and CSS remain same, skipping to render_main_app)

def render_main_app():
    # Top Bar (User Profile & Logout)
    top_col1, top_col2 = st.columns([6, 1])
    
    with top_col1:
        if 'user_name' in st.session_state:
            st.markdown(f"#### 👋 Welcome, **{st.session_state['user_name']}**")
    
    with top_col2:
        if st.button("Logout", type="secondary", key="logout_btn"):
            st.session_state['is_logged_in'] = False
            if 'user_email' in st.session_state: del st.session_state['user_email'] 
            if 'user_name' in st.session_state: del st.session_state['user_name']
            # Clear local session
            db.clear_local_session()
            st.rerun()

    # Main Header
    st.markdown("""
    <div class="header-container">
        <div class="header-title">Tuberculosis Screening System</div>
        <div class="header-subtitle">AI-Assisted Rapid Triage & Diagnostics</div>
    </div>
    """, unsafe_allow_html=True)

    # Instructions Expander
    with st.expander("ℹ️  How to use this tool"):
        st.info("""
        1. **Upload** a digital chest X-ray image (JPG/PNG).
        2. Click **Run Analysis**.
        3. Review the **Probability Score** and **Risk Assessment**.
        """)

    # Load Model (Cached)
    with st.spinner("Initializing AI Engine..."):
        try:
            model = load_inference_model()
        except Exception as e:
            st.error(f"Failed to load model: {e}")
            return

    # File Uploader Section
    uploaded_file = st.file_uploader("", type=["jpg", "jpeg", "png"], help="Upload Chest X-Ray")

    if uploaded_file:
        col1, col2 = st.columns([1, 1], gap="large")
        
        try:
            image = Image.open(uploaded_file).convert('RGB')
        except:
            st.error("Invalid image file.")
            return

        with col1:
            st.markdown("### 🖼️ Patient X-Ray")
            st.image(image, caption="Uploaded Scan", use_container_width=True)
            
            # Analysis Button
            st.markdown("---")
            analyze = st.button("🔍 Run Analysis", type="primary")

        if analyze:
            with col2:
                st.markdown("### 📊 Analysis Results")
                
                with st.spinner("Analyzing patterns..."):
                    time.sleep(1.0) # UX delay
                    probability, heatmap_overlay = model.predict(image)

                if probability is not None:
                    confidence_percent = probability * 100
                    
                    # Risk Logic
                    if probability > 0.6:
                        result_str = "High Risk"
                        color = "red"
                        icon = "🔴"
                        msg = "HIGH RISK (TB POSITIVE)"
                    elif probability < 0.3:
                        result_str = "Low Risk"
                        color = "green"
                        icon = "🟢"
                        msg = "LOW RISK (NORMAL)"
                    else:
                        result_str = "Moderate Risk"
                        color = "orange"
                        icon = "🟠"
                        msg = "MODERATE RISK (UNCERTAIN)"
                    
                    # Log (Silent)
                    try:
                        db.log_result(uploaded_file.name, probability, result_str)
                    except:
                        pass
                    
                    # Result Alert
                    if color == "red":
                        st.error(f"{icon} **{msg}**")
                    elif color == "green":
                        st.success(f"{icon} **{msg}**")
                    else:
                        st.warning(f"{icon} **{msg}**")

                    # Metrics Row
                    m_col1, m_col2 = st.columns(2)
                    with m_col1:
                        st.metric("Confidence Score", f"{confidence_percent:.2f}%")
                    with m_col2:
                        st.metric("Risk Assessment", result_str)

                    st.markdown("---")
                    
                    # Heatmap
                    if heatmap_overlay is not None:
                        st.markdown("### 🧠 Visual Explanation")
                        st.caption("Heatmap highlights areas of concern")
                        st.image(heatmap_overlay, use_container_width=True)
                else:
                    st.error("Analysis Failed. Please check image.")
    else:
        # Empty State
        st.markdown("""
        <div style="text-align: center; padding: 3rem; color: #888; border: 2px dashed #ddd; border-radius: 10px;">
            <h3>👆 Upload an X-Ray to Begin</h3>
            <p>Supported formats: JPG, PNG</p>
        </div>
        """, unsafe_allow_html=True)

def main():
    # Session Persistence Check
    if 'is_logged_in' not in st.session_state:
        st.session_state['is_logged_in'] = False
        
        # Try to load local session
        valid, username = db.load_local_session()
        if valid:
            st.session_state['is_logged_in'] = True
            st.session_state['user_name'] = username
            st.toast(f"Welcome back, {username}!")

    if not st.session_state['is_logged_in']:
        render_login_page()
    else:
        render_main_app()

if __name__ == "__main__":
    main()
