import React, { useRef, useEffect } from 'react';
import Canvas from 'react-native-canvas';

export const CanvasLabel = ({ data, onImageGenerated }) => {
  const canvasRef = useRef();

  const drawLabel = (canvas) => {
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;
    
    // Draw background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 200);
    
    // Draw border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 400, 200);
    
    // Draw text
    ctx.fillStyle = 'black';
    ctx.font = '18px Arial';
    ctx.fillText(data.title, 20, 40);
    
    ctx.font = '14px Arial';
    ctx.fillText(data.subtitle, 20, 70);
    
    ctx.font = '12px monospace';
    ctx.fillText(data.barcode, 20, 100);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/png');
    onImageGenerated(imageData);
  };

  return (
    <Canvas
      ref={canvasRef}
      style={{ width: 400, height: 200 }}
      onCanvas={drawLabel}
    />
  );
};