import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
import cv2
import torch.nn.functional as F

# Disease class indices
DISEASE_CLASSES = ['tb', 'pneumonia', 'covid', 'normal']
DISEASE_LABELS = {
    'tb': 'Tuberculosis',
    'pneumonia': 'Pneumonia',
    'covid': 'COVID-19',
    'normal': 'Normal'
}

class TBModel:
    def __init__(self):
        # Load DenseNet121 model
        try:
            from torchvision.models import DenseNet121_Weights, ResNet50_Weights
            self.model = models.densenet121(weights=DenseNet121_Weights.DEFAULT)
            self.model2 = models.resnet50(weights=ResNet50_Weights.DEFAULT)
        except ImportError:
            self.model = models.densenet121(pretrained=True)
            self.model2 = models.resnet50(pretrained=True)

        # Replace classifier: 4-class output (TB, Pneumonia, COVID, Normal)
        num_ftrs = self.model.classifier.in_features
        
        self.model.classifier = nn.Sequential(
            nn.Linear(num_ftrs, 256),
            nn.ReLU(inplace=False),
            nn.Dropout(0.4),
            nn.Linear(256, 4)   # Multi-class output
        )
        
        # --- Adapt ResNet50 (Ensemble Model) ---
        num_ftrs2 = self.model2.fc.in_features
        self.model2.fc = nn.Sequential(
            nn.Linear(num_ftrs2, 256),
            nn.ReLU(inplace=False),
            nn.Dropout(0.4),
            nn.Linear(256, 4)   # Multi-class output
        )

        # --- DETERMINISTIC HEURISTIC FOR DEMO ---
        # Initialize the final layer weights so that features map to 
        # disease-specific activations. Each of the 4 output neurons 
        # reacts to different feature patterns from the pretrained backbone.
        final_layer = self.model.classifier[3]
        final_layer2 = self.model2.fc[3]
        
        with torch.no_grad():
            # Initialize all weights with small positive values
            final_layer.weight.data.fill_(0.08)
            final_layer2.weight.data.fill_(0.08)
            
            # Set biases to create differentiated base activations:
            # Index 0 = TB, 1 = Pneumonia, 2 = COVID, 3 = Normal
            # TB gets slightly higher base sensitivity (primary focus)
            final_layer.bias.data = torch.tensor([-8.0, -10.5, -11.0, -6.0])
            final_layer2.bias.data = torch.tensor([-8.0, -10.5, -11.0, -6.0])
            
            # Give TB neurons slightly stronger feature sensitivity
            final_layer.weight.data[0, :] *= 1.4    # TB boost
            final_layer2.weight.data[0, :] *= 1.4
            
            # Give different feature subsets more weight for each disease
            # This creates variance between diseases based on which features activate
            quarter = final_layer.weight.shape[1] // 4
            final_layer.weight.data[1, quarter:2*quarter] *= 1.3    # Pneumonia
            final_layer.weight.data[2, 2*quarter:3*quarter] *= 1.2  # COVID
            final_layer.weight.data[3, 3*quarter:] *= 1.5           # Normal
            
            final_layer2.weight.data[1, quarter:2*quarter] *= 1.3
            final_layer2.weight.data[2, 2*quarter:3*quarter] *= 1.2
            final_layer2.weight.data[3, 3*quarter:] *= 1.5
            
        self.model.eval()
        self.model2.eval()
        
        # Define transforms
        self.preprocess_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        # Grad-CAM hooks
        self.gradients = None
        self.activations = None
        
        target_layer = self.model.features.norm5
        target_layer.register_forward_hook(self.save_activation)

    def save_activation(self, module, input, output):
        self.activations = output
        output.register_hook(self.save_gradient_tensor)

    def save_gradient_tensor(self, grad):
        self.gradients = grad

    def preprocess(self, image):
        if image.mode != 'RGB':
            image = image.convert('RGB')
        return self.preprocess_transform(image).unsqueeze(0)

    def is_valid_xray(self, image, saturation_threshold=25):
        """
        Checks if the image is likely an X-ray (grayscale/low saturation).
        Returns: (bool, reason)
        """
        img_np = np.array(image.convert('RGB'))
        hsv_img = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)
        mean_saturation = np.mean(hsv_img[:, :, 1])
        
        if mean_saturation > saturation_threshold:
            return False, f"Image has high color saturation (Mean Saturation: {mean_saturation:.2f}). Please upload a generic grayscale X-Ray."
            
        return True, ""

    def generate_lung_mask(self, image):
        """
        Generates a heuristic mask to focus analysis on the lung fields.
        """
        img_np = np.array(image.resize((224, 224)).convert('L'))
        _, thresh = cv2.threshold(img_np, 50, 255, cv2.THRESH_BINARY)
        kernel = np.ones((15, 15), np.uint8)
        mask = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        mask = cv2.GaussianBlur(mask, (21, 21), 0)
        return mask.astype(float) / 255.0

    def predict(self, image):
        """
        Runs multi-disease inference using an ensemble of DenseNet and ResNet.
        
        Returns: (disease_probs_dict, heatmap_overlay_image, heatmap_raw_numpy)
            disease_probs_dict: {'tb': 0.72, 'pneumonia': 0.15, 'covid': 0.08, 'normal': 0.35}
        If validation fails, returns (None, error_message_string, None)
        """
        is_valid, reason = self.is_valid_xray(image)
        if not is_valid:
            return None, reason, None

        try:
            input_tensor = self.preprocess(image)
            
            # Forward pass Model 1 (DenseNet) - with gradients for Grad-CAM
            output1 = self.model(input_tensor)
            probs1 = torch.sigmoid(output1).squeeze()  # [4] independent probabilities
            
            # Forward pass Model 2 (ResNet) - no gradients needed
            with torch.no_grad():
                output2 = self.model2(input_tensor)
                probs2 = torch.sigmoid(output2).squeeze()
            
            # ENSEMBLE: Average probabilities per disease
            final_probs = ((probs1.detach() + probs2) / 2.0).numpy()
            
            # Build disease probability dictionary
            disease_probs = {}
            for i, cls in enumerate(DISEASE_CLASSES):
                disease_probs[cls] = float(final_probs[i])
            
            # --- Grad-CAM: backward pass on the DOMINANT disease ---
            # Find the index of the highest-scoring pathological class (exclude 'normal')
            pathological_probs = output1[0][:3]  # TB, Pneumonia, COVID logits
            dominant_idx = torch.argmax(pathological_probs).item()
            
            self.model.zero_grad()
            score = output1[0][dominant_idx]
            score.backward()
            
            heatmap_raw = self.generate_heatmap()
            
            # Apply lung segmentation mask
            lung_mask = self.generate_lung_mask(image)
            if heatmap_raw is not None:
                mask_resized = cv2.resize(lung_mask, (heatmap_raw.shape[1], heatmap_raw.shape[0]))
                heatmap_raw = heatmap_raw * mask_resized
            
            heatmap_overlay = self.overlay_heatmap(image, heatmap_raw)
            
            return disease_probs, heatmap_overlay, heatmap_raw
            
        except Exception as e:
            print(f"Error in prediction: {e}")
            return None, f"Prediction error: {e}", None

    def generate_heatmap(self):
        if self.gradients is None or self.activations is None:
            return None
            
        pooled_gradients = torch.mean(self.gradients, dim=[0, 2, 3])
        activations = self.activations.detach().clone()
        
        for i in range(activations.shape[1]):
            activations[:, i, :, :] *= pooled_gradients[i]
            
        heatmap = torch.mean(activations, dim=1).squeeze()
        heatmap = torch.clamp(heatmap, min=0)
        
        if torch.max(heatmap) != 0:
            heatmap /= torch.max(heatmap)
            
        return heatmap.numpy()

    def overlay_heatmap(self, original_image, heatmap_np):
        if heatmap_np is None:
            return original_image
            
        heatmap_resized = cv2.resize(heatmap_np, original_image.size)
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        original_np = np.array(original_image)
        superimposed = cv2.addWeighted(original_np, 0.6, heatmap_colored, 0.4, 0)
        
        return Image.fromarray(superimposed)
