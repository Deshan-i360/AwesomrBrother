import React, { useState, useRef } from 'react';
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
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import RNFS from 'react-native-fs';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
// Assuming you have these imports from your original code
import BrotherPrinter, { LabelSizes, PrinterModels } from './BrotherPrinter';

const { width: screenWidth } = Dimensions.get('window');

const PrinterModifyApp = () => {
    const [macAddress, setMacAddress] = useState('');
    const [siteName, setSiteName] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImagePath, setGeneratedImagePath] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    const viewShotRef = useRef();

    // Auto-format MAC address
    const formatMacAddress = (value) => {
        // Remove all non-hex characters except colons
        const cleaned = value.replace(/[^a-fA-F0-9:]/g, '').toUpperCase();

        // Remove existing colons to rebuild format
        const noColons = cleaned.replace(/:/g, '');

        // Limit to 12 characters
        const limited = noColons.slice(0, 12);

        // Add colons every 2 characters, but only if we have characters
        if (limited.length === 0) return '';

        const formatted = limited.match(/.{1,2}/g)?.join(':') || limited;

        return formatted;
    };

    const handleMacAddressChange = (value) => {
        const formatted = formatMacAddress(value);
        setMacAddress(formatted);
    };

    // Request permissions for Android
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                ]);

                const allGranted = Object.values(granted).every(
                    permission => permission === PermissionsAndroid.RESULTS.GRANTED
                );

                if (!allGranted) {
                    Alert.alert('Permission Error', 'All permissions are required for Brother printer functionality');
                    return false;
                }
                return true;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    };

    const validateInputs = () => {
        if (!siteName.trim()) {
            Alert.alert('Validation Error', 'Site Name is required');
            return false;
        }
        if (!organizationName.trim()) {
            Alert.alert('Validation Error', 'Organization Name is required');
            return false;
        }
        return true;
    };

    const generateLabelImage = async () => {
        if (!validateInputs()) return;

        setIsLoading(true);
        try {
            // Show preview first
            setShowPreview(true);

            // Wait a moment for the view to render
            setTimeout(async () => {
                try {
                    const uri = await viewShotRef.current.capture();

                    // Copy to app's document directory
                    const fileName = `label_${Date.now()}.png`;
                    const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

                    await RNFS.copyFile(uri, destPath);
                    setGeneratedImagePath(destPath);

                    Alert.alert('Success', 'Label image generated successfully!');
                } catch (error) {
                    console.error('Error generating image:', error);
                    Alert.alert('Error', 'Failed to generate image: ' + error.message);
                } finally {
                    setIsLoading(false);
                }
            }, 500);

        } catch (error) {
            console.error('Error in generateLabelImage:', error);
            Alert.alert('Error', 'Failed to generate image');
            setIsLoading(false);
        }
    };

    const handlePrintBluetooth = async () => {
        if (!macAddress || macAddress.length !== 17) {
            Alert.alert('Error', 'Please enter a valid MAC address (XX:XX:XX:XX:XX:XX)');
            return;
        }

        if (!generatedImagePath) {
            Alert.alert('Error', 'Please generate an image first');
            return;
        }

        const hasPermissions = await requestPermissions();
        if (!hasPermissions) return;

        setIsLoading(true);
        try {
            const result = await BrotherPrinter.printImageBluetooth(
                macAddress,
                generatedImagePath,
                PrinterModels.QL_820NWB,
                LabelSizes.ROLLW29
            );

            Alert.alert('Success', 'Label printed successfully via Bluetooth!');
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert('Print Error', error.message || 'Failed to print via Bluetooth');
        } finally {
            setIsLoading(false);
        }
    };

    const clearForm = () => {
        setMacAddress('');
        setSiteName('');
        setOrganizationName('');
        setAddress('');
        setPhone('');
        setEmail('');
        setWebsite('');
        setGeneratedImagePath('');
        setShowPreview(false);
    };

    // Create QR code data
    const getQRData = () => {
        // Only create QR data if we have required fields
        if (!siteName.trim() || !organizationName.trim()) {
            return '';
        }

        const qrData = {
            siteName: siteName.trim(),
            organizationName: organizationName.trim(),
            address: address.trim(),
            phone: phone.trim(),
            email: email.trim(),
            website: website.trim(),
            macAddress: macAddress.trim(),
            timestamp: new Date().toISOString()
        };

        // Remove empty fields to keep QR code clean
        Object.keys(qrData).forEach(key => {
            if (!qrData[key]) {
                delete qrData[key];
            }
        });

        console.log('QR Data:', qrData);
        console.log('QR Data JSON:', JSON.stringify(qrData));
        
        

        return JSON.stringify(qrData);
    };


    React.useEffect(() => {
        requestPermissions();
    }, []);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>🖨️ Brother Printer Label Generator</Text>

            {/* MAC Address Input Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📶 Printer Configuration</Text>

                <Text style={styles.label}>Bluetooth MAC Address *</Text>
                <TextInput
                    style={styles.macInput}
                    value={macAddress}
                    onChangeText={handleMacAddressChange}
                    placeholder="XX:XX:XX:XX:XX:XX"
                    placeholderTextColor="#999"
                    maxLength={17}
                    autoCapitalize="characters"
                />
                <Text style={styles.hint}>Auto-formats as you type</Text>
            </View>

            {/* Organization Details Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏢 Organization Details</Text>

                <Text style={styles.label}>Organization Name *</Text>
                <TextInput
                    style={styles.input}
                    value={organizationName}
                    onChangeText={setOrganizationName}
                    placeholder="Enter organization name"
                    placeholderTextColor="#999"
                />

                <Text style={styles.label}>Site Name *</Text>
                <TextInput
                    style={styles.input}
                    value={siteName}
                    onChangeText={setSiteName}
                    placeholder="Enter site name"
                    placeholderTextColor="#999"
                />

                <Text style={styles.label}>📍 Address</Text>
                <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter address"
                    placeholderTextColor="#999"
                    multiline
                />

                <View style={styles.row}>
                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>📞 Phone</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Phone number"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>✉️ Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email address"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                <Text style={styles.label}>🌐 Website</Text>
                <TextInput
                    style={styles.input}
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="Website URL"
                    placeholderTextColor="#999"
                    keyboardType="url"
                    autoCapitalize="none"
                />
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚡ Actions</Text>

                <TouchableOpacity
                    style={[styles.button, styles.generateButton, isLoading && styles.buttonDisabled]}
                    onPress={generateLabelImage}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text style={styles.buttonText}>📷 Generate Label Image</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.printButton,
                        (isLoading || !generatedImagePath || !macAddress) && styles.buttonDisabled
                    ]}
                    onPress={handlePrintBluetooth}
                    disabled={isLoading || !generatedImagePath || !macAddress}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text style={styles.buttonText}>📶 Print via Bluetooth</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.clearButton]}
                    onPress={clearForm}
                >
                    <Text style={styles.buttonText}>🗑️ Clear Form</Text>
                </TouchableOpacity>
            </View>

            {/* Label Preview */}
            {showPreview && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👁️ Label Preview</Text>

                    <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1.0 }}>
                        <View style={styles.labelContainer}>
                            <View style={styles.labelContent}>
                                {/* Left side - QR Code */}
                                <View style={styles.qrSection}>
                                    {getQRData() ? (
                                        <QRCode
                                            value={getQRData()}
                                            size={120}
                                            backgroundColor="white"
                                            color="black"
                                            enableLinearGradient={false}
                                            logoSize={0}
                                        />
                                    ) : (
                                        <View style={styles.qrPlaceholder}>
                                            <Text style={styles.qrPlaceholderText}>QR Code</Text>
                                        </View>
                                    )}</View>

                                {/* Right side - Details */}
                                <View style={styles.detailsSection}>
                                    <Text style={styles.orgName}>{organizationName}</Text>
                                    <Text style={styles.siteName}>{siteName}</Text>

                                    {address ? <Text style={styles.detail}>📍 {address}</Text> : null}
                                    {phone ? <Text style={styles.detail}>📞 {phone}</Text> : null}
                                    {email ? <Text style={styles.detail}>✉️ {email}</Text> : null}
                                    {website ? <Text style={styles.detail}>🌐 {website}</Text> : null}
                                    {macAddress ? <Text style={styles.detail}>🔗 {macAddress}</Text> : null}
                                </View>
                            </View>
                        </View>
                    </ViewShot>

                    <Text style={styles.previewInfo}>
                        Label ready for Brother QL-820NWB printer
                    </Text>
                </View>
            )}

            {/* Status Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ℹ️ Status</Text>
                <Text style={styles.statusText}>
                    MAC Address: {macAddress || 'Not set'}
                </Text>
                <Text style={styles.statusText}>
                    Image Generated: {generatedImagePath ? '✅ Yes' : '❌ No'}
                </Text>
                <Text style={styles.statusText}>
                    Ready to Print: {(generatedImagePath && macAddress) ? '✅ Yes' : '❌ No'}
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 24,
        color: '#2c3e50',
        paddingTop: 20,
    },
    section: {
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#34495e',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#5d6d7e',
    },
    input: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        padding: 12,
        marginBottom: 16,
        borderRadius: 8,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    macInput: {
        borderWidth: 2,
        borderColor: '#3498db',
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        fontSize: 18,
        backgroundColor: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        textAlign: 'center',
        letterSpacing: 2,
    },
    hint: {
        fontSize: 12,
        color: '#7f8c8d',
        textAlign: 'center',
        marginBottom: 16,
        fontStyle: 'italic',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    button: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    generateButton: {
        backgroundColor: '#3498db',
    },
    printButton: {
        backgroundColor: '#27ae60',
    },
    clearButton: {
        backgroundColor: '#e74c3c',
    },
    buttonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    labelContainer: {
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#2c3e50',
        borderRadius: 8,
        overflow: 'hidden',
    },
    labelContent: {
        flexDirection: 'row',
        padding: 16,
        minHeight: 160,
    },
    qrSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 16,
    },
    detailsSection: {
        flex: 2,
        justifyContent: 'center',
    },
    orgName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 4,
    },
    siteName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 8,
    },
    detail: {
        fontSize: 10,
        color: '#5d6d7e',
        marginBottom: 2,
    },
    previewInfo: {
        textAlign: 'center',
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 8,
        fontStyle: 'italic',
    },
    statusText: {
        fontSize: 14,
        color: '#5d6d7e',
        marginBottom: 4,
    },
});

export default PrinterModifyApp;