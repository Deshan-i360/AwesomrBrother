import { WebView } from 'react-native-webview';
import { captureRef } from 'react-native-view-shot';

const HiddenHTMLToImage = ({ html, onImageGenerated }) => {
  const webViewRef = useRef();
  
  const captureWebView = async () => {
    try {
      const uri = await captureRef(webViewRef.current, {
        format: 'png',
        quality: 1.0,
      });
      onImageGenerated(uri);
    } catch (error) {
      console.error('Capture failed:', error);
    }
  };

  return (
    <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={{ width: 300, height: 200 }}
        onLoadEnd={captureWebView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};