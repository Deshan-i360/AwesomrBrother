/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import BrotherQL820App from './brotherPrinter';
import { CanvasLabel } from './canvas';
import PrintLabel from './printerLabel';
import PrinterApp from './src/printerSdk/PrinterApp';
import PrinterModifyApp from './src/printerSdk/ModifyPrinter';
import BrotherPrinterAppSeconOp from './src/seconPrintOp/printSec';

function App(): React.JSX.Element {


  return (
    //  <BrotherQL820App/>
    // <CanvasLabel
    //   data={{
    //     title: 'Hello World',
    //     subtitle: 'This is a subtitle',
    //     barcode: '123456789012',
    //   }}
    //   onImageGenerated={(image: any) => {
    //     console.log('Image generated:', image);
    //   }
    //   }
    // />
    <PrintLabel/>
    // <PrinterApp/>
    // <PrinterModifyApp/>
    // <BrotherPrinterAppSeconOp/>
  );
}


export default App;
