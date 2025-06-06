// Required dependencies - LATEST RECOMMENDED SETUP:
// npm install react-native-brother-printing
// npm install react-native-zpl-code
// npm install react-native-permissions

import ZPLCode from 'react-native-zpl-code';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  Platform
} from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import BrotherPrinter from 'react-native-brother-printing';
import { scanForPrinterDevices } from './utils';


class BrotherQL820Service {
  constructor() {
    this.isConnected = false;
    this.connectedPrinter = null;
  }

  // Initialize Brother Printer SDK
  async initialize() {
    try {
      await this.requestPermissions();
      console.log('Brother Printer SDK initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Brother Printer SDK:', error);
      return false;
    }
  }

  // Request necessary permissions
  async requestPermissions() {
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
  }

  // Search for Brother printers (Bluetooth)
  async searchBluetoothPrinters() {
    try {
      const printers = await scanForPrinterDevices();
      console.log('Found Bluetooth printers:', printers);
      return printers.filter(printer => 
        printer.modelName && printer.modelName.includes('QL-820')
      );
    } catch (error) {
      console.error('Failed to search Bluetooth printers:', error);
      return [];
    }
  }

  // Search for Brother printers (WiFi)
  async searchWiFiPrinters() {
    try {
      const printers = await scanForPrinterDevices();
      console.log('Found WiFi printers:', printers);
      return printers.filter(printer => 
        printer.modelName && printer.modelName.includes('QL-820')
      );
    } catch (error) {
      console.error('Failed to search WiFi printers:', error);
      return [];
    }
  }

  // Connect to printer
  async connectToPrinter(printer, connectionType = 'bluetooth') {
    try {
      let result;
      
      if (connectionType === 'bluetooth') {
        result = await BrotherPrinter.connectBluetooth(printer.macAddress);
      } else {
        result = await BrotherPrinter.connectWiFi(printer.ipAddress);
      }

      if (result.success) {
        this.isConnected = true;
        this.connectedPrinter = printer;
        console.log('Connected to printer:', printer.modelName);
        return true;
      } else {
        console.error('Connection failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      return false;
    }
  }

  // Disconnect from printer
  async disconnect() {
    try {
      await BrotherPrinter.disconnect();
      this.isConnected = false;
      this.connectedPrinter = null;
      console.log('Disconnected from printer');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }

  // Print ZPL code using Brother SDK
  async printZPL(zplCode, options = {}) {
    try {
      if (!this.isConnected) {
        throw new Error('Printer not connected');
      }

      const printOptions = {
        printerModel: 'QL-820NWB',
        paperSize: options.paperSize || 'W62', // 62mm width
        numberOfCopies: options.copies || 1,
        ...options
      };

      const result = await BrotherPrinter.printZPL(zplCode, printOptions);
      
      if (result.success) {
        console.log('ZPL printed successfully');
        return true;
      } else {
        console.error('Print failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to print ZPL:', error);
      return false;
    }
  }

  // Print image (JPG, PNG, BMP)
  async printImage(imageUri, options = {}) {
    try {
      if (!this.isConnected) {
        throw new Error('Printer not connected');
      }

      const printOptions = {
        printerModel: 'QL-820NWB',
        paperSize: options.paperSize || 'W62',
        numberOfCopies: options.copies || 1,
        halftone: options.halftone || 'THRESHOLD',
        ...options
      };

      const result = await BrotherPrinter.printImageViaBluetooth(imageUri, printOptions);
      
      if (result.success) {
        console.log('Image printed successfully');
        return true;
      } else {
        console.error('Print failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to print image:', error);
      return false;
    }
  }

  // Generate and print shipping label
  async printShippingLabel(shippingData) {
    try {
      const zpl = new ZPLCode();
      
      // Configure for Brother QL-820NWB (62mm width)
      zpl.labelHome(0, 0);
      zpl.labelLength(600);
      zpl.printWidth(600);
      
      // Header
      zpl.text('SHIPPING LABEL', 50, 30, 'A', 'N', 28, 28);
      zpl.line(40, 70, 560, 70, 2);
      
      // Recipient
      zpl.text('SHIP TO:', 50, 90, 'A', 'N', 20, 20);
      zpl.text(shippingData.toName, 50, 120, 'A', 'N', 22, 22);
      zpl.text(shippingData.toAddress, 50, 150, 'A', 'N', 18, 18);
      zpl.text(`${shippingData.toCity}, ${shippingData.toState} ${shippingData.toZip}`, 50, 180, 'A', 'N', 18, 18);
      
      // Sender
      zpl.text('FROM:', 50, 220, 'A', 'N', 20, 20);
      zpl.text(shippingData.fromName, 50, 250, 'A', 'N', 18, 18);
      zpl.text(shippingData.fromAddress, 50, 280, 'A', 'N', 16, 16);
      
      // Tracking barcode
      if (shippingData.trackingNumber) {
        zpl.code128(shippingData.trackingNumber, 50, 320, 2, 60, 'Y');
        zpl.text(shippingData.trackingNumber, 50, 390, 'A', 'N', 16, 16);
      }
      
      // Date/Time
      const now = new Date();
      zpl.text(`Printed: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 50, 430, 'A', 'N', 12, 12);
      
      const zplCode = zpl.getZPL();
      return await this.printZPL(zplCode, { paperSize: 'W62' });
    } catch (error) {
      console.error('Failed to print shipping label:', error);
      return false;
    }
  }

  // Generate and print product label with QR code
  async printProductLabel(productData) {
    try {
      const zpl = new ZPLCode();
      
      zpl.labelHome(0, 0);
      zpl.labelLength(400);
      zpl.printWidth(600);
      
      // Product name
      zpl.text(productData.name, 20, 30, 'A', 'N', 24, 24);
      
      // SKU and Price
      zpl.text(`SKU: ${productData.sku}`, 20, 70, 'A', 'N', 18, 18);
      zpl.text(`Price: $${productData.price}`, 20, 100, 'A', 'N', 20, 20);
      
      // Barcode
      if (productData.barcode) {
        zpl.code128(productData.barcode, 20, 140, 2, 50, 'Y');
      }
      
      // QR Code with product info
      const qrData = JSON.stringify({
        sku: productData.sku,
        price: productData.price,
        name: productData.name,
        barcode: productData.barcode
      });
      zpl.qrCode(qrData, 350, 140, 'M', 4);
      
      const zplCode = zpl.getZPL();
      return await this.printZPL(zplCode, { paperSize: 'W62' });
    } catch (error) {
      console.error('Failed to print product label:', error);
      return false;
    }
  }

  // Get printer status
  async getPrinterStatus() {
    try {
      const status = await BrotherPrinter.getPrinterStatus();
      return status;
    } catch (error) {
      console.error('Failed to get printer status:', error);
      return null;
    }
  }

  // Get connection info
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      connectedPrinter: this.connectedPrinter
    };
  }
}

// React Native Component
const BrotherQL820App = () => {
  const [printerService] = useState(new BrotherQL820Service());
  const [bluetoothPrinters, setBluetoothPrinters] = useState([]);
  const [wifiPrinters, setWifiPrinters] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [connectionType, setConnectionType] = useState('bluetooth');
  
  // Form states
  const [shippingData, setShippingData] = useState({
    toName: 'John Doe',
    toAddress: '123 Main Street',
    toCity: 'New York',
    toState: 'NY',
    toZip: '10001',
    fromName: 'Your Company',
    fromAddress: '456 Business Ave',
    trackingNumber: 'TRK123456789'
  });

  const [productData, setProductData] = useState({
    name: 'Sample Product',
    sku: 'PRD001',
    price: '29.99',
    barcode: '123456789012'
  });

  useEffect(() => {
    initializeService();
  }, []);

  const initializeService = async () => {
    const initialized = await printerService.initialize();
    if (!initialized) {
      Alert.alert('Error', 'Failed to initialize printer service');
    }
  };

  const scanForPrinters = async () => {
    try {
      setIsScanning(true);
      
      if (connectionType === 'bluetooth') {
        const printers = await printerService.searchBluetoothPrinters();
        setBluetoothPrinters(printers);
      } else {
        const printers = await printerService.searchWiFiPrinters();
        setWifiPrinters(printers);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to scan for printers');
    } finally {
      setIsScanning(false);
    }
  };

  const connectToPrinter = async (printer) => {
    const connected = await printerService.connectToPrinter(printer, connectionType);
    if (connected) {
      setIsConnected(true);
      Alert.alert('Success', `Connected to ${printer.modelName}`);
    } else {
      Alert.alert('Error', 'Failed to connect to printer');
    }
  };

  const printShippingLabel = async () => {
    const success = await printerService.printShippingLabel(shippingData);
    if (success) {
      Alert.alert('Success', 'Shipping label printed successfully');
    } else {
      Alert.alert('Error', 'Failed to print shipping label');
    }
  };

  const printProductLabel = async () => {
    const success = await printerService.printProductLabel(productData);
    if (success) {
      Alert.alert('Success', 'Product label printed successfully');
    } else {
      Alert.alert('Error', 'Failed to print product label');
    }
  };

  const testPrint = async () => {
    const zpl = new ZPLCode();
    zpl.labelHome(0, 0);
    zpl.text('Test Print', 50, 50, 'A', 'N', 30, 30);
    zpl.text('Brother QL-820NWB', 50, 100, 'A', 'N', 20, 20);
    zpl.text(`Date: ${new Date().toLocaleDateString()}`, 50, 150, 'A', 'N', 16, 16);
    
    const success = await printerService.printZPL(zpl.getZPL());
    if (success) {
      Alert.alert('Success', 'Test print completed');
    } else {
      Alert.alert('Error', 'Test print failed');
    }
  };

  const disconnect = async () => {
    await printerService.disconnect();
    setIsConnected(false);
    Alert.alert('Info', 'Disconnected from printer');
  };

  const currentPrinters = connectionType === 'bluetooth' ? bluetoothPrinters : wifiPrinters;

  const renderPrinter = ({ item }) => (
    <TouchableOpacity
      style={styles.printerItem}
      onPress={() => connectToPrinter(item)}
    >
      <Text style={styles.printerName}>{item.modelName}</Text>
      <Text style={styles.printerAddress}>
        {connectionType === 'bluetooth' ? item.macAddress : item.ipAddress}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Brother QL-820NWB Printer</Text>
      <Text style={styles.subtitle}>Latest react-native-brother-printing</Text>
      
      <Text style={styles.status}>
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </Text>

      {/* Connection Type Selector */}
      <View style={styles.connectionTypeContainer}>
        <TouchableOpacity
          style={[styles.typeButton, connectionType === 'bluetooth' && styles.activeType]}
          onPress={() => setConnectionType('bluetooth')}
        >
          <Text style={styles.typeButtonText}>Bluetooth</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, connectionType === 'wifi' && styles.activeType]}
          onPress={() => setConnectionType('wifi')}
        >
          <Text style={styles.typeButtonText}>WiFi</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={scanForPrinters}
        disabled={isScanning}
      >
        <Text style={styles.buttonText}>
          {isScanning ? 'Scanning...' : `Scan for ${connectionType} Printers`}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={currentPrinters}
        renderItem={renderPrinter}
        keyExtractor={(item) => item.macAddress || item.ipAddress}
        style={styles.printerList}
        scrollEnabled={false}
      />

      {isConnected && (
        <View style={styles.printingSection}>
          <TouchableOpacity style={styles.button} onPress={testPrint}>
            <Text style={styles.buttonText}>Test Print</Text>
          </TouchableOpacity>

          {/* Shipping Label Form */}
          <Text style={styles.sectionTitle}>Shipping Label</Text>
          <TextInput
            style={styles.input}
            placeholder="Recipient Name"
            value={shippingData.toName}
            onChangeText={(text) => setShippingData({...shippingData, toName: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Tracking Number"
            value={shippingData.trackingNumber}
            onChangeText={(text) => setShippingData({...shippingData, trackingNumber: text})}
          />
          
          <TouchableOpacity style={styles.button} onPress={printShippingLabel}>
            <Text style={styles.buttonText}>Print Shipping Label</Text>
          </TouchableOpacity>

          {/* Product Label Form */}
          <Text style={styles.sectionTitle}>Product Label</Text>
          <TextInput
            style={styles.input}
            placeholder="Product Name"
            value={productData.name}
            onChangeText={(text) => setProductData({...productData, name: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="SKU"
            value={productData.sku}
            onChangeText={(text) => setProductData({...productData, sku: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Price"
            value={productData.price}
            onChangeText={(text) => setProductData({...productData, price: text})}
          />
          
          <TouchableOpacity style={styles.button} onPress={printProductLabel}>
            <Text style={styles.buttonText}>Print Product Label</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={disconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    color: '#007AFF',
  },
  connectionTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'center',
  },
  typeButton: {
    backgroundColor: '#E5E5E5',
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    minWidth: 80,
  },
  activeType: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    marginTop: 20,
  },
  printerList: {
    maxHeight: 200,
    marginVertical: 20,
  },
  printerItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  printerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  printerAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  printingSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default BrotherQL820App;