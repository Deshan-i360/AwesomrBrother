import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import Handlebars from 'handlebars';
import {Platform, PermissionsAndroid, Alert} from 'react-native';
// import Share from 'react-native-share';
import {generateQRCodeDataUrlRN} from './utils';

// Your existing HTML template
const parsedData = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      width: {{width}}px;
      height: {{height}}px;
      margin: 0;
      margin-top: 30px;
      padding: 8px;
      box-sizing: border-box;
      border: 1px solid #000;
      background-color: white;
    }
    .label {
      display: flex;
      flex-direction: row;
      margin-top: 0px;
      margin-left:30px;
      height: 100%;
      width: 100%;
      align-items: center;
    }
    .qr {
      flex: 0 0 auto;
      width: 35%; /* Adjust QR size to fit better */
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 8px;
    }
    .qr img {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      padding: 5px 8px;
      height: 100%;
      overflow: hidden;
    }
    .field {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 54px; /* Smaller font for better fit */
      line-height: 1.1;
      margin-bottom: 2px;
    }
    .field span {
      font-weight: bold;
      margin-right: 4px;
    }
    .field-value {
      font-weight: normal;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="qr">
      <img src="{{qrCode}}" alt="QR Code" />
    </div>
    <div class="info">
      <div class="field"><span>Org:</span><span class="field-value">{{organization}}</span></div>
      <div class="field"><span>Site:</span><span class="field-value">{{site}}</span></div>
      <div class="field"><span>Visitor:</span><span class="field-value">{{visitor}}</span></div>
      <div class="field"><span>Date:</span><span class="field-value">{{date}}</span></div>
    </div>
  </div>
</body>
</html>
`;

// Function to generate PDF from HTML template
const generatePDFFromHTML = async (data = {}) => {
  try {
    // Generate QR code data URL
    const qrCodeData = await generateQRCodeDataUrlRN(
      `8e371b42dd8ddb276f23cdf09c1098cd95919fa0621fcdad2ecb66460a664889`,
    );

    // Compile template with Handlebars
    const templateFunction = Handlebars.compile(parsedData);
    const generatedHtml = templateFunction({
      organization: data.organization || 'Long Organization Name',
      site: data.site || 'Site XYZ',
      visitor: data.visitor || 'John Doe',
      date: data.date || new Date().toLocaleDateString(),
      serial: data.serial || '1234567890',
      ip: data.ip || '192.168.1.100',
      batchCode: data.batchCode || 'ABC-123',
      qrCode: qrCodeData,
      // CORRECTED DIMENSIONS for landscape orientation
      width: 2126, // 90mm at 300 DPI (length)
      height: 684, // 29mm at 300 DPI (width)
    });

    // PDF generation options - LANDSCAPE orientation
    const options = {
      html: generatedHtml,
      fileName: `label_${Date.now()}`,
      width: 2126, // 90mm length
      height: 684, // 29mm width
      padding: 5,
      quality: 'high',
      bgColor: '#FFFFFF',
      // Add these for better PDF generation
      format: 'custom',
      orientation: 'landscape', // Force landscape if supported
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
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
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
const createLabelPDF = async labelData => {
  try {
    // Show loading indicator here if needed

    // Generate PDF
    const pdf = await generatePDFFromHTML(labelData);

    // Save to device
    const savedPath = await savePDFToDevice(
      pdf.filePath,
      `label_${labelData.serial || Date.now()}.pdf`,
    );

    // Show success message
    Alert.alert('Success', 'PDF generated successfully!', [
      {text: 'OK', style: 'default'},
      {
        text: 'Share',
        onPress: () => sharePDF(savedPath),
        style: 'default',
      },
    ]);

    return savedPath;
  } catch (error) {
    console.error('PDF generation failed:', error);
    Alert.alert('Error', 'Failed to generate PDF. Please try again.');
  }
};

// Function to generate multiple PDFs (batch processing)
const generateBatchPDFs = async labelDataArray => {
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
        fileName: fileName,
      });

      console.log(`Generated PDF ${i + 1}/${labelDataArray.length}`);
    }

    Alert.alert(
      'Success',
      `Generated ${generatedPDFs.length} PDFs successfully!`,
    );
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
    height: 250,
  };

  createLabelPDF(labelData);
};

// Batch PDF generation
const handleGenerateBatchPDFs = () => {
  const batchData = [
    {serial: '1111111111', ip: '192.168.1.101', batchCode: 'BATCH-001'},
    {serial: '2222222222', ip: '192.168.1.102', batchCode: 'BATCH-002'},
    {serial: '3333333333', ip: '192.168.1.103', batchCode: 'BATCH-003'},
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
  handleGenerateBatchPDFs,
};
