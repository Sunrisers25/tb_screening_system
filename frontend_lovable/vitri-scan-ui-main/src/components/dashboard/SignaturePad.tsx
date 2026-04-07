import { useRef, useState, useEffect } from "react";
import { Pen, RotateCcw, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  userEmail: string;
}

const SignaturePad = ({ userEmail }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Fetch existing signature on mount
  useEffect(() => {
    if (userEmail) {
      fetch(`http://localhost:5000/api/auth/signature/${userEmail}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.signature) {
            setSavedSignature(data.signature);
          }
        })
        .catch(console.error);
    }
  }, [userEmail]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Style
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Dotted signature line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#ccc";
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 30);
    ctx.lineTo(rect.width - 20, rect.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#1a1a2e";

    // Label
    ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = "#999";
    ctx.fillText("Sign above this line", 20, rect.height - 12);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Redraw dotted line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#ccc";
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 30);
    ctx.lineTo(rect.width - 20, rect.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#1a1a2e";

    ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = "#999";
    ctx.fillText("Sign above this line", 20, rect.height - 12);

    setHasDrawn(false);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !userEmail) return;

    setSaving(true);
    const signatureData = canvas.toDataURL("image/png");

    try {
      const response = await fetch("http://localhost:5000/api/auth/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, signature: signatureData }),
      });

      const data = await response.json();
      if (data.success) {
        setSavedSignature(signatureData);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      } else {
        alert("Failed to save signature");
      }
    } catch (error) {
      console.error("Save signature error:", error);
      alert("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Pen className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium text-foreground">Digital Signature</p>
      </div>

      {/* Existing Signature Preview */}
      {savedSignature && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Current Saved Signature</p>
          <div className="bg-white rounded-lg p-2 border border-border/30">
            <img src={savedSignature} alt="Saved signature" className="h-16 object-contain mx-auto" />
          </div>
        </div>
      )}

      {/* Drawing Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-36 rounded-xl border-2 border-dashed border-border cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1.5 flex-1">
          <RotateCcw className="w-3.5 h-3.5" />
          Clear
        </Button>
        <Button
          variant="hero"
          size="sm"
          onClick={saveSignature}
          disabled={!hasDrawn || saving}
          className="gap-1.5 flex-1"
        >
          {justSaved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Signature"}
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Your signature will be automatically embedded in all generated PDF reports.
      </p>
    </div>
  );
};

export default SignaturePad;
