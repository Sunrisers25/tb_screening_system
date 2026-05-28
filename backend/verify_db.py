import database as db
import os

print("Testing database operations...")
# Try logging a result
success = db.log_result("test_debug_file.png", 0.99, "high", "/static/reports/test_orig.png", "/static/reports/test_hm.png")
if success:
    print("Log successfully inserted.")
else:
    print("Log insertion failed.")

# Try reading logs
logs = db.get_logs()
print(f"Found {len(logs)} logs.")
if len(logs) > 0:
    latest = logs[0]
    print("Latest log:", latest)
    if 'risk' in latest and latest['risk'] == 'high':
        print("Risk key mapped correctly.")
    else:
        print("Risk key missng or mismatch:", latest.keys())

    # Clean up test entry
    print("Deleting test entry...")
    # Since we can't easily filter by filename with delete_log(id only), we find the id first
    log_id = latest.get('id')
    if log_id:
        db.delete_log(log_id)
        print("Test entry deleted.")
