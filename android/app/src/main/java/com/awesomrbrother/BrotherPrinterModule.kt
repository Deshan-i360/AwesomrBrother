package com.awesomrbrother

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothDevice
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
import java.util.concurrent.Executors
import androidx.core.content.ContextCompat
import com.brother.sdk.lmprinter.PrinterDriver
import com.brother.sdk.lmprinter.setting.PrintImageSettings

class BrotherPrinterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BrotherPrinter"
        private const val DISCOVERY_TIMEOUT = 10000L // 10 seconds
        private const val CONNECTION_TIMEOUT = 5000 // 5 seconds
    }

    private val executor = Executors.newCachedThreadPool()

    override fun getName(): String {
        return "BrotherPrinter"
    }

//     @ReactMethod
//     fun printImageWifi(
//         ipAddress: String,
//         imagePath: String,
//         printerModel: String,
//         labelSize: String,
//         promise: Promise
//     ) {
//         try {
//             val channel = Channel.newWifiChannel(ipAddress)
//             val result = PrinterDriverGenerator.openChannel(channel)

//             if (result.error.code != OpenChannelError.ErrorCode.NoError) {
//                 Log.e(TAG, "Error - Open Channel: ${result.error.code}")
//                 promise.reject("CHANNEL_ERROR", "Failed to open WiFi channel: ${result.error.code}")
//                 return
//             }

//             Log.d(TAG, "Success - Open Channel")
//             val printerDriver = result.driver

//             // Check if file exists
// //            val file = File(imagePath)
// //            if (!file.exists()) {
// //                printerDriver.closeChannel()
// //                promise.reject("FILE_ERROR", "Image file not found at path: $imagePath")
// //                return
// //            }

//             val actualFilePath = getValidFilePath(imagePath)
//             if (actualFilePath == null) {
//                 printerDriver.closeChannel()
//                 promise.reject("FILE_ERROR", "Image file not found at path: $imagePath")
//                 return
//             }



//             // Setup print settings
//             val model = getPrinterModel(printerModel)
//             val printSettings = QLPrintSettings(model)
//             printSettings.labelSize = getLabelSize(labelSize)
//             printSettings.isAutoCut = true
//             printSettings.workPath = reactApplicationContext.getExternalFilesDir(null)?.toString()

//             // Print the image
//             val printError = printerDriver.printImage(actualFilePath, printSettings)

//             if (printError.code != PrintError.ErrorCode.NoError) {
//                 Log.e(TAG, "Error - Print Image: ${printError.code}")
//                 promise.reject("PRINT_ERROR", "Failed to print image: ${printError.code}")
//             } else {
//                 Log.d(TAG, "Success - Print Image")
//                 promise.resolve("Image printed successfully")
//             }

//             printerDriver.closeChannel()

//         } catch (e: Exception) {
//             Log.e(TAG, "Exception in printImageWifi", e)
//             promise.reject("EXCEPTION", e.message ?: "Unknown error occurred")
//         }
//     }

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
            printSettings.printOrientation = PrintImageSettings.Orientation.Landscape
            printSettings.halftone = PrintImageSettings.Halftone.Threshold
//            printSettings.hAlignment = PrintImageSettings.HAlignment.Center
//            printSettings.vAlignment = PrintImageSettings.VAlignment.Middle

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

//    @ReactMethod
//    fun printPdfBluetooth(
//        macAddress: String,
//        modelName: String,
//        filePath: String,
//        promise: Promise
//    ) {
//        try {
//            val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
//            val bluetoothAdapter = bluetoothManager.adapter
//            if (bluetoothAdapter == null) {
//                promise.reject("BLUETOOTH_ERROR", "Bluetooth not supported on this device")
//                return
//            }
//
//            if (!bluetoothAdapter.isEnabled) {
//                promise.reject("BLUETOOTH_ERROR", "Bluetooth is not enabled")
//                return
//            }
//
//            // Use the legacy Printer class for PDF printing via Bluetooth
//            val printer = Printer()
//            val printerInfo = PrinterInfo()
//
//            // Set printer model
//            try {
//                printerInfo.printerModel = PrinterInfo.Model.QL_820NWB
//            } catch (e: IllegalArgumentException) {
//                promise.reject("MODEL_ERROR", "Invalid printer model: $modelName")
//                return
//            }
//
//            // Set Bluetooth connection
//            printerInfo.macAddress = macAddress
//            printerInfo.port = PrinterInfo.Port.BLUETOOTH
//
//            // CRITICAL: Set paper type for PDF printing
//            // For QL-820NWB, use continuous length paper for PDFs
//            printerInfo.paperSize = PrinterInfo.PaperSize.CUSTOM
//            // Or try these alternatives:
//            // printerInfo.paperSize = PrinterInfo.PaperSize.ROLL_W62
//            // printerInfo.paperSize = PrinterInfo.PaperSize.ROLL_W29
//
//            // Set print quality and other settings for PDF
//            printerInfo.printMode = PrinterInfo.PrintMode.ORIGINAL
//            printerInfo.orientation = PrinterInfo.Orientation.PORTRAIT
//
//            printer.printerInfo = printerInfo
//
//            // Get the correct file path
//            val actualFilePath = getValidFilePath(filePath)
//            if (actualFilePath == null) {
//                promise.reject("FILE_ERROR", "PDF file not found at path: $filePath")
//                return
//            }
//
//            // Verify it's actually a PDF file
//            if (!actualFilePath.lowercase().endsWith(".pdf")) {
//                promise.reject("FILE_ERROR", "File is not a PDF: $actualFilePath")
//                return
//            }
//
//            // Start communication
//            if (!printer.startCommunication()) {
//                promise.reject("CONNECTION_ERROR", "Could not connect to printer via Bluetooth")
//                return
//            }
//
//            // Print the PDF with proper settings
//            val printSettings = PrintSettings()
//            printSettings.copies = 1
//            printSettings.halftone = PrintSettings.Halftone.THRESHOLD
//
//            val result = printer.printPdfFile(actualFilePath, printSettings)
//            printer.endCommunication()
//
//            if (result.errorCode == PrinterInfo.ErrorCode.ERROR_NONE) {
//                promise.resolve("PDF printed successfully via Bluetooth")
//            } else {
//                promise.reject("PRINT_ERROR", "PDF printing failed: ${result.errorCode}")
//            }
//
//        } catch (e: Exception) {
//            Log.e(TAG, "Exception in printPdfBluetooth", e)
//            promise.reject("EXCEPTION", e.message ?: "Unknown error occurred")
//        }
//    }

    // Alternative method using newer Brother SDK approach
    @ReactMethod
    fun printPdfBluetoothV2(
        macAddress: String,
        printerModel: String,
        labelSize: String,
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
            val actualFilePath = getValidFilePath(filePath)
            if (actualFilePath == null) {
                printerDriver.closeChannel()
                promise.reject("FILE_ERROR", "PDF file not found at path: $filePath")
                return
            }

            // Setup print settings for PDF (different from image settings)
            val model = getPrinterModel(printerModel)
            val printSettings = QLPrintSettings(model)

            // CRITICAL: Use different label size for PDF
            // printSettings.labelSize = QLPrintSettings.LabelSize.DieCutW29H90 // Try continuous roll
            printSettings.labelSize = getLabelSize(labelSize) // Try continuous roll

            // Or try these alternatives:
            // printSettings.labelSize = QLPrintSettings.LabelSize.RollW29
            // printSettings.labelSize = QLPrintSettings.LabelSize.DieCutW62H29

            printSettings.isAutoCut = true
            printSettings.workPath = reactApplicationContext.getExternalFilesDir(null)?.toString()

            // PDF-specific settings
            printSettings.scaleMode = PrintImageSettings.ScaleMode.FitPaperAspect


            // Set orientation to landscape if available
            printSettings.printOrientation =PrintImageSettings.Orientation.Landscape

            // Ensure proper alignment
//            printSettings.halftone = QLPrintSettings.Halftone.Threshold
            // printSettings.hAlignment = PrintImageSettings.HorizontalAlignment.Center
//            printSettings.vAlignment = QLPrintSettings.VAlignment.Middle
            // Or try: PrintImageSettings.ScaleMode.FitPaper

            // Print the PDF
            val printError = printerDriver.printPDF(actualFilePath, printSettings)

            if (printError.code != PrintError.ErrorCode.NoError) {
                Log.e(TAG, "Error - Print PDF via Bluetooth: ${printError.code}")
                promise.reject("PRINT_ERROR", "Failed to print PDF via Bluetooth: ${printError.code}")
            } else {
                Log.d(TAG, "Success - Print PDF via Bluetooth")
                promise.resolve("PDF printed successfully via Bluetooth")
            }

            printerDriver.closeChannel()

        } catch (e: Exception) {
            Log.e(TAG, "Exception in printPdfBluetoothV2", e)
            promise.reject("EXCEPTION", e.message ?: "Unknown error occurred")
        }
    }

//     @ReactMethod
//     fun printPdfBluetoothV2Array(
//         macAddress: String,
//         modelName: String,
//         filePath: String,
//         promise: Promise
//     ) {
//         try {
//             val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
//             val bluetoothAdapter = bluetoothManager.adapter
//             if (bluetoothAdapter == null) {
//                 promise.reject("BLUETOOTH_ERROR", "Bluetooth not supported on this device")
//                 return
//             }

//             if (!bluetoothAdapter.isEnabled) {
//                 promise.reject("BLUETOOTH_ERROR", "Bluetooth is not enabled")
//                 return
//             }

//             val channel = Channel.newBluetoothChannel(macAddress, bluetoothAdapter)
//             val result = PrinterDriverGenerator.openChannel(channel)

//             if (result.error.code != OpenChannelError.ErrorCode.NoError) {
//                 Log.e(TAG, "Error - Open Bluetooth Channel: ${result.error.code}")
//                 promise.reject("CHANNEL_ERROR", "Failed to open Bluetooth channel: ${result.error.code}")
//                 return
//             }

//             Log.d(TAG, "Success - Open Bluetooth Channel")
//             val printerDriver = result.driver

//             // Get the correct file path
//             val actualFilePath = getValidFilePath(filePath)
//             if (actualFilePath == null) {
//                 printerDriver.closeChannel()
//                 promise.reject("FILE_ERROR", "PDF file not found at path: $filePath")
//                 return
//             }

//             // Setup print settings for PDF (different from image settings)
//             val model = PrinterModel.QL_820NWB
//             val printSettings = QLPrintSettings(model)

//             // CRITICAL: Use different label size for PDF
//             printSettings.labelSize = QLPrintSettings.LabelSize.DieCutW29H90 // Try continuous roll
//             // Or try these alternatives:
//             // printSettings.labelSize = QLPrintSettings.LabelSize.RollW29
//             // printSettings.labelSize = QLPrintSettings.LabelSize.DieCutW62H29

//             printSettings.isAutoCut = true
//             printSettings.workPath = reactApplicationContext.getExternalFilesDir(null)?.toString()

//             // PDF-specific settings
//             printSettings.scaleMode = PrintImageSettings.ScaleMode.FitPaperAspect


//             // Set orientation to landscape if available
//             printSettings.printOrientation =PrintImageSettings.Orientation.Landscape

//             // Ensure proper alignment
// //            printSettings.halftone = QLPrintSettings.Halftone.Threshold
//             printSettings.hAlignment = PrintImageSettings.HorizontalAlignment.Center
// //            printSettings.vAlignment = QLPrintSettings.VAlignment.Middle
//             // Or try: PrintImageSettings.ScaleMode.FitPaper

//             // Print the PDF
//             val printError = printerDriver.printImage(actualFilePath, printSettings)

//             if (printError.code != PrintError.ErrorCode.NoError) {
//                 Log.e(TAG, "Error - Print PDF via Bluetooth: ${printError.code}")
//                 promise.reject("PRINT_ERROR", "Failed to print PDF via Bluetooth: ${printError.code}")
//             } else {
//                 Log.d(TAG, "Success - Print PDF via Bluetooth")
//                 promise.resolve("PDF printed successfully via Bluetooth")
//             }

//             printerDriver.closeChannel()

//         } catch (e: Exception) {
//             Log.e(TAG, "Exception in printPdfBluetoothV2", e)
//             promise.reject("EXCEPTION", e.message ?: "Unknown error occurred")
//         }
//     }


    // @ReactMethod
    // fun printPdf(
    //     ipAddress: String,
    //     modelName: String,
    //     filePath: String,
    //     promise: Promise
    // ) {
    //     try {
    //         val printer = Printer()
    //         val printerInfo = PrinterInfo()

    //         // Set printer model
    //         try {
    //             printerInfo.printerModel = PrinterInfo.Model.QL_820NWB
    //         } catch (e: IllegalArgumentException) {
    //             promise.reject("MODEL_ERROR", "Invalid printer model: $modelName")
    //             return
    //         }

    //         // Set WiFi connection
    //         printerInfo.ipAddress = ipAddress
    //         printerInfo.port = PrinterInfo.Port.NET
    //         printer.printerInfo = printerInfo

    //         // Get the correct file path
    //         val actualFilePath = getValidFilePath(filePath)
    //         if (actualFilePath == null) {
    //             promise.reject("FILE_ERROR", "PDF file not found at path: $filePath")
    //             return
    //         }

    //         // Start communication
    //         if (!printer.startCommunication()) {
    //             promise.reject("CONNECTION_ERROR", "Could not connect to printer at $ipAddress")
    //             return
    //         }

    //         // Print the PDF
    //         val result = printer.printPdfFile(actualFilePath, 1)
    //         printer.endCommunication()

    //         if (result.errorCode == PrinterInfo.ErrorCode.ERROR_NONE) {
    //             promise.resolve("PDF printed successfully")
    //         } else {
    //             promise.reject("PRINT_ERROR", "PDF printing failed: ${result.errorCode}")
    //         }

    //     } catch (e: Exception) {
    //         Log.e(TAG, "Exception in printPdf", e)
    //         promise.reject("EXCEPTION", e.message ?: "Unknown error occurred in PDF printing")
    //     }
    // }

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





    // @ReactMethod
    // fun discoverPrinters(promise: Promise) {
    //     try {
    //         // This is a placeholder for printer discovery
    //         // Brother SDK might have specific discovery methods depending on the version
    //         val discoveredPrinters = WritableNativeArray()

    //         // Add sample discovered printer format
    //         val samplePrinter = WritableNativeMap()
    //         samplePrinter.putString("name", "Brother QL-820NWB")
    //         samplePrinter.putString("ipAddress", "192.168.1.100")
    //         samplePrinter.putString("macAddress", "00:80:77:XX:XX:XX")

    //         promise.resolve("Printer discovery not implemented. Use specific IP/MAC addresses.")

    //     } catch (e: Exception) {
    //         promise.reject("DISCOVERY_ERROR", e.message ?: "Failed to discover printers")
    //     }
    // }

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
            "DieCutW17H54" -> QLPrintSettings.LabelSize.DieCutW17H54
            "DieCutW17H87" -> QLPrintSettings.LabelSize.DieCutW17H87
            "DieCutW23H23" -> QLPrintSettings.LabelSize.DieCutW23H23
            "DieCutW29H42" -> QLPrintSettings.LabelSize.DieCutW29H42
            "DieCutW29H90" -> QLPrintSettings.LabelSize.DieCutW29H90
            "DieCutW38H90" -> QLPrintSettings.LabelSize.DieCutW38H90
            "DieCutW39H48" -> QLPrintSettings.LabelSize.DieCutW39H48
            "DieCutW52H29" -> QLPrintSettings.LabelSize.DieCutW52H29
            "DieCutW62H29" -> QLPrintSettings.LabelSize.DieCutW62H29
            "DieCutW62H60" -> QLPrintSettings.LabelSize.DieCutW62H60
            "DieCutW62H75" -> QLPrintSettings.LabelSize.DieCutW62H75
            "DieCutW62H100" -> QLPrintSettings.LabelSize.DieCutW62H100
            "DieCutW60H86" -> QLPrintSettings.LabelSize.DieCutW60H86
            "DieCutW54H29" -> QLPrintSettings.LabelSize.DieCutW54H29
            "DieCutW102H51" -> QLPrintSettings.LabelSize.DieCutW102H51
            "DieCutW102H152" -> QLPrintSettings.LabelSize.DieCutW102H152
            "DieCutW103H164" -> QLPrintSettings.LabelSize.DieCutW103H164
            else -> QLPrintSettings.LabelSize.DieCutW29H90 // Default fallback
        }
    }


     @ReactMethod
    fun searchBluetoothPrinters(promise: Promise) {
        try {
            // Check Bluetooth permissions
            if (!hasBluetoothPermissions()) {
                promise.reject("PERMISSION_ERROR", "Bluetooth permissions not granted")
                return
            }

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

            val discoveredPrinters = WritableNativeArray()
            val pairedDevices = bluetoothAdapter.bondedDevices

            // Search through paired devices
            for (device in pairedDevices) {
                if (isBrotherPrinter(device)) {
                    val printerInfo = WritableNativeMap()
                    printerInfo.putString("name", device.name ?: "Unknown Brother Printer")
                    printerInfo.putString("macAddress", device.address)
                    printerInfo.putString("connectionType", "bluetooth")
                    printerInfo.putString("status", "paired")
                    discoveredPrinters.pushMap(printerInfo)
                }
            }

            Log.d(TAG, "Found ${discoveredPrinters.size()} paired Brother printers")
            promise.resolve(discoveredPrinters)

        } catch (e: Exception) {
            Log.e(TAG, "Error searching Bluetooth printers", e)
            promise.reject("SEARCH_ERROR", e.message ?: "Failed to search Bluetooth printers")
        }
    }

   @ReactMethod
    fun connectToPrinter(
        connectionType: String,
        address: String,
        promise: Promise
    ) {
        executor.execute {
            try {
                val channel = when (connectionType.lowercase()) {
                    "bluetooth" -> {
                        val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
                        val bluetoothAdapter = bluetoothManager.adapter
                        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
                            promise.reject("BLUETOOTH_ERROR", "Bluetooth not available or not enabled")
                            return@execute
                        }
                        Channel.newBluetoothChannel(address, bluetoothAdapter)
                    }
                    "wifi", "network" -> {
                        Channel.newWifiChannel(address)
                    }
                    else -> {
                        promise.reject("INVALID_TYPE", "Invalid connection type: $connectionType")
                        return@execute
                    }
                }

                val result = PrinterDriverGenerator.openChannel(channel)

                if (result.error.code != OpenChannelError.ErrorCode.NoError) {
                    Log.e(TAG, "Failed to connect to printer: ${result.error.code}")
                    promise.reject("CONNECTION_ERROR", "Failed to connect to printer: ${result.error.code}")
                    return@execute
                }

                Log.d(TAG, "Successfully connected to printer via $connectionType")
                
                // Get printer information
                val printerDriver = result.driver
                val connectionInfo = WritableNativeMap()
                connectionInfo.putString("status", "connected")
                connectionInfo.putString("connectionType", connectionType)
                connectionInfo.putString("address", address)
                connectionInfo.putString("message", "Successfully connected to printer")

                // Close the test connection
                printerDriver.closeChannel()
                
                promise.resolve(connectionInfo)

            } catch (e: Exception) {
                Log.e(TAG, "Exception connecting to printer", e)
                promise.reject("CONNECTION_EXCEPTION", e.message ?: "Unknown error occurred while connecting")
            }
        }
    }

    // Enhanced printer discovery with specific Brother printer detection
    @ReactMethod
    fun discoverPrinters(promise: Promise) {
        executor.execute {
            try {
                val allPrinters = WritableNativeArray()

                // Search Bluetooth printers
                try {
                    if (hasBluetoothPermissions()) {
                        val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
                        val bluetoothAdapter = bluetoothManager.adapter

                        if (bluetoothAdapter?.isEnabled == true) {
                            val pairedDevices = bluetoothAdapter.bondedDevices
                            for (device in pairedDevices) {
                                if (isBrotherPrinter(device)) {
                                    val printerInfo = WritableNativeMap()
                                    printerInfo.putString("name", device.name ?: "Brother Printer")
                                    printerInfo.putString("macAddress", device.address)
                                    printerInfo.putString("connectionType", "bluetooth")
                                    printerInfo.putString("status", "paired")
                                    allPrinters.pushMap(printerInfo)
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Bluetooth search failed", e)
                }

              

                Log.d(TAG, "Discovery completed. Found ${allPrinters.size()} printers total")
                promise.resolve(allPrinters)

            } catch (e: Exception) {
                Log.e(TAG, "Error in printer discovery", e)
                promise.reject("DISCOVERY_ERROR", e.message ?: "Failed to discover printers")
            }
        }
    }

     private fun isBrotherPrinter(device: BluetoothDevice): Boolean {
        val deviceName = device.name?.uppercase() ?: ""
        return deviceName.contains("BROTHER") || 
               deviceName.contains("QL-") ||
               deviceName.contains("PT-") ||
               deviceName.contains("TD-") ||
               deviceName.contains("MW-") ||
               deviceName.contains("RJ-")
    }

    // Helper methods
    private fun hasBluetoothPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED
        }
    }

}