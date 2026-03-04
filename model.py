import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
import cv2
import torch.nn.functional as F

class TBModel:
    def __init__(self):
        # Load a DenseNet121 model
        try:
            from torchvision.models import DenseNet121_Weights
            self.model = models.densenet121(weights=DenseNet121_Weights.DEFAULT)
        except ImportError:
            self.model = models.densenet121(pretrained=True)

        # Replace classifier as requested
        num_ftrs = self.model.classifier.in_features
        
        # New Sequential Classifier
        self.model.classifier = nn.Sequential(
            nn.Linear(num_ftrs, 256),
            nn.ReLU(inplace=False),
            nn.Dropout(0.4),
            nn.Linear(256, 1)   # Binary output (logit)
        )
        
        # --- DETERMINISTIC HEURISTIC FOR DEMO ---
        # We need to initialize the FINAL Linear layer (the one producing the logit)
        # to react to high feature activation. 
        # The chain is: Features -> Linear(1024->256) -> ReLU -> Dropout -> Linear(256->1)
        
        # Access the final linear layer (index 3 in Sequential)
        final_layer = self.model.classifier[3]
        
        with torch.no_grad():
            # Set weights to be positive -> High features = High Output (TB)
            final_layer.weight.data.fill_(0.12)
            
            # Set Bias:
            # We want clean images (low feature sum) to be negative logit (Low Probability).
            # High feature sum will push logit positive (High Probability).
            # Adjust bias to set the threshold.
            final_layer.bias.data.fill_(-10.0) 
            
        self.model.eval()
        
        # Define transforms
        self.preprocess_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        # Grad-CAM hooks
        self.gradients = None
        self.activations = None
        
        # Target the last layer of the feature extractor in DenseNet121
        # In DenseNet, it is 'features.norm5' (the batchnorm after the dense blocks)
        target_layer = self.model.features.norm5
        
        # Use Forward Hook to capture activations AND register a Tensor Hook on the output
        target_layer.register_forward_hook(self.save_activation)
        
        # We NO LONGER use register_full_backward_hook on the module, 
        # as it conflicts with inplace ops in DenseNet.
        # target_layer.register_full_backward_hook(self.save_gradient)

    def save_activation(self, module, input, output):
        self.activations = output
        # Register backward hook directly on the tensor
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
        # Convert to numpy
        img_np = np.array(image.convert('RGB'))
        
        # Convert to HSV to check saturation
        hsv_img = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)
        
        # Calculate mean saturation (channel 1)
        mean_saturation = np.mean(hsv_img[:, :, 1])
        
        if mean_saturation > saturation_threshold:
            return False, f"Image has high color saturation (Mean Saturation: {mean_saturation:.2f}). Please upload a generic grayscale X-Ray."
            
        return True, ""

    def predict(self, image):
        """
        Runs inference on the image.
        Returns: (probability of TB, heatmap_overlay_image, heatmap_raw_numpy)
        If validation fails, returns (None, error_message_string, None)
        """
        # Validate first
        is_valid, reason = self.is_valid_xray(image)
        if not is_valid:
            return None, reason, None

        try:
            input_tensor = self.preprocess(image)
            
            # Forward pass
            output = self.model(input_tensor)
            
            # Sigmoid for probability (Binary Classification)
            start_prob = torch.sigmoid(output).item()
            
            # Grad-CAM Backward pass
            self.model.zero_grad()
            
            # We want to explain "Why is this TB?" (increasing the output)
            # So we backpropagate the raw output itself (logit)
            score = output[0][0]
            score.backward()
            
            heatmap_raw = self.generate_heatmap()
            heatmap_overlay = self.overlay_heatmap(image, heatmap_raw)
            
            return start_prob, heatmap_overlay, heatmap_raw
            
        except Exception as e:
            print(f"Error in prediction: {e}")
            return None, f"Prediction error: {e}", None

    def generate_heatmap(self):
        if self.gradients is None or self.activations is None:
            return None
            
        # Global Average Pooling of gradients
        # gradients shape: [1, 1024, 7, 7]
        pooled_gradients = torch.mean(self.gradients, dim=[0, 2, 3])
        
        # Weight the activations
        # activations shape: [1, 1024, 7, 7]
        activations = self.activations.detach().clone()
        
        for i in range(activations.shape[1]):
            activations[:, i, :, :] *= pooled_gradients[i]
            
        # Average the channels to get the heatmap
        heatmap = torch.mean(activations, dim=1).squeeze()
        
        # ReLU
        heatmap = torch.clamp(heatmap, min=0)
        
        # Normalize
        if torch.max(heatmap) != 0:
            heatmap /= torch.max(heatmap)
            
        return heatmap.numpy()

    def overlay_heatmap(self, original_image, heatmap_np):
        if heatmap_np is None:
            return original_image
            
        # Resize heatmap to match original image size
        heatmap_resized = cv2.resize(heatmap_np, original_image.size)
        
        # Convert to uint8 color map
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        
        # Convert RGB for PIL
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Overlay
        original_np = np.array(original_image)
        superimposed = cv2.addWeighted(original_np, 0.6, heatmap_colored, 0.4, 0)
        
        return Image.fromarray(superimposed)
