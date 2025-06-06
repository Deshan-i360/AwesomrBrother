import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Handlebars from 'handlebars';
import { WebView } from 'react-native-webview';
import ViewShot from 'react-native-view-shot';
import { generateQRCode, generateQRCodeDataUrlRN } from './utils';
import { generatePDFFromHTML } from './pdfHelper';

const ArrowLeftIcon = () => <Text style={styles.arrowIcon}>←</Text>;

function PrintLabel() {
    const [html, setHtml] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPdf, setIsPdf] = useState('');

    const viewShotRef = useRef();

    useEffect(() => {
        loadLabelConfiguration();
    }, []);

    const loadLabelConfiguration = async () => {
        try {
            //   const storedData = await AsyncStorage.getItem('label-configurations');
            //   const parsedData = storedData ? JSON.parse(storedData) : {};
            const parsedData = `<!DOCTYPE html>
                    <html>
                    <head>
                    <style>
                        body {
                        font-family: Arial, sans-serif;
                        width: {{width}}px;
                        height: {{height}}px;
                        padding: 10px;
                        box-sizing: border-box;
                        border: 1px solid #000;
                        }
                        .label {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: flex-start;
                        height: 100%;
                        }
                        .field {
                        margin-bottom: 8px;
                        font-size: 16px;
                        }
                        .field span {
                        font-weight: bold;
                        }
                        img {
                        margin-top: 4px;
                        }
                    </style>
                    </head>
                    <body>
                    <div class="label">
                        <div class="field"><span>Serial:</span> {{serial}}</div>
                        <div class="field"><span>IP Address:</span> {{ip}}</div>
                        <div class="field"><span>Batch Code:</span> {{batchCode}}</div>
                        <div class="field">
                        <span>QR Code:</span><br />
                        <img src="{{qrCode}}" alt="QR Code" width="100" height="100" />
                        </div>
                    </div>
                    </body>
                    </html>`;


            if (parsedData && Object.keys(parsedData).length > 0) {
                const qrCodeData = await generateQRCodeDataUrlRN('1234567890|192.168.1.100|ABC-123');


                console.log(qrCodeData);


                const templateFunction = Handlebars.compile(parsedData);
                const generatedHtml = templateFunction({
                    serial: '1234567890',
                    ip: '192.168.1.100',
                    batchCode: 'ABC-123',
                    height: 250,
                    width: 300,
                    qrCode: qrCodeData,
                });
                const pdf = await generatePDFFromHTML(generatedHtml)
                console.log('PDF path:', pdf.filePath);
                setIsPdf(pdf.filePath);
                setHtml(generatedHtml);

            }
        } catch (error) {
            console.error('Error loading label configuration:', error);
            Alert.alert('Error', 'Failed to load label configuration');
        }
    };

    const handleGenerateImage = async () => {
        if (!html) {
            Alert.alert('Error', 'No content to generate image from');
            return;
        }

        setIsGenerating(true);
        try {
            const uri = await viewShotRef.current.capture();
            setImageUri(uri);
            Alert.alert('Success', 'Label image generated!');
        } catch (error) {
            console.error('Capture error:', error);
            Alert.alert('Error', 'Failed to generate image');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton}>
                        <ArrowLeftIcon />
                        <Text style={styles.backText}>back</Text>
                    </TouchableOpacity>

                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Device Registration</Text>
                        <Text style={styles.subtitle}>Please set below details to the device</Text>
                    </View>

                    <View style={styles.divider} />
                    <Text style={styles.labelTitle}>Label</Text>
                </View> */}

                <View style={styles.labelSection}>
                    {html ? (
                        <View>
                            {/* Hidden WebView for capture */}
                            <ViewShot
                                style={{ height: 280, width: '100%' }}
                                ref={viewShotRef}
                                options={{ format: 'jpg', quality: 0.9 }}
                            >
                                <WebView
                                    source={{ html }}
                                    style={styles.webview}
                                    scrollEnabled={false}
                                />
                            </ViewShot>

                            <TouchableOpacity
                                style={[styles.printButton, isGenerating && styles.disabledButton]}
                                onPress={handleGenerateImage}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (<>
                                    <Text style={styles.buttonText}>Generate Image</Text>

                                </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.noPreview}>
                            <Text style={styles.noPreviewText}>No label template configured</Text>
                        </View>
                    )}

                    {imageUri && (
                        <View style={{ marginTop: 20, alignItems: 'center' }}>
                            <Text style={styles.labelTitle}>Generated Image:</Text>
                            {isPdf && (
                                <Text > (PDF):- {isPdf}</Text>
                            )}
                            <Image
                                source={{ uri: imageUri }}
                                style={{ width: 300, height: 200, borderRadius: 8, marginTop: 10 }}
                                resizeMode="contain"
                            />
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 20 },
    header: { paddingLeft: 44, marginTop: 32 },
    backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
    arrowIcon: { fontSize: 17, color: '#0F62FE', marginRight: 8 },
    backText: { fontSize: 15, color: '#0F62FE' },
    titleSection: { marginTop: 12 },
    title: { fontSize: 25.6, fontWeight: '400', color: '#000' },
    subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
    divider: { width: 450, height: 1, backgroundColor: '#A8A8A8', marginTop: 4 },
    labelTitle: { fontSize: 20, color: '#000', marginTop: 20 },
    labelSection: { marginTop: 8, gap: 20 },
    webview: { height: 200, backgroundColor: '#fff' },
    noPreview: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        backgroundColor: '#f9f9f9',
    },
    noPreviewText: { fontSize: 16, color: '#666' },
    printButton: {
        backgroundColor: '#0F62FE',
        width: 200,
        paddingVertical: 12,
        marginTop: 16,
        borderRadius: 4,
        alignItems: 'center',
    },
    disabledButton: { backgroundColor: '#999' },
    buttonText: { color: '#fff', fontSize: 16 },
});

export default PrintLabel;
