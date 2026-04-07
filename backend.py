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

    if probability > 0.6:
        note = (f"{intensity_str} detected in {extent_str} pattern (approx {int(coverage_ratio*100)}% lung area). "
                f"Findings are consistent with Active Tuberculosis ({confidence}% confidence). "
                "Immediate sputum smear microscopy and clinical correlation recommended.")
    elif probability < 0.3:
        if coverage_ratio > 0.05:
            note = (f"AI detects {extent_str} {intensity_str.lower()}, but overall probability of Tuberculosis is low ({confidence}%). "
                    "Likely non-specific or scarring. Standard routine follow-up recommended.")
        else:
            note = (f"No significant radiologic anomalies detected (Confidence: {100-confidence}%). "
                    "Lungs appear clear. Standard routine check-up recommended.")
    else:
        note = (f"{intensity_str} detected with {extent_str} distribution. "
                f"AI assessment is indeterminate ({confidence}% probability). "
                "Suggests potential early-stage infection or other pulmonary condition. "
                "Radiologist review and follow-up X-ray recommended.")

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
        if probability > 0.6:
            risk = "high"
        elif probability < 0.30:
            risk = "low"
        else:
            risk = "moderate"

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
        result_text = log['result'].upper() if 'result' in log.keys() else log['risk'].upper()
        pdf.cell(0, 10, f"Result: {result_text}", ln=True)
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
                    pdf.text(20, sig_y + 5, f"Digitally Signed by Dr. {doc_name}")
                    pdf.text(20, sig_y + 10, f"Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
                except Exception as e:
                    print(f"Signature embedding error: {e}")

        # Disclaimer
        pdf.set_font("Arial", 'I', 8)
        pdf.set_text_color(120, 120, 120)
        pdf.text(20, 280, "This report is generated by an AI Screening System. It is not a final medical diagnosis.")

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
