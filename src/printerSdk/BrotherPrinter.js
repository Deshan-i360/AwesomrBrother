import { NativeModules } from 'react-native';

const { BrotherPrinter } = NativeModules;

// Printer Models
export const PrinterModels = {
  QL_820NWB: 'QL_820NWB',
  QL_810W: 'QL_810W',
  QL_800: 'QL_800',
  QL_700: 'QL_700',
};

// Label Sizes
export const LabelSizes = {
  ROLLW12: 'ROLLW12',  // 12mm
  ROLLW29: 'ROLLW29',  // 29mm
  ROLLW38: 'ROLLW38',  // 38mm
  ROLLW50: 'ROLLW50',  // 50mm
  ROLLW54: 'ROLLW54',  // 54mm
  ROLLW62: 'ROLLW62',  // 62mm
};

class BrotherPrinterManager {
  /**
   * Print an image via WiFi
   * @param {string} ipAddress - IP address of the printer
   * @param {string} imagePath - Full path to the image file
   * @param {string} printerModel - Printer model (use PrinterModels constants)
   * @param {string} labelSize - Label size (use LabelSizes constants)
   * @returns {Promise<string>} - Success message or error
   */
  async printImageWifi(ipAddress, imagePath, printerModel = PrinterModels.QL_820NWB, labelSize = LabelSizes.ROLLW29) {
    try {
      const result = await BrotherPrinter.printImageWifi(ipAddress, imagePath, printerModel, labelSize);
      return result;
    } catch (error) {
      console.error('BrotherPrinter WiFi Error:', error);
      throw error;
    }
  }

  /**
   * Print an image via Bluetooth
   * @param {string} macAddress - MAC address of the printer
   * @param {string} imagePath - Full path to the image file
   * @param {string} printerModel - Printer model (use PrinterModels constants)
   * @param {string} labelSize - Label size (use LabelSizes constants)
   * @returns {Promise<string>} - Success message or error
   */
  async printImageBluetooth(macAddress, imagePath, printerModel = PrinterModels.QL_820NWB, labelSize = LabelSizes.ROLLW29) {
    try {
      const result = await BrotherPrinter.printImageBluetooth(macAddress, imagePath, printerModel, labelSize);
      return result;
    } catch (error) {
      console.error('BrotherPrinter Bluetooth Error:', error);
      throw error;
    }
  }

  /**
   * Print a PDF file
   * @param {string} ipAddress - IP address of the printer
   * @param {string} modelName - Printer model name
   * @param {string} filePath - Full path to the PDF file
   * @returns {Promise<string>} - Success message or error
   */
  async printPdfWifi(ipAddress, modelName, filePath) {
    try {
      const result = await BrotherPrinter.printPdf(ipAddress, modelName, filePath);
      return result;
    } catch (error) {
      console.error('BrotherPrinter PDF Error:', error);
      throw error;
    }
  }

  /**
   * Check printer status
   * @param {string} ipAddress - IP address of the printer
   * @returns {Promise<Object>} - Printer status information
   */
  async checkPrinterStatus(ipAddress) {
    try {
      const status = await BrotherPrinter.checkPrinterStatus(ipAddress);
      return status;
    } catch (error) {
      console.error('BrotherPrinter Status Error:', error);
      throw error;
    }
  }

  /**
   * Discover available printers (placeholder implementation)
   * @returns {Promise<Array>} - Array of discovered printers
   */
  async discoverPrinters() {
    try {
      const printers = await BrotherPrinter.discoverPrinters();
      return printers;
    } catch (error) {
      console.error('BrotherPrinter Discovery Error:', error);
      throw error;
    }
  }

  async printPdfBluetooth(macAddress, modelName, filePath) {
    try {
      const result = await BrotherPrinter.printPdfBluetooth(macAddress, modelName, filePath);
      return result;
    } catch (error) {
      console.error('BrotherPrinter Bluetooth PDF Error:', error);
      throw error;
    }
  }


}

export default new BrotherPrinterManager();