package com.awesomrbrother

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import android.os.Build
import android.Manifest
import com.brother.sdk.lmprinter.Channel
import com.brother.sdk.lmprinter.OpenChannelError
import com.brother.sdk.lmprinter.PrinterDriverGenerator
import com.brother.sdk.lmprinter.PrinterModel
import com.brother.sdk.lmprinter.PrintError
import com.brother.sdk.lmprinter.setting.QLPrintSettings
import com.brother.ptouch.sdk.Printer
import com.brother.ptouch.sdk.PrinterInfo
import com.facebook.react.bridge.*
import java.io.*
import androidx.core.content.ContextCompat

class BrotherPrinterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BrotherPrinter"
    }

    override fun getName(): String {
        return "BrotherPrinter"
    }

    @ReactMethod
    fun printImageWifi(
        ipAddress: String,
        imagePath: String,
        printerModel: String,
        labelSize: String,
        promise: Promise
    ) {
        try {
            val channel = Channel.newWifiChannel(ipAddress)
            val result = PrinterDriverGenerator.openChannel(channel)

            if (result.error.code != OpenChannelError.ErrorCode.NoError) {
                Log.e(TAG, "Error - Open Channel: ${result.error.code}")
                promise.reject("CHANNEL_ERROR", "Failed to open WiFi channel: ${result.error.code}")
                return
            }

            Log.d(TAG, "Success - Open Channel")
            val printerDriver = result.driver

            // Check if file exists
            val file = File(imagePath)
            if (!file.exists()) {
                printerDriver.closeChannel()
                promise.reject("FILE_ERROR", "Image file not found at path: $imagePath")
                return
            }

            // Setup print settings
            val model = getPrinterModel(printerModel)
            val printSettings = QLPrintSettings(model)
            printSettings.labelSize = getLabelSize(labelSize)
            printSettings.isAutoCut = true
            printSettings.workPath = reactApplicationContext.getExternalFilesDir(null)?.toString()

            // Print the image
            val printError = printerDriver.printImage(imagePath, printSettings)

            if (printError.code != PrintError.ErrorCode.NoError) {
                Log.e(TAG, "Error - Print Image: ${printError.code}")
                promise.reject("PRINT_ERROR", "Failed to print image: ${printError.code}")
            } else {
                Log.d(TAG, "Success - Print Image")
                promise.resolve("Image printed successfully")
            }

            printerDriver.closeChannel()

        } catch (e: Exception) {
            Log.e(TAG, "Exception in printImageWifi", e)
            promise.reject("EXCEPTION", e.message ?: "Unknown error occurred")
        }
    }

    @ReactMethod
    fun printImageBluetooth(
        macAddress: String,
        imagePath: String,
        printerModel: String,
        labelSize: String,
        promise: Promise
    ) {
        try {
            val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE)as BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter
            if (bluetoothAdapter == null) {
                promise.reject("BLUETOOTH_ERROR", "Bluetooth not supported on this device")
                return
            }

            if (!bluetoothAdapter.isEnabled) {
                promise.reject("BLUETOOTH_ERROR", "Bluetooth is not enabled")
                return
            }

            val channel = Channel.newBluetoothChannel(macAddress, bluetoothAdapter)
            val result = PrinterDriverGenerator.openChannel(channel)

            if (result.error.code != OpenChannelError.ErrorCode.NoError) {
                Log.e(TAG, "Error - Open Bluetooth Channel: ${result.error.code}")
                promise.reject("CHANNEL_ERROR", "Failed to open Bluetooth channel: ${result.error.code}")
                return
            }

            Log.d(TAG, "Success - Open Bluetooth Channel")
            val printerDriver = result.driver

            // Check if file exists
            val file = File(imagePath)
            if (!file.exists()) {
                printerDriver.closeChannel()
                promise.reject("FILE_ERROR", "Image file not found at path: $imagePath")
                return
            }

            // Setup print settings
            val model = getPrinterModel(printerModel)
            val printSettings = QLPrintSettings(model)
            printSettings.labelSize = getLabelSize(labelSize)
            printSettings.isAutoCut = true
            printSettings.workPath = reactApplicationContext.getExternalFilesDir(null)?.toString()

            // Print the image
            val printError = printerDriver.printImage(imagePath, printSettings)

            if (printError.code != PrintError.ErrorCode.NoError) {
                Log.e(TAG, "Error - Print Image via Bluetooth: ${printError.code}")
                promise.reject("PRINT_ERROR", "Failed to print image via Bluetooth: ${printError.code}")
            } else {
                Log.d(TAG, "Success - Print Image via Bluetooth")
                promise.resolve("Image printed successfully via Bluetooth")
            }

            printerDriver.closeChannel()

        } catch (e: Exception) {
            Log.e(TAG, "Exception in printImageBluetooth", e)
            promise.reject("EXCEPTION", e.message ?: "Unknown error occurred")
        }
    }

    @ReactMethod
    fun printPdf(
        ipAddress: String,
        modelName: String,
        filePath: String,
        promise: Promise
    ) {
        try {
            val printer = Printer()
            val printerInfo = PrinterInfo()

            // Set printer model
            try {
                printerInfo.printerModel = PrinterInfo.Model.valueOf(modelName)
            } catch (e: IllegalArgumentException) {
                promise.reject("MODEL_ERROR", "Invalid printer model: $modelName")
                return
            }

            printerInfo.ipAddress = ipAddress
            printerInfo.port = PrinterInfo.Port.NET
            printer.printerInfo = printerInfo

            if (!printer.startCommunication()) {
                promise.reject("CONNECTION_ERROR", "Could not connect to printer at $ipAddress")
                return
            }

            // Check if PDF file exists
            val file = File(filePath)
            if (!file.exists()) {
                printer.endCommunication()
                promise.reject("FILE_ERROR", "PDF file not found at path: $filePath")
                return
            }

            // Print the PDF
            val result = printer.printPdfFile(file.absolutePath,1)
            printer.endCommunication()

            if (result.errorCode.name === PrinterInfo.ErrorCode.ERROR_NONE.toString()) {
                promise.resolve("PDF printed successfully")
            } else {
                promise.reject("PRINT_ERROR", "PDF printing failed")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Exception in printPdf", e)
            promise.reject("EXCEPTION", e.message ?: "Unknown error occurred in PDF printing")
        }
    }

 @ReactMethod
   fun printPdfBluetooth(
    macAddress: String,
    modelName: String,
    filePath: String,
    promise: Promise
    ) {
    try {
        // Method 1: Try BluetoothManager first (API 18+)
        var bluetoothAdapter: BluetoothAdapter? = null
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            bluetoothAdapter = bluetoothManager?.adapter
        }
        
        // Method 2: Fallback to BluetoothAdapter.getDefaultAdapter()
        if (bluetoothAdapter == null) {
            bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
        }
        
        // Check if Bluetooth is supported
        if (bluetoothAdapter == null) {
            promise.reject("BLUETOOTH_ERROR", "Bluetooth not supported on this device")
            return
        }

        // Check if Bluetooth is enabled
        if (!bluetoothAdapter.isEnabled) {
            promise.reject("BLUETOOTH_ERROR", "Bluetooth is not enabled. Please enable Bluetooth and try again.")
            return
        }

        // Check runtime permissions for Android 6+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val hasBluetoothPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+
                ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.BLUETOOTH_CONNECT
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                // Android 6-11
                ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.BLUETOOTH
                ) == PackageManager.PERMISSION_GRANTED
            }

            if (!hasBluetoothPermission) {
                promise.reject("PERMISSION_ERROR", "Bluetooth permission not granted")
                return
            }
        }

        // Validate MAC address format
        if (!BluetoothAdapter.checkBluetoothAddress(macAddress)) {
            promise.reject("ADDRESS_ERROR", "Invalid MAC address format: $macAddress")
            return
        }

        val printer = Printer()
        val printerInfo = PrinterInfo()

        // Set printer model
        try {
            printerInfo.printerModel = PrinterInfo.Model.valueOf(modelName)
        } catch (e: IllegalArgumentException) {
            promise.reject("MODEL_ERROR", "Invalid printer model: $modelName. Available models: ${PrinterInfo.Model.values().joinToString(", ")}")
            return
        }

        // Configure for Bluetooth connection
        printerInfo.macAddress = macAddress
        printerInfo.port = PrinterInfo.Port.BLUETOOTH
        printer.printerInfo = printerInfo

        // Start communication with timeout
        val connectionStartTime = System.currentTimeMillis()
        val connectionTimeout = 30000 // 30 seconds
        var isConnected = false
        
        Thread {
            isConnected = printer.startCommunication()
        }.apply {
            start()
            join(connectionTimeout.toLong())
        }

        if (!isConnected || System.currentTimeMillis() - connectionStartTime > connectionTimeout) {
            printer.endCommunication()
            promise.reject("CONNECTION_ERROR", "Could not connect to printer via Bluetooth at $macAddress within timeout period")
            return
        }

        // Check if PDF file exists and is readable
        val file = File(filePath)
        if (!file.exists()) {
            printer.endCommunication()
            promise.reject("FILE_ERROR", "PDF file not found at path: $filePath")
            return
        }

        if (!file.canRead()) {
            printer.endCommunication()
            promise.reject("FILE_ERROR", "Cannot read PDF file at path: $filePath")
            return
        }

        // Print the PDF
        Log.d(TAG, "Starting PDF print to Bluetooth printer: $macAddress")
        val result = printer.printPdfFile(file.absolutePath, 1)
        printer.endCommunication()

        if (result.errorCode == PrinterInfo.ErrorCode.ERROR_NONE) {
            Log.d(TAG, "Success - PDF printed via Bluetooth")
            promise.resolve("PDF printed successfully via Bluetooth")
        } else {
            Log.e(TAG, "Error - PDF printing via Bluetooth: ${result.errorCode}")
            promise.reject("PRINT_ERROR", "PDF printing via Bluetooth failed: ${result.errorCode.name}")
        }

    } catch (e: SecurityException) {
        Log.e(TAG, "Security exception in printPdfBluetooth - missing permissions", e)
        promise.reject("PERMISSION_ERROR", "Missing Bluetooth permissions: ${e.message}")
    } catch (e: Exception) {
        Log.e(TAG, "Exception in printPdfBluetooth", e)
        promise.reject("EXCEPTION", e.message ?: "Unknown error occurred in Bluetooth PDF printing")
    }
}





    @ReactMethod
    fun discoverPrinters(promise: Promise) {
        try {
            // This is a placeholder for printer discovery
            // Brother SDK might have specific discovery methods depending on the version
            val discoveredPrinters = WritableNativeArray()

            // Add sample discovered printer format
            val samplePrinter = WritableNativeMap()
            samplePrinter.putString("name", "Brother QL-820NWB")
            samplePrinter.putString("ipAddress", "192.168.1.100")
            samplePrinter.putString("macAddress", "00:80:77:XX:XX:XX")

            promise.resolve("Printer discovery not implemented. Use specific IP/MAC addresses.")

        } catch (e: Exception) {
            promise.reject("DISCOVERY_ERROR", e.message ?: "Failed to discover printers")
        }
    }

    @ReactMethod
    fun checkPrinterStatus(ipAddress: String, promise: Promise) {
        try {
            val channel = Channel.newWifiChannel(ipAddress)
            val result = PrinterDriverGenerator.openChannel(channel)

            if (result.error.code != OpenChannelError.ErrorCode.NoError) {
                promise.reject("CONNECTION_ERROR", "Cannot connect to printer: ${result.error.code}")
                return
            }

            val printerDriver = result.driver

            // Get printer status (this depends on the specific Brother SDK version)
            val statusMap = WritableNativeMap()
            statusMap.putString("status", "online")
            statusMap.putString("connection", "connected")

            printerDriver.closeChannel()
            promise.resolve(statusMap)

        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", e.message ?: "Failed to check printer status")
        }
    }

    // Helper methods
    private fun getPrinterModel(modelName: String): PrinterModel {
        return when (modelName.uppercase()) {
            "QL_820NWB" -> PrinterModel.QL_820NWB
            "QL_810W" -> PrinterModel.QL_810W
            "QL_800" -> PrinterModel.QL_800
            else -> PrinterModel.QL_820NWB // Default fallback
        }
    }

    private fun getLabelSize(sizeString: String): QLPrintSettings.LabelSize {
        return when (sizeString.uppercase()) {
            "ROLLW12" -> QLPrintSettings.LabelSize.RollW12
            "ROLLW29" -> QLPrintSettings.LabelSize.RollW29
            "ROLLW38" -> QLPrintSettings.LabelSize.RollW38
            "ROLLW50" -> QLPrintSettings.LabelSize.RollW50
            "ROLLW54" -> QLPrintSettings.LabelSize.RollW54
            "ROLLW62" -> QLPrintSettings.LabelSize.RollW62
            else -> QLPrintSettings.LabelSize.RollW62 // Default fallback
        }
    }
}