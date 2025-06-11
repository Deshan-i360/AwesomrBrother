// package com.awesomrbrother

// import android.util.Base64
// import android.graphics.BitmapFactory
// import com.brother.ptouch.sdk.Printer
// import com.brother.ptouch.sdk.PrinterInfo
// import com.facebook.react.bridge.*

// class BrotherPrinterModule(private val reactContext: ReactApplicationContext) :
//   ReactContextBaseJavaModule(reactContext) {

//   override fun getName(): String = "BrotherPrinterModule"

//   @ReactMethod
//   fun printBase64Image(macAddress: String?, base64Image: String, promise: Promise) {
//     if (macAddress.isNullOrEmpty()) {
//       promise.reject("MAC_ERROR", "Printer MAC address is required")
//       return
//     }

//     try {
//       val decoded = Base64.decode(base64Image, Base64.DEFAULT)
//       val bitmap = BitmapFactory.decodeByteArray(decoded, 0, decoded.size)

//       val printer = Printer()
//       val info = PrinterInfo().apply {
//         printerModel = PrinterInfo.Model.QL_820NWB
//         port = PrinterInfo.Port.BLUETOOTH
//         bluetoothAddress = macAddress
//         paperSize = PrinterInfo.PaperSize.CUSTOM
//         orientation = PrinterInfo.Orientation.LANDSCAPE
//         printMode = PrinterInfo.PrintMode.FIT_TO_PAGE
//       }
//       printer.printerInfo = info

//       val result = printer.startCommunication()
//       if (result != PrinterInfo.ErrorCode.ERROR_NONE) {
//         promise.reject("BLUETOOTH_ERROR", "Open Bluetooth channel failed: $result")
//         return
//       }

//       val printRes = printer.printImage(bitmap)
//       printer.endCommunication()

//       if (printRes.errorCode != PrinterInfo.ErrorCode.ERROR_NONE) {
//         promise.reject("PRINT_ERROR", "Printing failed: ${printRes.errorCode}")
//       } else {
//         promise.resolve("Image printed successfully")
//       }
//     } catch (e: Exception) {
//       promise.reject("EXCEPTION", e.message)
//     }
//   }
// }
