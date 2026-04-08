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
CORS(app)

os.makedirs('static/reports', exist_ok=True)


# ══════════════════════════════════════════
#  PDF REPORT CLASSES
# ══════════════════════════════════════════

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


# ══════════════════════════════════════════
#  INITIALIZE MODEL & DB
# ══════════════════════════════════════════

print("Loading Model...")
try:
    model = TBModel()
    print("Model Loaded Successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

try:
    db.init_db()
except Exception as e:
    print(f"Error initializing DB: {e}")


# ══════════════════════════════════════════
#  DICOM PROCESSING
# ══════════════════════════════════════════

def process_dicom_file(file_storage):
    """
    Process a DICOM (.dcm) file and return a PIL Image + metadata dict.
    Returns: (pil_image, metadata_dict) or (None, error_string)
    """
    try:
        import pydicom
        from pydicom.pixel_data_handlers.util import apply_voi_lut
    except ImportError:
        return None, "pydicom is not installed. Run: pip install pydicom"

    try:
        # Read the DICOM dataset
        ds = pydicom.dcmread(file_storage)

        # Extract metadata
        metadata = {
            'patient_name': str(getattr(ds, 'PatientName', 'Unknown')),
            'patient_age': str(getattr(ds, 'PatientAge', '')),
            'patient_sex': str(getattr(ds, 'PatientSex', '')),
            'study_date': str(getattr(ds, 'StudyDate', '')),
            'modality': str(getattr(ds, 'Modality', '')),
            'institution': str(getattr(ds, 'InstitutionName', '')),
            'manufacturer': str(getattr(ds, 'Manufacturer', '')),
            'study_description': str(getattr(ds, 'StudyDescription', '')),
        }

        # Format study date
        if metadata['study_date'] and len(metadata['study_date']) == 8:
            try:
                d = metadata['study_date']
                metadata['study_date'] = f"{d[:4]}-{d[4:6]}-{d[6:8]}"
            except Exception:
                pass

        # Get pixel data
        pixel_array = ds.pixel_array.astype(float)

        # Apply VOI LUT (windowing) if available
        try:
            pixel_array = apply_voi_lut(ds.pixel_array, ds).astype(float)
        except Exception:
            pass

        # Handle PhotometricInterpretation
        if getattr(ds, 'PhotometricInterpretation', '') == 'MONOCHROME1':
            pixel_array = pixel_array.max() - pixel_array

        # Normalize to 0-255
        if pixel_array.max() != pixel_array.min():
            pixel_array = ((pixel_array - pixel_array.min()) / (pixel_array.max() - pixel_array.min()) * 255.0)

        pixel_array = pixel_array.astype(np.uint8)

        # Convert to PIL Image (RGB)
        pil_image = Image.fromarray(pixel_array).convert('RGB')

        return pil_image, metadata

    except Exception as e:
        return None, f"DICOM processing error: {str(e)}"


def is_dicom_file(file_storage):
    """Check if a file is DICOM by extension or magic bytes."""
    filename = file_storage.filename or ''
    if filename.lower().endswith('.dcm'):
        return True

    # Check DICOM magic bytes (bytes 128-132 should be 'DICM')
    try:
        current_pos = file_storage.tell()
        file_storage.seek(128)
        magic = file_storage.read(4)
        file_storage.seek(current_pos)
        return magic == b'DICM'
    except Exception:
        return False


# ══════════════════════════════════════════
#  CLINICAL FINDINGS GENERATOR
# ══════════════════════════════════════════

def generate_clinical_findings(probability, heatmap_raw):
    confidence = round(probability * 100, 1)

    if heatmap_raw is None:
        return f"Assessment based on global features. Probability of TB: {confidence}%."

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

    max_intensity = np.max(heatmap_raw)

    if max_intensity > 0.8:
        intensity_str = "High density opacity"
    elif max_intensity > 0.5:
        intensity_str = "Ground-glass opacity"
    else:
        intensity_str = "Faint shadowing"

    if probability > 0.65:
        note = (f"{intensity_str} detected in {extent_str} pattern (approx {int(coverage_ratio*100)}% lung area). "
                f"Findings are consistent with Active Tuberculosis ({confidence}% confidence). "
                "Immediate sputum smear microscopy and clinical correlation recommended.")
    elif probability < 0.35:
        if coverage_ratio > 0.05:
            note = (f"AI detects {extent_str} {intensity_str.lower()}, but overall probability of Tuberculosis is low ({confidence}%). "
                    "Likely non-specific or scarring. Standard routine follow-up recommended.")
        else:
            note = (f"No significant radiologic anomalies detected (Confidence: {100-confidence}%). "
                    "Lungs appear clear. Standard routine check-up recommended.")
    else:
        note = (f"{intensity_str} detected with {extent_str} distribution. "
                f"AI assessment is inconclusive ({confidence}% probability). "
                "This case is marked for priority Radiologist review. "
                "Suggests potential early-stage infection or atypical pulmonary condition.")

    return note


# ══════════════════════════════════════════
#  STATUS ENDPOINT
# ══════════════════════════════════════════

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "running"})


# ══════════════════════════════════════════
#  STATS ENDPOINT
# ══════════════════════════════════════════

@app.route('/api/stats', methods=['GET'])
def stats():
    return jsonify(db.get_stats())


# ══════════════════════════════════════════
#  PREDICTION ENDPOINT (with DICOM support)
# ══════════════════════════════════════════

@app.route('/api/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        dicom_metadata = None

        # ── DICOM Detection ──
        if is_dicom_file(file):
            file.seek(0)
            image, dicom_result = process_dicom_file(file)
            if image is None:
                return jsonify({'error': dicom_result}), 400
            dicom_metadata = dicom_result
        else:
            image = Image.open(file).convert('RGB')

        # Get patient details (from form or DICOM)
        patient_name = request.form.get('patientName', 'Unknown')
        age = request.form.get('age')
        gender = request.form.get('gender')
        patient_id = request.form.get('patientId')

        # If DICOM metadata available, use as fallback
        if dicom_metadata:
            if patient_name == 'Unknown' and dicom_metadata.get('patient_name'):
                patient_name = dicom_metadata['patient_name']
            if not age and dicom_metadata.get('patient_age'):
                age = dicom_metadata['patient_age'].replace('Y', '')
            if not gender and dicom_metadata.get('patient_sex'):
                sex_map = {'M': 'Male', 'F': 'Female', 'O': 'Other'}
                gender = sex_map.get(dicom_metadata['patient_sex'], dicom_metadata['patient_sex'])

        # ── Run AI Model ──
        if model:
            probability, heatmap, heatmap_raw = model.predict(image)
        else:
            probability = 0.5
            heatmap = None
            heatmap_raw = None

        # Handle validation failure from model
        if probability is None:
            return jsonify({'error': heatmap}), 400

        # Generate AI Notes
        notes = generate_clinical_findings(probability, heatmap_raw)

        # Determine risk
        if probability > 0.65:
            risk = "high"
        elif probability < 0.35:
            risk = "low"
        else:
            risk = "uncertain"

        # Save images locally
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

        orig_filename = f"{timestamp_str}_orig.png"
        orig_path = os.path.join("static", "reports", orig_filename)
        image.save(orig_path)

        heatmap_path_str = None
        heatmap_b64 = None

        if heatmap:
            hm_filename = f"{timestamp_str}_heatmap.png"
            hm_path = os.path.join("static", "reports", hm_filename)
            heatmap.save(hm_path)
            heatmap_path_str = f"/static/reports/{hm_filename}"

            buffered = io.BytesIO()
            heatmap.save(buffered, format="PNG")
            heatmap_b64 = import_base64.b64encode(buffered.getvalue()).decode('utf-8')

        # Log result
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
                notes=notes,
                patient_id=int(patient_id) if patient_id else None
            )
        except Exception as e:
            print(f"Logging error: {e}")
            
        user_email = request.form.get('doctor_email', 'unknown')
        db.log_audit(user_email, "Predict X-ray", f"Uploaded and analyzed X-ray for patient '{patient_name}'. Risk: {risk}")

        response_data = {
            'risk': risk,
            'confidence': round(probability * 100, 2),
            'timestamp': datetime.datetime.now().strftime("%I:%M %p"),
            'heatmap': heatmap_b64,
            'notes': notes
        }

        # Include DICOM metadata if available
        if dicom_metadata:
            response_data['dicom_metadata'] = dicom_metadata

        return jsonify(response_data)

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════
#  AUTH ENDPOINTS
# ══════════════════════════════════════════

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    success, result = db.authenticate_user(email, password)

    if success:
        return jsonify({
            'success': True,
            'user': {
                'name': result['username'],
                'email': result['email'],
                'role': result['role']
            }
        })
    else:
        return jsonify({'success': False, 'message': result}), 401


@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    role = data.get('role', 'radiographer')

    if not email or not password or not name:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400

    success, msg = db.create_user(email, password, name, role)

    if success:
        db.log_audit(email, "Sign Up", f"New user signed up as {role}. Pending auto-approval.")
        return jsonify({'success': True, 'message': msg})
    else:
        return jsonify({'success': False, 'message': msg}), 400

# ══════════════════════════════════════════
#  ADMIN & SECURITY ENDPOINTS
# ══════════════════════════════════════════

@app.route('/api/admin/users/pending', methods=['GET'])
def get_pending_users():
    return jsonify(db.get_pending_users())

@app.route('/api/admin/users/approve', methods=['PUT'])
def approve_user():
    data = request.json
    email = data.get('email')
    admin_email = data.get('admin_email', 'system')
    if db.approve_user(email):
        db.log_audit(admin_email, "Approved User", f"Approved user access for {email}")
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Failed to approve user'}), 500

@app.route('/api/admin/users/reject', methods=['PUT'])
def reject_user():
    data = request.json
    email = data.get('email')
    admin_email = data.get('admin_email', 'system')
    if db.reject_user(email):
        db.log_audit(admin_email, "Rejected User", f"Denied registration for {email}")
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Failed to reject user'}), 500

@app.route('/api/audit_logs', methods=['GET'])
def fetch_audit_logs():
    return jsonify(db.get_audit_logs())


# ══════════════════════════════════════════
#  DIGITAL SIGNATURE ENDPOINTS
# ══════════════════════════════════════════

@app.route('/api/auth/signature', methods=['POST'])
def save_signature():
    data = request.json
    email = data.get('email')
    signature = data.get('signature')

    if not email or not signature:
        return jsonify({'success': False, 'message': 'Missing email or signature'}), 400

    success = db.save_signature(email, signature)
    if success:
        return jsonify({'success': True, 'message': 'Signature saved'})
    else:
        return jsonify({'success': False, 'message': 'Failed to save signature'}), 500


@app.route('/api/auth/signature/<email>', methods=['GET'])
def get_signature(email):
    signature, username = db.get_signature(email)
    if signature:
        return jsonify({'success': True, 'signature': signature, 'username': username})
    else:
        return jsonify({'success': False, 'message': 'No signature found'})


# ══════════════════════════════════════════
#  PATIENT ENDPOINTS
# ══════════════════════════════════════════

@app.route('/api/patients', methods=['POST'])
def create_patient():
    data = request.json

    if not data.get('name'):
        return jsonify({'success': False, 'message': 'Patient name is required'}), 400

    success, result = db.create_patient(
        name=data.get('name'),
        age=data.get('age'),
        gender=data.get('gender'),
        contact_phone=data.get('contact_phone'),
        contact_email=data.get('contact_email'),
        medical_history=data.get('medical_history'),
        symptoms=data.get('symptoms')
    )

    if success:
        return jsonify({'success': True, 'patient_id': result})
    else:
        return jsonify({'success': False, 'message': result}), 500


@app.route('/api/patients', methods=['GET'])
def list_patients():
    search = request.args.get('search', None)
    patients = db.get_all_patients(search_query=search)
    return jsonify(patients)


@app.route('/api/patients/<int:patient_id>', methods=['GET'])
def get_patient(patient_id):
    patient = db.get_patient(patient_id)
    if patient:
        return jsonify(patient)
    else:
        return jsonify({'error': 'Patient not found'}), 404


@app.route('/api/patients/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    data = request.json
    success, msg = db.update_patient(patient_id, **data)

    if success:
        return jsonify({'success': True, 'message': msg})
    else:
        return jsonify({'success': False, 'message': msg}), 500


# ══════════════════════════════════════════
#  EXPORT ENDPOINTS
# ══════════════════════════════════════════

@app.route('/api/export_csv', methods=['GET'])
def export_csv():
    try:
        logs = db.get_logs()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Timestamp', 'Patient Name', 'Age', 'Gender', 'Result', 'Probability', 'Notes'])

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

        pdf = SummaryPDF(orientation='L')
        pdf.add_page()
        pdf.set_font("Arial", size=9)

        for log in logs:
            pdf.cell(10, 8, str(log['id']), 1)
            date_str = log['timestamp'].split('T')[0] if 'T' in log['timestamp'] else log['timestamp'][:10]
            pdf.cell(40, 8, date_str, 1)
            name = log.get('patient_name', 'Unknown') or 'Unknown'
            pdf.cell(40, 8, name[:20], 1)
            age = str(log.get('age', ''))
            gender_val = (log.get('gender', '') or '')[:1]
            pdf.cell(20, 8, f"{age}/{gender_val}", 1)
            res = (log.get('result', '') or log.get('risk', '')).upper()
            pdf.cell(25, 8, res, 1)
            conf = f"{int(log['probability']*100)}%"
            pdf.cell(20, 8, conf, 1)
            notes = (log.get('notes', '') or '').replace('\n', ' ')
            pdf.cell(0, 8, notes[:60] + ('...' if len(notes) > 60 else ''), 1, 1)

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


# ══════════════════════════════════════════
#  HISTORY ENDPOINTS
# ══════════════════════════════════════════

@app.route('/api/stats', methods=['GET'])
def get_dashboard_stats():
    stats = db.get_stats()
    return jsonify(stats)

@app.route('/api/stats/chart', methods=['GET'])
def get_chart_stats():
    try:
        conn = db.get_db_connection()
        # Group by date for the last 7 days
        seven_days_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat()
        
        query = '''
            SELECT date(timestamp) as date,
                   COUNT(*) as total,
                   SUM(CASE WHEN risk = 'high' OR final_risk = 'high' THEN 1 ELSE 0 END) as high_risk,
                   SUM(CASE WHEN risk = 'moderate' OR final_risk = 'moderate' THEN 1 ELSE 0 END) as moderate_risk,
                   SUM(CASE WHEN risk = 'low' OR final_risk = 'low' THEN 1 ELSE 0 END) as low_risk
            FROM screenings 
            WHERE timestamp > ?
            GROUP BY date(timestamp)
            ORDER BY date(timestamp) ASC
        '''
        rows = conn.execute(query, (seven_days_ago,)).fetchall()
        conn.close()
        
        result = [dict(row) for row in rows]
        return jsonify(result)
    except Exception as e:
        print(f"Chart Stats Error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/history', methods=['GET'])
def history():
    logs = db.get_logs()
    return jsonify(logs)


@app.route('/api/history/<int:log_id>', methods=['DELETE'])
def delete_history_item(log_id):
    success = db.delete_log(log_id)
    if success:
        user_email = request.args.get('user_email', 'unknown')
        db.log_audit(user_email, "Deleted Report", f"Deleted screening log ID: {log_id}")
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Failed to delete'}), 500


@app.route('/api/history/<int:log_id>/review', methods=['PUT'])
def review_history_item(log_id):
    data = request.json
    review_status = data.get('review_status')
    doctor_notes = data.get('doctor_notes')
    final_risk = data.get('final_risk')
    
    doctor_email = data.get('doctor_email', 'unknown')
    
    if not review_status or not final_risk:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
    success, msg = db.review_screening(log_id, review_status, doctor_notes, final_risk)
    
    if success:
        db.log_audit(doctor_email, "Reviewed Report", f"Dr. {doctor_email} reviewed Log ID: {log_id}. Set risk to {final_risk}.")
        return jsonify({'success': True, 'message': msg})
    else:
        return jsonify({'success': False, 'error': msg}), 500


@app.route('/api/history/<int:log_id>/pdf', methods=['GET'])
def generate_pdf(log_id):
    try:
        conn = db.get_db_connection()
        log = conn.execute('SELECT * FROM screenings WHERE id = ?', (log_id,)).fetchone()
        conn.close()

        if not log:
            return jsonify({'error': 'Report not found'}), 404

        lang = request.args.get('lang', 'en')

        # Translate Dictionary
        translations = {
            'en': {
                'patient_name': 'Patient Name', 'age': 'Age', 'gender': 'Gender', 'date': 'Date',
                'result': 'Result', 'confidence': 'Confidence', 'clinical_notes': 'Clinical Notes:',
                'original_xray': 'Original X-Ray', 'ai_analysis': 'AI Analysis',
                'digitally_signed': 'Digitally Signed by Dr.',
                'disclaimer': 'This report is generated by an AI Screening System. It is not a final medical diagnosis.'
            },
            'hi': {
                'patient_name': 'मरीज का नाम', 'age': 'उम्र', 'gender': 'लिंग', 'date': 'तारीख',
                'result': 'परिणाम', 'confidence': 'आत्मविश्वास', 'clinical_notes': 'क्लिनिकल नोट्स:',
                'original_xray': 'मूल एक्स-रे', 'ai_analysis': 'एआई विश्लेषण',
                'digitally_signed': 'डॉक्टर द्वारा डिजिटल रूप से हस्ताक्षरित',
                'disclaimer': 'यह रिपोर्ट एआई स्क्रीनिंग सिस्टम द्वारा उत्पन्न की गई है। यह अंतिम चिकित्सा निदान नहीं है।'
            },
            'te': {
                'patient_name': 'రోగి పేరు', 'age': 'వయస్సు', 'gender': 'లింగం', 'date': 'తేదీ',
                'result': 'ఫలితం', 'confidence': 'విశ్వాసం', 'clinical_notes': 'క్లినికల్ నోట్స్:',
                'original_xray': 'అసలు ఎక్స్‌రే', 'ai_analysis': 'AI విశ్లేషణ',
                'digitally_signed': 'డిజిటల్‌గా సంతకం చేసిన వారు డా.',
                'disclaimer': 'ఈ నివేదిక AI స్క్లీనింగ్ సిస్టమ్ ద్వారా రూపొందించబడింది. ఇది తుది వైద్య నిర్ధారణ కాదు.'
            },
            'kn': {
                'patient_name': 'ರೋಗಿಯ ಹೆಸರು', 'age': 'ವಯಸ್ಸು', 'gender': 'ಲಿಂಗ', 'date': 'ದಿನಾಂಕ',
                'result': 'ಫಲಿತಾಂಶ', 'confidence': 'ವಿಶ್ವಾಸಾರ್ಹತೆ', 'clinical_notes': 'ಕ್ಲಿನಿಕಲ್ ಟಿಪ್ಪಣಿಗಳು:',
                'original_xray': 'ಮೂಲ ಎಕ್ಸ್-ರೇ', 'ai_analysis': 'AI ವಿಶ್ಲೇಷಣೆ',
                'digitally_signed': 'ಡಿಜಿಟಲ್ ಸಹಿ ಮಾಡಿದವರು ಡಾ.',
                'disclaimer': 'ಈ ವರದಿಯನ್ನು AI ಸ್ಕ್ರೀನಿಂಗ್ ಸಿಸ್ಟಮ್‌ನಿಂದ ರಚಿಸಲಾಗಿದೆ. ಇದು ಅಂತಿಮ ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯವಲ್ಲ.'
            }
        }
        
        t = translations.get(lang, translations['en'])

        pdf = PDFReport()
        pdf.add_page()
        
        # Add fonts based on language
        font_family = "Arial"
        if lang == 'hi':
            pdf.add_font("NotoSansDevanagari", style="", fname="NotoSansDevanagari-Regular.ttf")
            font_family = "NotoSansDevanagari"
        elif lang == 'te':
            pdf.add_font("NotoSansTelugu", style="", fname="NotoSansTelugu-Regular.ttf")
            font_family = "NotoSansTelugu"
        elif lang == 'kn':
            pdf.add_font("NotoSansKannada", style="", fname="NotoSansKannada-Regular.ttf")
            font_family = "NotoSansKannada"
            
        pdf.set_font(font_family, size=12)

        # Patient Details
        pdf.cell(0, 10, f"{t['patient_name']}: {log['patient_name'] or 'Unknown'}", ln=True)
        pdf.cell(0, 10, f"{t['age']}: {log['age'] or 'N/A'}   {t['gender']}: {log['gender'] or 'N/A'}", ln=True)
        pdf.cell(0, 10, f"{t['date']}: {log['timestamp']}", ln=True)

        pdf.ln(5)

        # Result
        # FPDF2 supports 'B' style out of the box for core fonts, but for loaded TTF we'd need a bold TFT.
        # Since we only downloaded regular, we'll stick to regular for Indian languages to avoid errors.
        if font_family == "Arial":
            pdf.set_font("Arial", 'B', 12)
        
        result_text = log.get('final_risk') or log.get('result') or log.get('risk') or ''
        result_text = result_text.upper()
        
        pdf.cell(0, 10, f"{t['result']}: {result_text}", ln=True)
        pdf.cell(0, 10, f"{t['confidence']}: {round(log['probability'] * 100, 2)}%", ln=True)

        pdf.ln(5)

        # Notes
        doc_review_status = log.get('doctor_review_status', 'pending')
        notes_to_show = log.get('doctor_notes') if doc_review_status != 'pending' and log.get('doctor_notes') else log['notes']
        
        if notes_to_show:
            if font_family == "Arial":
                pdf.set_font("Arial", 'B', 12)
            pdf.cell(0, 10, t['clinical_notes'], ln=True)
            pdf.set_font(font_family, '', 12)
            pdf.multi_cell(0, 10, notes_to_show)
            pdf.ln(5)

        # Images
        y_start = pdf.get_y()

        if log['original_path']:
            path = log['original_path'].lstrip('/')
            if os.path.exists(path):
                pdf.image(path, x=10, y=y_start, w=90)
                pdf.text(10, y_start + 95, t['original_xray'])

        if log['heatmap_path']:
            path = log['heatmap_path'].lstrip('/')
            if os.path.exists(path):
                pdf.image(path, x=110, y=y_start, w=90)
                pdf.text(110, y_start + 95, t['ai_analysis'])

        # ── Digital Signature ──
        # Try to find the doctor's signature from the request header or fallback
        doctor_email = request.args.get('doctor_email')
        if doctor_email:
            sig_data, doc_name = db.get_signature(doctor_email)
            if sig_data:
                try:
                    # Decode base64 signature
                    sig_bytes = import_base64.b64decode(sig_data.split(',')[-1])
                    sig_img = io.BytesIO(sig_bytes)

                    sig_y = 240
                    pdf.line(20, sig_y, 100, sig_y)
                    pdf.image(sig_img, x=30, y=sig_y - 20, w=50, h=18)
                    pdf.set_font("Arial", 'I', 10)
                    pdf.text(20, sig_y + 5, f"{t['digitally_signed']} {doc_name}")
                    pdf.text(20, sig_y + 10, f"{t['date']} {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
                except Exception as e:
                    print(f"Signature embedding error: {e}")

        # Disclaimer
        if font_family == "Arial":
            pdf.set_font("Arial", 'I', 8)
        else:
            pdf.set_font(font_family, '', 8)
            
        pdf.set_text_color(120, 120, 120)
        pdf.text(20, 280, t['disclaimer'])
        
        # Log download
        user_email = request.args.get('user_email', 'unknown')
        db.log_audit(user_email, "Exported PDF", f"Generated PDF report for log ID: {log_id} in {lang}")

        # Output
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
