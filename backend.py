from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from model import TBModel
from PIL import Image
import database as db
import io
import datetime
import base64 as import_base64
from fpdf import FPDF
import os
import numpy as np
import csv

app = Flask(__name__, static_folder='static')
# Allow CORS for all domains for development ease
CORS(app)

# Ensure static/reports exists
os.makedirs('static/reports', exist_ok=True)

class PDFReport(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'TB Screening Report', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

class SummaryPDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 14)
        self.cell(0, 10, 'TB Screening Summary Log', 0, 1, 'C')
        self.set_font('Arial', '', 10)
        self.cell(0, 5, f'Generated on: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}', 0, 1, 'C')
        self.ln(5)
        
        # Table Header
        self.set_font('Arial', 'B', 10)
        self.set_fill_color(200, 220, 255)
        self.cell(10, 8, 'ID', 1, 0, 'C', 1)
        self.cell(40, 8, 'Date', 1, 0, 'C', 1)
        self.cell(40, 8, 'Patient Name', 1, 0, 'C', 1)
        self.cell(20, 8, 'Age/Sex', 1, 0, 'C', 1)
        self.cell(25, 8, 'Result', 1, 0, 'C', 1)
        self.cell(20, 8, 'Conf %', 1, 0, 'C', 1)
        self.cell(0, 8, 'Notes', 1, 1, 'C', 1)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

# Initialize Model
print("Loading Model...")
try:
    model = TBModel()
    print("Model Loaded Successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Initialize Database
try:
    db.init_db()
except Exception as e:
    print(f"Error initializing DB: {e}")

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "running"})

def generate_clinical_findings(probability, heatmap_raw):
    """
    Generates a clinical note based on TB probability and heatmap statistics.
    """
    confidence = round(probability * 100, 1)
    
    if heatmap_raw is None:
        return f"Assessment based on global features. Probability of TB: {confidence}%."

    # Threshold for "active" region
    threshold = 0.4
    active_pixels = np.sum(heatmap_raw > threshold)
    total_pixels = heatmap_raw.size
    coverage_ratio = active_pixels / total_pixels
    
    if coverage_ratio > 0.20:
        extent_str = "extensive/diffuse"
    elif coverage_ratio > 0.05:
        extent_str = "moderate spread"
    else:
        extent_str = "focal/localized"
        
    # 2. Analyze Intensity
    max_intensity = np.max(heatmap_raw)
    
    if max_intensity > 0.8:
        intensity_str = "High density opacity"
    elif max_intensity > 0.5:
        intensity_str = "Ground-glass opacity"
    else:
        intensity_str = "Faint shadowing"
        
    # 3. Construct Narrative
    if probability > 0.6: # High Risk
        note = (f"{intensity_str} detected in {extent_str} pattern (approx {int(coverage_ratio*100)}% lung area). "
                f"Findings are consistent with Active Tuberculosis ({confidence}% confidence). "
                "Immediate sputum smear microscopy and clinical correlation recommended.")
                
    elif probability < 0.3: # Low Risk
        if coverage_ratio > 0.05:
            # Low prob but some heatmap activity?
            note = (f"AI detects {extent_str} {intensity_str.lower()}, but overall probability of Tuberculosis is low ({confidence}%). "
                    "Likely non-specific or scarring. Standard routine follow-up recommended.")
        else:
            note = (f"No significant radiologic anomalies detected (Confidence: {100-confidence}%). "
                    "Lungs appear clear. Standard routine check-up recommended.")
            
    else: # Moderate
        note = (f"{intensity_str} detected with {extent_str} distribution. "
                f"AI assessment is indeterminate ({confidence}% probability). "
                "Suggests potential early-stage infection or other pulmonary condition. "
                "Radiologist review and follow-up X-ray recommended.")
                
    return note

@app.route('/api/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # Process image
        image = Image.open(file).convert('RGB')
        
        # Get patient details
        patient_name = request.form.get('patientName', 'Unknown')
        age = request.form.get('age')
        gender = request.form.get('gender')
        
        if model:
            # Unpack 3 values
            probability, heatmap, heatmap_raw = model.predict(image)
        else:
            # Fallback if model failed to load
            probability = 0.5 
            heatmap = None
            heatmap_raw = None
        
        # Generate AI Notes
        notes = generate_clinical_findings(probability, heatmap_raw)

        # Determine logical risk
        if probability > 0.6: 
            risk = "high"
        elif probability < 0.30: 
            risk = "low"
        else: 
            risk = "moderate"
            
        # Save images locally
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save Original
        orig_filename = f"{timestamp_str}_orig.png"
        orig_path = os.path.join("static", "reports", orig_filename)
        image.save(orig_path)
        
        # Save Heatmap
        heatmap_path_str = None
        heatmap_b64 = None
        
        if heatmap:
            # Save to file
            hm_filename = f"{timestamp_str}_heatmap.png"
            hm_path = os.path.join("static", "reports", hm_filename)
            heatmap.save(hm_path)
            heatmap_path_str = f"/static/reports/{hm_filename}"
            
            # Also encode for immediate response
            buffered = io.BytesIO()
            heatmap.save(buffered, format="PNG")
            heatmap_b64 = import_base64.b64encode(buffered.getvalue()).decode('utf-8')

        # Log result with paths
        try:
            db.log_result(
                filename=file.filename, 
                probability=probability, 
                result=risk, 
                original_path=f"/static/reports/{orig_filename}",
                heatmap_path=heatmap_path_str,
                patient_name=patient_name,
                age=age,
                gender=gender,
                notes=notes
            )
        except Exception as e:
            print(f"Logging error: {e}")

        return jsonify({
            'risk': risk,
            'confidence': round(probability * 100, 2),
            'timestamp': datetime.datetime.now().strftime("%I:%M %p"),
            'heatmap': heatmap_b64,
            'notes': notes
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    success, username = db.authenticate_user(email, password)
    
    if success:
        return jsonify({
            'success': True,
            'user': {
                'name': username,
                'email': email
            }
        })
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if not email or not password or not name:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
        
    success, msg = db.create_user(email, password, name)
    
    if success:
        return jsonify({'success': True, 'message': msg})
    else:
        return jsonify({'success': False, 'message': msg}), 400

@app.route('/api/export_csv', methods=['GET'])
def export_csv():
    try:
        logs = db.get_logs() # returns list of dicts
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['ID', 'Timestamp', 'Patient Name', 'Age', 'Gender', 'Result', 'Probability', 'Notes'])
        
        # Rows
        for log in logs:
            writer.writerow([
                log['id'],
                log['timestamp'],
                log.get('patient_name', ''),
                log.get('age', ''),
                log.get('gender', ''),
                log.get('result', '') or log.get('risk', ''),
                log['probability'],
                log.get('notes', '')
            ])
            
        output.seek(0)
        
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f"screening_log_{datetime.datetime.now().strftime('%Y%m%d')}.csv"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export_pdf_summary', methods=['GET'])
def export_pdf_summary():
    try:
        logs = db.get_logs()
        
        pdf = SummaryPDF(orientation='L') # Landscape for better table fit
        pdf.add_page()
        pdf.set_font("Arial", size=9)
        
        for log in logs:
            # ID
            pdf.cell(10, 8, str(log['id']), 1)
            
            # Date (shorten it)
            date_str = log['timestamp'].split('T')[0] if 'T' in log['timestamp'] else log['timestamp'][:10] 
            pdf.cell(40, 8, date_str, 1)
            
            # Name (truncate if too long)
            name = log.get('patient_name', 'Unknown') or 'Unknown'
            pdf.cell(40, 8, name[:20], 1)
            
            # Age/Sex
            age = str(log.get('age', ''))
            gender = (log.get('gender', '') or '')[:1] # M/F
            pdf.cell(20, 8, f"{age}/{gender}", 1)
            
            # Result
            res = (log.get('result', '') or log.get('risk', '')).upper()
            pdf.cell(25, 8, res, 1)
            
            # Conf
            conf = f"{int(log['probability']*100)}%"
            pdf.cell(20, 8, conf, 1)
            
            # Notes (Truncate)
            notes = (log.get('notes', '') or '').replace('\n', ' ')
            pdf.cell(0, 8, notes[:60] + ('...' if len(notes)>60 else ''), 1, 1)
            
        buffer = io.BytesIO(pdf.output(dest='S').encode('latin-1'))
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"summary_report_{datetime.datetime.now().strftime('%Y%m%d')}.pdf",
            mimetype='application/pdf'
        )
            
    except Exception as e:
        print(f"PDF Summary Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def history():
    logs = db.get_logs()
    return jsonify(logs)

@app.route('/api/history/<int:log_id>', methods=['DELETE'])
def delete_history_item(log_id):
    success = db.delete_log(log_id)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Failed to delete'}), 500

@app.route('/api/history/<int:log_id>/pdf', methods=['GET'])
def generate_pdf(log_id):
    try:
        conn = db.get_db_connection()
        log = conn.execute('SELECT * FROM screenings WHERE id = ?', (log_id,)).fetchone()
        conn.close()
        
        if not log:
            return jsonify({'error': 'Report not found'}), 404
            
        pdf = PDFReport()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        
        # Patient Details
        pdf.cell(0, 10, f"Patient Name: {log['patient_name'] or 'Unknown'}", ln=True)
        pdf.cell(0, 10, f"Age: {log['age'] or 'N/A'}   Gender: {log['gender'] or 'N/A'}", ln=True)
        pdf.cell(0, 10, f"Date: {log['timestamp']}", ln=True)
        pdf.ln(5)
        
        # Result
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, f"Result: {log['result'].upper() if 'result' in log.keys() else log['risk'].upper()}", ln=True) # handle schema diff
        pdf.cell(0, 10, f"Confidence: {round(log['probability'] * 100, 2)}%", ln=True)
        pdf.ln(5)
        
        # Notes
        if log['notes']:
            pdf.set_font("Arial", 'B', 12)
            pdf.cell(0, 10, "Clinical Notes:", ln=True)
            pdf.set_font("Arial", '', 12)
            pdf.multi_cell(0, 10, log['notes'])
            pdf.ln(5)
        
        # Images
        # Note: current directory is where app runs (root)
        # log paths are like /static/reports/...
        # we need relative path from root, which is static/reports/... (remove leading /)
        
        y_start = pdf.get_y()
        
        if log['original_path']:
            path = log['original_path'].lstrip('/')
            if os.path.exists(path):
                pdf.image(path, x=10, y=y_start, w=90)
                pdf.text(10, y_start + 95, "Original X-Ray")
        
        if log['heatmap_path']:
            path = log['heatmap_path'].lstrip('/')
            if os.path.exists(path):
                pdf.image(path, x=110, y=y_start, w=90)
                pdf.text(110, y_start + 95, "AI Analysis")
                
        # Output
        # Return as downloadable file
        # Using string output and converting to bytes
        pdf_bytes = pdf.output(dest='S').encode('latin-1')
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"report_{log_id}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"PDF Gen Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
