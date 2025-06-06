import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import Handlebars from 'handlebars';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
// import Share from 'react-native-share';
import { generateQRCodeDataUrlRN } from './utils';

// Your existing HTML template
const parsedData = `<!DOCTYPE html>
<html>
<head>
<style>
    body {
    font-family: Arial, sans-serif;
    width: {{width}}px;
    height: {{height}}px;
    padding: 10px;
    box-sizing: border-box;
    border: 1px solid #000;
    }
    .label {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    height: 100%;
    }
    .field {
    margin-bottom: 8px;
    font-size: 16px;
    }
    .field span {
    font-weight: bold;
    }
    img {
    margin-top: 4px;
    }
</style>
</head>
<body>
<div class="label">
    <div class="field"><span>Serial:</span> {{serial}}</div>
    <div class="field"><span>IP Address:</span> {{ip}}</div>
    <div class="field"><span>Batch Code:</span> {{batchCode}}</div>
    <div class="field">
    <span>QR Code:</span><br />
    <img src="{{qrCode}}" alt="QR Code" width="100" height="100" />
    </div>
</div>
</body>
</html>`;

// Function to generate PDF from HTML template
const generatePDFFromHTML = async (data = {}) => {
  try {
    // Generate QR code data URL
    const qrCodeData = await generateQRCodeDataUrlRN(
      `${data.serial || '1234567890'}|${data.ip || '192.168.1.100'}|${data.batchCode || 'ABC-123'}`
    );

    // Compile template with Handlebars
    const templateFunction = Handlebars.compile(parsedData);
    const generatedHtml = templateFunction({
      serial: data.serial || '1234567890',
      ip: data.ip || '192.168.1.100',
      batchCode: data.batchCode || 'ABC-123',
      height: data.height || 250,
      width: data.width || 300,
      qrCode: qrCodeData,
    });

    // PDF generation options
    const options = {
      html: generatedHtml,
      fileName: `label_${Date.now()}`,
      width: 300,
      height: 250,
      // Page settings
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 10,
      paddingBottom: 10,
      // Quality settings
      quality: 'high',
      // Background color
      bgColor: '#FFFFFF',
    };

    // Generate PDF
    const pdf = await RNHTMLtoPDF.convert(options);
    
    console.log('PDF generated successfully!');
    console.log('PDF path:', pdf.filePath);
    
    return pdf;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Function to save PDF to device storage
const savePDFToDevice = async (pdfPath, fileName = 'label.pdf') => {
  try {
    let destinationPath;
    
    if (Platform.OS === 'android') {
      // Request storage permission for Android
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        destinationPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      } else {
        throw new Error('Storage permission denied');
      }
    } else {
      // iOS - save to Documents directory
      destinationPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    }

    // Copy PDF to destination
    await RNFS.copyFile(pdfPath, destinationPath);
    
    console.log('PDF saved to:', destinationPath);
    return destinationPath;
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw error;
  }
};

// Function to share PDF
// const sharePDF = async (pdfPath) => {
//   try {
//     const shareOptions = {
//       title: 'Share Label PDF',
//       url: `file://${pdfPath}`,
//       type: 'application/pdf',
//     };

//     await Share.open(shareOptions);
//   } catch (error) {
//     console.error('Error sharing PDF:', error);
//   }
// };

// Main function to generate and handle PDF
const createLabelPDF = async (labelData) => {
  try {
    // Show loading indicator here if needed
    
    // Generate PDF
    const pdf = await generatePDFFromHTML(labelData);
    
    // Save to device
    const savedPath = await savePDFToDevice(pdf.filePath, `label_${labelData.serial || Date.now()}.pdf`);
    
    // Show success message
    Alert.alert(
      'Success',
      'PDF generated successfully!',
      [
        { text: 'OK', style: 'default' },
        { 
          text: 'Share', 
          onPress: () => sharePDF(savedPath),
          style: 'default'
        }
      ]
    );
    
    return savedPath;
  } catch (error) {
    console.error('PDF generation failed:', error);
    Alert.alert('Error', 'Failed to generate PDF. Please try again.');
  }
};

// Function to generate multiple PDFs (batch processing)
const generateBatchPDFs = async (labelDataArray) => {
  try {
    const generatedPDFs = [];
    
    for (let i = 0; i < labelDataArray.length; i++) {
      const labelData = labelDataArray[i];
      const pdf = await generatePDFFromHTML(labelData);
      
      const fileName = `label_${labelData.serial || i + 1}.pdf`;
      const savedPath = await savePDFToDevice(pdf.filePath, fileName);
      
      generatedPDFs.push({
        data: labelData,
        path: savedPath,
        fileName: fileName
      });
      
      console.log(`Generated PDF ${i + 1}/${labelDataArray.length}`);
    }
    
    Alert.alert('Success', `Generated ${generatedPDFs.length} PDFs successfully!`);
    return generatedPDFs;
  } catch (error) {
    console.error('Batch PDF generation failed:', error);
    Alert.alert('Error', 'Failed to generate batch PDFs.');
  }
};

// Usage examples:

// Single PDF generation
const handleGeneratePDF = () => {
  const labelData = {
    serial: '1234567890',
    ip: '192.168.1.100',
    batchCode: 'ABC-123',
    width: 300,
    height: 250
  };
  
  createLabelPDF(labelData);
};

// Batch PDF generation
const handleGenerateBatchPDFs = () => {
  const batchData = [
    { serial: '1111111111', ip: '192.168.1.101', batchCode: 'BATCH-001' },
    { serial: '2222222222', ip: '192.168.1.102', batchCode: 'BATCH-002' },
    { serial: '3333333333', ip: '192.168.1.103', batchCode: 'BATCH-003' },
  ];
  
  generateBatchPDFs(batchData);
};

export {
  generatePDFFromHTML,
  savePDFToDevice,
//   sharePDF,
  createLabelPDF,
  generateBatchPDFs,
  handleGeneratePDF,
  handleGenerateBatchPDFs
};