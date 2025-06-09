import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Alert,
    StyleSheet,
    ScrollView,
    Platform,
    PermissionsAndroid,
    Image,
} from 'react-native';
import RNFS from 'react-native-fs';
import { generateBatchPDFs, generatePDFFromHTML } from '../../pdfHelper';
import { requestPermissionsForPrinter } from '../../utils';
import { Images } from '../assets/images';
import BrotherPrinter, { LabelSizes, PrinterModels } from './BrotherPrinter';

const PrinterApp = () => {
    const [ipAddress, setIpAddress] = useState('192.168.1.100');
    const [macAddress, setMacAddress] = useState('00:80:77:XX:XX:XX');
    const [imagePath, setImagePath] = useState('');
    const [pdfPath, setPdfPath] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // const imageurl = "https://images.unsplash.com/photo-1494871262121-49703fd34e2b?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    // Request permissions for Android
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH,
                    // PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                ]);

                const allGranted = Object.values(granted).every(
                    permission => permission === PermissionsAndroid.RESULTS.GRANTED
                );

                if (!allGranted) {
                    Alert.alert('Permission Error', 'All permissions are required for Brother printer functionality');
                }
            } catch (err) {
                console.warn(err);
            }
        }
    };

    // Sample function to create a test image
    const createSampleImage = async () => {
        try {
            const destPath = `${RNFS.DocumentDirectoryPath}/imageTwo.png`;

            // Try different path variations based on common structures
            const possiblePaths = [
                'imageTwo.png',                    // If in root assets
                'images/imageTwo.png',             // If in images folder
                'assets/images/imageTwo.png',      // If in assets/images
                'src/assets/images/imageTwo.png'   // Full path
            ];

            for (const assetPath of possiblePaths) {
                try {
                    await RNFS.copyFileAssets(assetPath, destPath);
                    setImagePath(destPath);
                    console.log(`Image copied successfully using path: ${assetPath}`);
                    return; // Success, exit function
                } catch (pathError) {
                    console.log(`Failed with path ${assetPath}:`, pathError.message);
                }
            }

            throw new Error('All asset paths failed');

        } catch (error) {
            console.log('Error copying bundled image:', error);
            Alert.alert('Error', `Failed to copy image: ${error.message}`);
        }
    };


    const handlePrintImageWifi = async () => {
        if (!ipAddress || !imagePath) {
            Alert.alert('Error', 'Please enter IP address and image path');
            return;
        }

        setIsLoading(true);
        try {
            const result = await BrotherPrinter.printImageWifi(
                ipAddress,
                imagePath,
                PrinterModels.QL_820NWB,
                LabelSizes.ROLLW29
            );
            Alert.alert('Success', result);
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to print image via WiFi');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrintImageBluetooth = async () => {
        if (!macAddress || !imagePath) {
            Alert.alert('Error', 'Please enter MAC address and image path');
            return;
        }

        setIsLoading(true);
        try {

            // const imageAssetPath = Image.resolveAssetSource(require('../imageTwo.png')).uri;
            // const destPath = `${RNFS.DocumentDirectoryPath}/imageTwo.png`;

            // await RNFS.copyFileAssets(imageAssetPath, destPath);

            const result = await BrotherPrinter.printImageBluetooth(
                macAddress,
                imagePath,
                PrinterModels.QL_820NWB,
                LabelSizes.ROLLW29
            );
            Alert.alert('Success', result);
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to print image via Bluetooth');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrintPdfViaBluetoot = async () => {
        if (!macAddress) {
            Alert.alert('Error', 'Please enter Mac address and PDF path');
            return;
        }

        setIsLoading(true);
        try {
            const result = await BrotherPrinter.printPdfBluetooth(macAddress, PrinterModels.QL_820NWB, pdfPath);

            Alert.alert('Success', result);
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to print PDF');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!ipAddress) {
            Alert.alert('Error', 'Please enter IP address');
            return;
        }

        setIsLoading(true);
        try {
            const status = await BrotherPrinter.checkPrinterStatus(ipAddress);
            Alert.alert('Printer Status', JSON.stringify(status, null, 2));
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to check printer status');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePDF = async () => {
        try {
            setIsLoading(true);
            const labelData = {
                serial: '1234567890',
                ip: ipAddress,
                batchCode: 'DEMO-001',
                width: 300,
                height: 250,
            };

            const pdfFilePath = await generatePDFFromHTML(labelData);
            setPdfPath(pdfFilePath.filePath);
            // setImagePath(pdfFilePath.filePath);
            Alert.alert('PDF Generated', `PDF saved at:\n${pdfFilePath.filePath}`);
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to generate PDF');
        } finally {
            setIsLoading(false);
        }
    };



    React.useEffect(() => {
        // await requestPermissions();
        requestPermissionsForPrinter();
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Brother Printer Test App</Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Printer Settings</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Printer IP Address (e.g., 192.168.1.100)"
                    value={ipAddress}
                    onChangeText={setIpAddress}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Bluetooth MAC Address (e.g., 00:80:77:XX:XX:XX)"
                    value={macAddress}
                    onChangeText={setMacAddress}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>File Paths</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Image file path"
                    value={imagePath}
                    onChangeText={setImagePath}
                />

                {/* {imagePath && <Image
                    source={
                        imagePath.startsWith('file://') || imagePath.startsWith('content://')
                            ? { uri: imagePath }
                            : imageTwe
                    }
                    style={{ width: 200, height: 200, marginBottom: 10, alignSelf: 'center' }}
                    resizeMode="contain"
                />} */}


                <TouchableOpacity style={styles.button} onPress={createSampleImage}>
                    <Text style={styles.buttonText}>Create Sample Image Path</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleGeneratePDF}>
                    <Text style={styles.buttonText}>Create Sample PDF Path</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="PDF file path"
                    value={pdfPath}
                    onChangeText={setPdfPath}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Print Actions</Text>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handlePrintImageWifi}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Print Image (WiFi)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handlePrintImageBluetooth}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Print Image (Bluetooth)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handlePrintPdfViaBluetoot}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Print PDF via bt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleCheckStatus}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Check Printer Status</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Models</Text>
                <Text style={styles.infoText}>
                    {Object.values(PrinterModels).join(', ')}
                </Text>

                <Text style={styles.sectionTitle}>Available Label Sizes</Text>
                <Text style={styles.infoText}>
                    {Object.values(LabelSizes).join(', ')}
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#333',
    },
    section: {
        backgroundColor: 'white',
        padding: 15,
        marginBottom: 20,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        marginBottom: 10,
        borderRadius: 6,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 6,
        marginBottom: 10,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
});

export default PrinterApp;