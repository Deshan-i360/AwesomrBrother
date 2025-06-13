import {BleManager} from 'react-native-ble-plx';
import QRCode from 'qrcode';
import qrcode from 'qrcode-generator';
import Canvas from 'react-native-canvas';
import {Alert, Platform} from 'react-native';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import RNQRGenerator from 'rn-qr-generator';
//----- scan for devices
export const scanForPrinterDevices = async targetMacAddress => {
  return new Promise(async (resolve, reject) => {
    const manager = new BleManager();
    let foundDevice = null;
    let isScanStopped = false;

    const hasPermission = await requestPrinterPermissions();
    if (!hasPermission) {
      Alert.alert('Permission denied');
      reject('Permission denied');
      return;
    }

    console.log('Starting Bluetooth scan...');

    const scanTimeout = setTimeout(() => {
      if (!isScanStopped) {
        isScanStopped = true;
        manager.stopDeviceScan();
        console.log('Scan stopped (timeout)');
        resolve(null);
      }
    }, 5000);

    manager.startDeviceScan(null, {allowDuplicates: false}, (error, device) => {
      if (error) {
        console.log('Scan error:', error);
        if (!isScanStopped) {
          isScanStopped = true;
          clearTimeout(scanTimeout);
          manager.stopDeviceScan();
          reject(error);
        }
        return;
      }

      console.log('Discovered device:', device.id, device.name);

      //   if (device.id === targetMacAddress && !isScanStopped) {
      //     isScanStopped = true;
      //     console.log('Target device found:', device.id);
      //     foundDevice = device;
      //     clearTimeout(scanTimeout);
      //     manager.stopDeviceScan();
      //     resolve(foundDevice);
      //   }
    });
  });
};

export const generateQRCode = async text => {
  try {
    const base64 = await QRCode.toDataURL(text, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    console.log('Generated QR Code:', base64);

    return base64; // e.g. 'data:image/png;base64,...'
  } catch (err) {
    console.error(err);
    return '';
  }
};

export const generateQRCodeCanvas = async text => {
  try {
    return new Promise((resolve, reject) => {
      // Create QR code data
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();

      const modules = qr.modules;
      const size = modules.length;
      const cellSize = 4;
      const canvasSize = size * cellSize;

      // Create canvas (this would need a hidden canvas component)
      const canvas = document.createElement('canvas'); // This won't work in RN directly
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext('2d');

      // Draw QR code
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      ctx.fillStyle = '#000000';
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (modules[row][col]) {
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }

      // Convert to data URL
      const dataURL = canvas.toDataURL('image/png');
      console.log('Generated QR Code Canvas:', dataURL);

      resolve(dataURL);
    });
  } catch (err) {
    console.error('Canvas QR generation error:', err);
    return '';
  }
};

// import QRCode from 'react-native-qrcode-svg';
// import React, { useRef, useEffect } from 'react';

// export const generateQRCodeDataUrl = (url, callback) => {
//   let qrRef = useRef();

//   useEffect(() => {
//     if (qrRef.current) {
//       qrRef.current.toDataURL((data) => {
//         callback(`data:image/png;base64,${data}`);
//       });
//     }
//   }, []);

//   console.log('Generating QR Code for URL:', url);

//   // Render QRCode offscreen (not visible)
//   return (
//     <QRCode
//       value={url}
//       getRef={qrRef}
//       size={200}
//       style={{ position: 'absolute', left: -9999 }}
//     />
//   );
// };

export const generateQRCodeDataUrlRN = async url => {
  try {
    const {base64} = await RNQRGenerator.generate({
      value: url, // The URL or string to encode
      height: 500,
      width: 500,
      base64: true, // Get base64 output
    });
    // Compose a data URL
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    // Handle error
    return null;
  }
};

// Usage
// const dataUrl = await generateQRCodeDataUrl('https://example.com');

// export const createPDFWithoutDialog = async (labelData) => {
//   try {
//     const qrCodeData = await generateQRCodeDataUrlRN(
//       `PA91bE_rpt8JRxgmzx37ryLxnvRXevYjnz8eNfIEjpGrU6AdWxfQ5TXqpu1Qp8jc3`
//     );

//     const templateFunction = Handlebars.compile(parsedData);
//     const generatedHtml = templateFunction({
//       ...labelData,
//       qrCode: qrCodeData,
//     });

//     // Generate PDF to specific path
//     const pdfPath = `${RNFS.DocumentDirectoryPath}/label_${Date.now()}.pdf`;

//     // const results = await RNPrint.print({
//     //   html: generatedHtml,
//     //   filePath: pdfPath,
//     // });

//     return pdfPath;
//   } catch (error) {
//     console.error('Error creating PDF:', error);
//   }
// };

export const requestPermissionsForPrinter = async () => {
  if (Platform.OS === 'android') {
    const permissions = [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.INTERNET',
    ];

    // Request permissions for Android
    for (const permission of permissions) {
      try {
        await request(permission);
      } catch (error) {
        console.warn(`Permission ${permission} failed:`, error);
      }
    }
  } else {
    // iOS permissions
    await request(PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL);
  }
};
