import sqlite3
import os
import datetime
import json

DB_FILE = "tb_screening_logs.db"
SESSION_FILE = "session.json"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create screenings table
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
                notes TEXT
            )
        ''')
        
        # Check and migrate if columns are missing (for existing dbs)
        cursor.execute("PRAGMA table_info(screenings)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'patient_name' not in columns:
            print("Migrating: Adding patient_name column")
            cursor.execute("ALTER TABLE screenings ADD COLUMN patient_name TEXT")
        if 'age' not in columns:
            print("Migrating: Adding age column")
            cursor.execute("ALTER TABLE screenings ADD COLUMN age INTEGER")
        if 'gender' not in columns:
            print("Migrating: Adding gender column")
            cursor.execute("ALTER TABLE screenings ADD COLUMN gender TEXT")
        if 'notes' not in columns:
            print("Migrating: Adding notes column")
            cursor.execute("ALTER TABLE screenings ADD COLUMN notes TEXT")
            
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS app_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                username TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database initialized (SQLite).")
    except Exception as e:
        print(f"Database Init Error: {e}")

def log_result(filename, probability, result, original_path=None, heatmap_path=None, patient_name="Unknown", age=None, gender=None, notes=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        timestamp = datetime.datetime.now().isoformat()
        
        # Note: Using 'result' column as per existing schema, mapping 'risk' arg to it
        cursor.execute('''
            INSERT INTO screenings (filename, result, probability, timestamp, original_path, heatmap_path, patient_name, age, gender, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (filename, result, probability, timestamp, original_path, heatmap_path, patient_name, age, gender, notes))
        
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
            # Map 'result' column to 'risk' key for frontend compatibility
            if 'result' in log_dict:
                log_dict['risk'] = log_dict['result']
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

# --- User Auth ---

def create_user(email, password, username):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('INSERT INTO app_users (email, password, username) VALUES (?, ?, ?)', 
                          (email, password, username))
            conn.commit()
            conn.close()
            return True, "User registered successfully!"
        except sqlite3.IntegrityError:
            conn.close()
            return False, "User already exists with this email."
            
    except Exception as e:
        return False, f"Registration failed: {str(e)}"

def authenticate_user(identifier, password):
    try:
        conn = get_db_connection()
        # Check email or username
        user = conn.execute('''
            SELECT * FROM app_users 
            WHERE (email = ? OR username = ?) AND password = ?
        ''', (identifier, identifier, password)).fetchone()
        
        conn.close()
        
        if user:
            return True, user['username']
        return False, None
    except Exception as e:
        print(f"Auth Error: {e}")
        return False, None

# --- Session Management ---

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
