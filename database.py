import sqlite3
import os
import datetime
import json

DB_FILE = "tb_screening_logs.db"
SESSION_FILE = "session.json"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # ── Patients Table ──
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                age INTEGER,
                gender TEXT,
                contact_phone TEXT,
                contact_email TEXT,
                medical_history TEXT,
                symptoms TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')

        # ── Screenings Table ──
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS screenings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                risk TEXT NOT NULL,
                probability REAL NOT NULL,
                timestamp TEXT NOT NULL,
                original_path TEXT,
                heatmap_path TEXT,
                patient_name TEXT,
                age INTEGER,
                gender TEXT,
                notes TEXT,
                patient_id INTEGER,
                FOREIGN KEY (patient_id) REFERENCES patients(id)
            )
        ''')

        # ── Auto-migration for screenings ──
        cursor.execute("PRAGMA table_info(screenings)")
        columns = [info[1] for info in cursor.fetchall()]

        if 'patient_name' not in columns:
            cursor.execute("ALTER TABLE screenings ADD COLUMN patient_name TEXT")
        if 'age' not in columns:
            cursor.execute("ALTER TABLE screenings ADD COLUMN age INTEGER")
        if 'gender' not in columns:
            cursor.execute("ALTER TABLE screenings ADD COLUMN gender TEXT")
        if 'notes' not in columns:
            cursor.execute("ALTER TABLE screenings ADD COLUMN notes TEXT")
        if 'patient_id' not in columns:
            print("Migrating: Adding patient_id column to screenings")
            cursor.execute("ALTER TABLE screenings ADD COLUMN patient_id INTEGER REFERENCES patients(id)")
        if 'doctor_review_status' not in columns:
            cursor.execute("ALTER TABLE screenings ADD COLUMN doctor_review_status TEXT DEFAULT 'pending'")
        if 'doctor_notes' not in columns:
            cursor.execute("ALTER TABLE screenings ADD COLUMN doctor_notes TEXT")
        if 'final_risk' not in columns:
            cursor.execute("ALTER TABLE screenings ADD COLUMN final_risk TEXT")
        if 'disease_probs' not in columns:
            print("Migrating: Adding disease_probs JSON column to screenings")
            cursor.execute("ALTER TABLE screenings ADD COLUMN disease_probs TEXT")

        # ── Users Table ──
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS app_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                username TEXT NOT NULL,
                signature_data TEXT
            )
        ''')

        # ── Auto-migration for app_users ──
        cursor.execute("PRAGMA table_info(app_users)")
        user_columns = [info[1] for info in cursor.fetchall()]

        if 'signature_data' not in user_columns:
            print("Migrating: Adding signature_data column to app_users")
            cursor.execute("ALTER TABLE app_users ADD COLUMN signature_data TEXT")
            
        if 'role' not in user_columns:
            print("Migrating: Adding role column to app_users")
            cursor.execute("ALTER TABLE app_users ADD COLUMN role TEXT DEFAULT 'admin'")
            
        if 'is_approved' not in user_columns:
            print("Migrating: Adding is_approved column to app_users")
            cursor.execute("ALTER TABLE app_users ADD COLUMN is_approved INTEGER DEFAULT 1")
            
        # ── Audit Logs Table ──
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                timestamp TEXT NOT NULL
            )
        ''')

        conn.commit()
        conn.close()
        print("Database initialized (SQLite).")
    except Exception as e:
        print(f"Database Init Error: {e}")


# ══════════════════════════════════════════
#  PATIENT CRUD
# ══════════════════════════════════════════

def create_patient(name, age=None, gender=None, contact_phone=None, contact_email=None, medical_history=None, symptoms=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().isoformat()

        # symptoms should be a JSON string (list of symptom strings)
        if isinstance(symptoms, list):
            symptoms = json.dumps(symptoms)

        cursor.execute('''
            INSERT INTO patients (name, age, gender, contact_phone, contact_email, medical_history, symptoms, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (name, age, gender, contact_phone, contact_email, medical_history, symptoms, now, now))

        patient_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return True, patient_id
    except Exception as e:
        print(f"Create Patient Error: {e}")
        return False, str(e)


def get_patient(patient_id):
    try:
        conn = get_db_connection()
        patient = conn.execute('SELECT * FROM patients WHERE id = ?', (patient_id,)).fetchone()
        if not patient:
            conn.close()
            return None

        patient_dict = dict(patient)

        # Parse symptoms JSON
        if patient_dict.get('symptoms'):
            try:
                patient_dict['symptoms'] = json.loads(patient_dict['symptoms'])
            except json.JSONDecodeError:
                pass

        # Get screening history for this patient
        screenings = conn.execute(
            'SELECT * FROM screenings WHERE patient_id = ? ORDER BY id DESC', (patient_id,)
        ).fetchall()
        patient_dict['screenings'] = [dict(s) for s in screenings]

        conn.close()
        return patient_dict
    except Exception as e:
        print(f"Get Patient Error: {e}")
        return None


def get_all_patients(search_query=None):
    try:
        conn = get_db_connection()

        if search_query:
            patients = conn.execute(
                'SELECT * FROM patients WHERE name LIKE ? OR contact_email LIKE ? ORDER BY updated_at DESC',
                (f'%{search_query}%', f'%{search_query}%')
            ).fetchall()
        else:
            patients = conn.execute('SELECT * FROM patients ORDER BY updated_at DESC').fetchall()

        results = []
        for p in patients:
            p_dict = dict(p)
            if p_dict.get('symptoms'):
                try:
                    p_dict['symptoms'] = json.loads(p_dict['symptoms'])
                except json.JSONDecodeError:
                    pass

            # Get last screening info
            last_screening = conn.execute(
                'SELECT risk, probability, timestamp FROM screenings WHERE patient_id = ? ORDER BY id DESC LIMIT 1',
                (p_dict['id'],)
            ).fetchone()
            if last_screening:
                p_dict['last_screening'] = dict(last_screening)
            else:
                p_dict['last_screening'] = None

            # Get screening count
            count = conn.execute(
                'SELECT COUNT(*) as count FROM screenings WHERE patient_id = ?',
                (p_dict['id'],)
            ).fetchone()
            p_dict['screening_count'] = count['count'] if count else 0

            results.append(p_dict)

        conn.close()
        return results
    except Exception as e:
        print(f"Get All Patients Error: {e}")
        return []


def update_patient(patient_id, **kwargs):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build dynamic update query
        allowed_fields = ['name', 'age', 'gender', 'contact_phone', 'contact_email', 'medical_history', 'symptoms']
        updates = []
        values = []

        for field in allowed_fields:
            if field in kwargs and kwargs[field] is not None:
                val = kwargs[field]
                if field == 'symptoms' and isinstance(val, list):
                    val = json.dumps(val)
                updates.append(f"{field} = ?")
                values.append(val)

        if not updates:
            conn.close()
            return False, "No fields to update"

        updates.append("updated_at = ?")
        values.append(datetime.datetime.now().isoformat())
        values.append(patient_id)

        query = f"UPDATE patients SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, values)
        conn.commit()
        conn.close()
        return True, "Patient updated successfully"
    except Exception as e:
        print(f"Update Patient Error: {e}")
        return False, str(e)


def search_patients(query):
    return get_all_patients(search_query=query)


# ══════════════════════════════════════════
#  SCREENING LOGS
# ══════════════════════════════════════════

def log_result(filename, probability, result, original_path=None, heatmap_path=None,
               patient_name="Unknown", age=None, gender=None, notes=None, patient_id=None,
               disease_probs=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        timestamp = datetime.datetime.now().isoformat()

        # Serialize disease probabilities as JSON
        disease_probs_json = json.dumps(disease_probs) if disease_probs else None

        cursor.execute('''
            INSERT INTO screenings (filename, result, probability, timestamp, original_path, heatmap_path,
                                    patient_name, age, gender, notes, patient_id, doctor_review_status, final_risk, disease_probs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (filename, result, probability, timestamp, original_path, heatmap_path,
              patient_name, age, gender, notes, patient_id, 'pending', result, disease_probs_json))
        
        # Update patient's updated_at if linked
        if patient_id:
            cursor.execute("UPDATE patients SET updated_at = ? WHERE id = ?",
                           (timestamp, patient_id))

        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Log Error: {e}")
        return False


def get_logs():
    try:
        conn = get_db_connection()
        logs = conn.execute('SELECT * FROM screenings ORDER BY id DESC').fetchall()
        conn.close()

        results = []
        for log in logs:
            log_dict = dict(log)
            if 'result' in log_dict:
                log_dict['risk'] = log_dict['result']
            # Unpack disease_probs JSON if present
            if log_dict.get('disease_probs'):
                try:
                    log_dict['disease_probs'] = json.loads(log_dict['disease_probs'])
                except json.JSONDecodeError:
                    log_dict['disease_probs'] = None
            results.append(log_dict)

        return results
    except Exception as e:
        print(f"Get Logs Error: {e}")
        return []


def delete_log(log_id):
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM screenings WHERE id = ?', (log_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Delete Log Error: {e}")
        return False


def review_screening(log_id, review_status, doctor_notes, final_risk):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE screenings 
            SET doctor_review_status = ?, doctor_notes = ?, final_risk = ?
            WHERE id = ?
        ''', (review_status, doctor_notes, final_risk, log_id))
        
        conn.commit()
        conn.close()
        return True, "Review saved successfully"
    except Exception as e:
        print(f"Review Error: {e}")
        return False, str(e)


# ══════════════════════════════════════════
#  STATS
# ══════════════════════════════════════════

def get_stats():
    try:
        conn = get_db_connection()

        total = conn.execute('SELECT COUNT(*) as count FROM screenings').fetchone()['count']

        high_risk = conn.execute(
            "SELECT COUNT(*) as count FROM screenings WHERE result = 'high'"
        ).fetchone()['count']

        low_risk = conn.execute(
            "SELECT COUNT(*) as count FROM screenings WHERE result = 'low'"
        ).fetchone()['count']

        moderate_risk = conn.execute(
            "SELECT COUNT(*) as count FROM screenings WHERE result = 'moderate'"
        ).fetchone()['count']

        avg_conf_row = conn.execute(
            'SELECT AVG(probability) as avg_prob FROM screenings'
        ).fetchone()
        avg_confidence = round((avg_conf_row['avg_prob'] or 0) * 100, 1)

        # This week's screenings
        week_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat()
        this_week = conn.execute(
            'SELECT COUNT(*) as count FROM screenings WHERE timestamp > ?', (week_ago,)
        ).fetchone()['count']

        # Patient count
        patient_count = conn.execute('SELECT COUNT(*) as count FROM patients').fetchone()['count']

        conn.close()

        return {
            'total_screenings': total,
            'high_risk': high_risk,
            'low_risk': low_risk,
            'moderate_risk': moderate_risk,
            'avg_confidence': avg_confidence,
            'this_week': this_week,
            'patient_count': patient_count
        }
    except Exception as e:
        print(f"Stats Error: {e}")
        return {
            'total_screenings': 0, 'high_risk': 0, 'low_risk': 0,
            'moderate_risk': 0, 'avg_confidence': 0, 'this_week': 0, 'patient_count': 0
        }


# ══════════════════════════════════════════
#  USER AUTH & RBAC
# ══════════════════════════════════════════

def create_user(email, password, username, role="radiographer"):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # New users default to is_approved = 0 (False)
            cursor.execute('INSERT INTO app_users (email, password, username, role, is_approved) VALUES (?, ?, ?, ?, ?)',
                           (email, password, username, role, 0))
            conn.commit()
            conn.close()
            return True, "User registered successfully! Pending approval from an admin."
        except sqlite3.IntegrityError:
            conn.close()
            return False, "User already exists with this email."

    except Exception as e:
        return False, f"Registration failed: {str(e)}"


def authenticate_user(identifier, password):
    try:
        conn = get_db_connection()
        user = conn.execute('''
            SELECT * FROM app_users
            WHERE (email = ? OR username = ?) AND password = ?
        ''', (identifier, identifier, password)).fetchone()

        conn.close()

        if user:
            user_dict = dict(user)
            if user_dict.get('is_approved') == 0:
                return False, "Account pending admin approval."
            return True, user_dict
        return False, "Invalid credentials."
    except Exception as e:
        print(f"Auth Error: {e}")
        return False, "System error."

def get_pending_users():
    try:
        conn = get_db_connection()
        users = conn.execute("SELECT id, email, username, role, is_approved FROM app_users WHERE is_approved = 0 ORDER BY id DESC").fetchall()
        conn.close()
        return [dict(u) for u in users]
    except Exception as e:
        print(f"Get Pending Users Error: {e}")
        return []

def approve_user(email):
    try:
        conn = get_db_connection()
        conn.execute("UPDATE app_users SET is_approved = 1 WHERE email = ?", (email,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Approve Error: {e}")
        return False

def reject_user(email):
    try:
        conn = get_db_connection()
        conn.execute("DELETE FROM app_users WHERE email = ? AND is_approved = 0", (email,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Reject Error: {e}")
        return False

# ══════════════════════════════════════════
#  AUDIT LOGS
# ══════════════════════════════════════════

def log_audit(user_email, action, details=""):
    try:
        if not user_email:
            user_email = "system"
        conn = get_db_connection()
        timestamp = datetime.datetime.now().isoformat()
        conn.execute('''
            INSERT INTO audit_logs (user_email, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (user_email, action, details, timestamp))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Audit Log Error: {e}")

def get_audit_logs():
    try:
        conn = get_db_connection()
        logs = conn.execute('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200').fetchall()
        conn.close()
        return [dict(l) for l in logs]
    except Exception as e:
        print(f"Get Audit Logs Error: {e}")
        return []

# ══════════════════════════════════════════
#  DIGITAL SIGNATURE
# ══════════════════════════════════════════

def save_signature(user_email, signature_b64):
    try:
        conn = get_db_connection()
        conn.execute('UPDATE app_users SET signature_data = ? WHERE email = ?',
                     (signature_b64, user_email))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Save Signature Error: {e}")
        return False


def get_signature(user_email):
    try:
        conn = get_db_connection()
        user = conn.execute('SELECT signature_data, username FROM app_users WHERE email = ?',
                            (user_email,)).fetchone()
        conn.close()

        if user and user['signature_data']:
            return user['signature_data'], user['username']
        return None, None
    except Exception as e:
        print(f"Get Signature Error: {e}")
        return None, None


# ══════════════════════════════════════════
#  SESSION MANAGEMENT
# ══════════════════════════════════════════

def save_local_session(username):
    try:
        with open(SESSION_FILE, "w") as f:
            json.dump({"username": username, "logged_in": True}, f)
    except Exception as e:
        print(f"Session Save Error: {e}")


def load_local_session():
    if not os.path.exists(SESSION_FILE):
        return False, None
    try:
        with open(SESSION_FILE, "r") as f:
            data = json.load(f)
            if data.get("logged_in"):
                return True, data.get("username")
    except Exception as e:
        print(f"Session Load Error: {e}")
    return False, None


def clear_local_session():
    if os.path.exists(SESSION_FILE):
        try:
            os.remove(SESSION_FILE)
        except Exception as e:
            print(f"Session Clear Error: {e}")
