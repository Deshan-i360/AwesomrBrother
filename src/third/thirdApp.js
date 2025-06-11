import React, { useEffect, useState } from 'react';
import { View, Button, Text, PermissionsAndroid, Platform } from 'react-native';
import BluetoothClassic from 'react-native-bluetooth-classic';
import { launchImageLibrary } from 'react-native-image-picker';
import { NativeModules } from 'react-native';

const { BrotherPrinterModule } = NativeModules;

export default function ThirdApp() {
  const [mac, setMac] = useState(null);
  const [status, setStatus] = useState('Initializing…');

  useEffect(() => {
    requestPermissions().then(listDevices);
  }, []);

  async function requestPermissions() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      if (
        granted.BLUETOOTH_CONNECT !== 'granted' ||
        granted.BLUETOOTH_SCAN !== 'granted'
      ) {
        setStatus('Bluetooth permissions denied');
      }
    }
  }

  async function listDevices() {
    try {
      const devices = await BluetoothClassic.getBondedDevices();
      const found = devices.find(d => d.name?.includes('QL-820NWB'));
      if (found) {
        setMac(found.address);
        setStatus(`Found printer: ${found.name}`);
      } else {
        setStatus('Printer not paired. Pair in Bluetooth settings.');
      }
    } catch (e) {
      setStatus('Error listing devices');
    }
  }

  async function pickAndPrint() {
    const res = await launchImageLibrary({mediaType: 'photo', includeBase64:true});
    if (res.assets?.length > 0) {
      const base64 = res.assets[0].base64;
      setStatus('Printing image…');
      try {
        const result = await BrotherPrinterModule.printBase64Image(mac, base64);
        setStatus(result);
      } catch (e) {
        setStatus('Error: ' + e.message);
      }
    }
  }

  return (
    <View style={{ padding: 20, marginTop: 40 }}>
      <Text>{status}</Text>
      <Button title="Pick & Print Image" onPress={pickAndPrint} disabled={!mac} />
    </View>
  );
}
