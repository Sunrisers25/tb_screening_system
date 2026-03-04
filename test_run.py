import torch
from model import TBModel
from PIL import Image
import numpy as np
import cv2

def test_model():
    print("Initializing Model...")
    try:
        model = TBModel()
    except Exception as e:
        print(f"FAILED to load model: {e}")
        return

    # Case 1: Simulated Normal X-Ray (Ribs/Structure but clear lungs)
    print("\n--- Testing Simulated Normal X-Ray (Lines/Ribs) ---")
    # visual noise/structures shouldn't trigger TB
    img_array = np.zeros((224, 224, 3), dtype=np.uint8)
    # Draw some "ribs"
    for i in range(10, 200, 30):
        cv2.line(img_array, (0, i), (224, i+20), (100, 100, 100), 5)
        cv2.line(img_array, (0, i+10), (224, i+30), (100, 100, 100), 5)
    
    clean_img = Image.fromarray(img_array)
    
    try:
        prob, _ = model.predict(clean_img)
        print(f"Simulated Normal Probability: {prob:.4f}")
        if prob < 0.3:
            print("SUCCESS: Classified as Normal (Low Risk)")
        else:
            print("FAILURE: Classified as High Risk (False Positive)")
    except Exception as e:
        print(f"Inference failed: {e}")

    # Case 2: Noisy Image (Random) -> Should be High Risk (High Feature Activation)
    print("\n--- Testing Noisy Image (Simulating TB/Opacities) ---")
    # Grayscale noise to pass saturation check
    noise_array = np.random.randint(0, 255, (224, 224), dtype=np.uint8)
    noisy_img = Image.fromarray(noise_array).convert('RGB')
    
    try:
        prob, heatmap = model.predict(noisy_img)
        
        if prob is None:
             print(f"Prediction returned None: {heatmap}") # heatmap holds error msg here
        else:
            print(f"Noisy Image TB Probability: {prob:.4f}")
            
            if prob > 0.5:
                print("SUCCESS: Classified as High Risk")
            else:
                print("FAILURE: Classified as Normal")
                
            if heatmap is not None:
                 print("Heatmap generated successfully.")
    except Exception as e:
        print(f"Inference failed: {e}")

if __name__ == "__main__":
    test_model()
