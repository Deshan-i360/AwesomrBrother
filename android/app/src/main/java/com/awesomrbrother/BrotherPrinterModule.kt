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
import com.brother.sdk.lmprinter.PrinterDriver
import com.brother.sdk.lmprinter.setting.PrintImageSettings

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
//            val file = File(imagePath)
//            if (!file.exists()) {
//                printerDriver.closeChannel()
//                promise.reject("FILE_ERROR", "Image file not found at path: $imagePath")
//                return
//            }

            val actualFilePath = getValidFilePath(imagePath)
            if (actualFilePath == null) {
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
            val printError = printerDriver.printImage(actualFilePath, printSettings)

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
            val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
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

            // Get the correct file path
            val actualFilePath = getValidFilePath(imagePath)
            if (actualFilePath == null) {
                printerDriver.closeChannel()
                promise.reject("FILE_ERROR", "Image file not found at path: $imagePath")
                return
            }

            // Setup print settings
//          val model = getPrinterModel(printerModel)
            val model = PrinterModel.QL_820NWB
            val printSettings = QLPrintSettings(model)
            printSettings.labelSize = QLPrintSettings.LabelSize.DieCutW29H90
            printSettings.scaleMode =PrintImageSettings.ScaleMode.FitPaperAspect
            printSettings.isAutoCut = true
            printSettings.workPath = reactApplicationContext.getExternalFilesDir(null)?.toString()

//            printSettings.isCutAtEnd = true


            // Print the image
            val printError = printerDriver.printImage(actualFilePath, printSettings)

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

    private fun getValidFilePath(filePath: String): String? {
        // First, try the original path (removing file:// prefix if present)
        val cleanPath = if (filePath.startsWith("file://")) {
            filePath.substring(7)
        } else {
            filePath
        }

        val file = File(cleanPath)
        if (file.exists()) {
            return cleanPath
        }

        // If original doesn't exist, try to copy to accessible location
        return copyFileToAccessibleLocation(filePath)
    }

    private fun copyFileToAccessibleLocation(originalPath: String): String? {
        try {
            val cleanPath = if (originalPath.startsWith("file://")) {
                originalPath.substring(7)
            } else {
                originalPath
            }

            val sourceFile = File(cleanPath)
            if (!sourceFile.exists()) return null

            // Get the original file extension
            val originalExtension = sourceFile.extension.lowercase()
            val fileExtension = if (originalExtension.isNotEmpty()) {
                ".$originalExtension"
            } else {
                // Fallback: try to determine from content or default
                when {
                    originalPath.contains(".pdf", ignoreCase = true) -> ".pdf"
                    originalPath.contains(".jpg", ignoreCase = true) -> ".jpg"
                    originalPath.contains(".jpeg", ignoreCase = true) -> ".jpeg"
                    originalPath.contains(".png", ignoreCase = true) -> ".png"
                    else -> ".tmp" // Generic fallback
                }
            }

            val destDir = reactApplicationContext.getExternalFilesDir(null)
            val destFile = File(destDir, "temp_print_${System.currentTimeMillis()}$fileExtension")

            Log.d(TAG, "Copying file from: $cleanPath to: ${destFile.absolutePath}")

            sourceFile.copyTo(destFile, overwrite = true)
            return destFile.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "Error copying file", e)
            return null
        }
    }

    // Optional: Add a specific function for better file type handling
    private fun getValidFilePathWithType(filePath: String, expectedType: String): String? {
        val validPath = getValidFilePath(filePath)

        if (validPath == null) {
            Log.e(TAG, "File not found: $filePath")
            return null
        }

        // Verify file type
        val fileExtension = File(validPath).extension.lowercase()
        val isValidType = when (expectedType.lowercase()) {
            "pdf" -> fileExtension == "pdf"
            "image" -> fileExtension in listOf("jpg", "jpeg", "png", "bmp", "gif")
            else -> true // Allow any type
        }

        if (!isValidType) {
            Log.e(TAG, "Invalid file type. Expected: $expectedType, Got: $fileExtension")
            return null
        }

        return validPath
    }

    @ReactMethod
    fun printPdfBluetooth(
        macAddress: String,
        modelName: String,
        filePath: String,
        promise: Promise
    ) {
        try {
            val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter
            if (bluetoothAdapter == null) {
                promise.reject("BLUETOOTH_ERROR", "Bluetooth not supported on this device")
                return
            }

            if (!bluetoothAdapter.isEnabled) {
                promise.reject("BLUETOOTH_ERROR", "Bluetooth is not enabled")
                return
            }

            // Use the legacy Printer class for PDF printing via Bluetooth
            val printer = Printer()
            val printerInfo = PrinterInfo()

            // Set printer model
            try {
                printerInfo.printerModel = PrinterInfo.Model.QL_820NWB
            } catch (e: IllegalArgumentException) {
                promise.reject("MODEL_ERROR", "Invalid printer model: $modelName")
                return
            }

            // Set Bluetooth connection
            printerInfo.macAddress = macAddress
            printerInfo.port = PrinterInfo.Port.BLUETOOTH
            printer.printerInfo = printerInfo

            // Get the correct file path
            val actualFilePath = getValidFilePath(filePath)
            if (actualFilePath == null) {
                promise.reject("FILE_ERROR", "PDF file not found at path: $filePath")
                return
            }

            // Verify it's actually a PDF file
            if (!actualFilePath.lowercase().endsWith(".pdf")) {
                promise.reject("FILE_ERROR", "File is not a PDF: $actualFilePath")
                return
            }

            // Verify it's actually a PDF file
            if (!actualFilePath.lowercase().endsWith(".pdf")) {
                promise.reject("FILE_ERROR", "File is not a PDF: $actualFilePath")
                return
            }

            // Start communication
            if (!printer.startCommunication()) {
                promise.reject("CONNECTION_ERROR", "Could not connect to printer via Bluetooth")
                return
            }

            // Print the PDF
            val result = printer.printPdfFile(actualFilePath, 1)
            printer.endCommunication()

            if (result.errorCode == PrinterInfo.ErrorCode.ERROR_NONE) {
                promise.resolve("PDF printed successfully via Bluetooth")
            } else {
                promise.reject("PRINT_ERROR", "PDF printing failed: ${result.errorCode}")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Exception in printPdfBluetooth", e)
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
                printerInfo.printerModel = PrinterInfo.Model.QL_820NWB
            } catch (e: IllegalArgumentException) {
                promise.reject("MODEL_ERROR", "Invalid printer model: $modelName")
                return
            }

            // Set WiFi connection
            printerInfo.ipAddress = ipAddress
            printerInfo.port = PrinterInfo.Port.NET
            printer.printerInfo = printerInfo

            // Get the correct file path
            val actualFilePath = getValidFilePath(filePath)
            if (actualFilePath == null) {
                promise.reject("FILE_ERROR", "PDF file not found at path: $filePath")
                return
            }

            // Start communication
            if (!printer.startCommunication()) {
                promise.reject("CONNECTION_ERROR", "Could not connect to printer at $ipAddress")
                return
            }

            // Print the PDF
            val result = printer.printPdfFile(actualFilePath, 1)
            printer.endCommunication()

            if (result.errorCode == PrinterInfo.ErrorCode.ERROR_NONE) {
                promise.resolve("PDF printed successfully")
            } else {
                promise.reject("PRINT_ERROR", "PDF printing failed: ${result.errorCode}")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Exception in printPdf", e)
            promise.reject("EXCEPTION", e.message ?: "Unknown error occurred in PDF printing")
        }
    }

// @ReactMethod
// fun setLabelAutoCut(
//     ipAddress: String,
//     autoCut: Boolean,
//     promise: Promise
// ) {
//     try {
//         val channel = Channel.(ipAddress)
//         val result = PrinterDriverGenerator.openChannel(channel)

//         if (result.error.code != OpenChannelError.ErrorCode.NoError) {
//             promise.reject("CHANNEL_ERROR", "Failed to open WiFi channel: ${result.error.code}")
//             return
//         }

//         val printerDriver = result.driver

//         // Set auto cut setting
//         val printSettings = QLPrintSettings(PrinterModel.QL_820NWB)
//         printSettings.isAutoCut = autoCut

//         // Apply settings
//         val setError = printerDriver.setPrintSettings(printSettings)

//         if (setError.code != PrintError.ErrorCode.NoError) {
//             promise.reject("SETTINGS_ERROR", "Failed to set label auto cut: ${setError.code}")
//         } else {
//             promise.resolve("Label auto cut setting updated successfully")
//         }

//         printerDriver.closeChannel()

//     } catch (e: Exception) {
//         promise.reject("EXCEPTION", e.message ?: "Unknown error occurred while setting label auto cut")
//     }
// }





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