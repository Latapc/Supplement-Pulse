package com.suppletrack.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebSettings settings = this.bridge.getWebView().getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setSupportMultipleWindows(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                String userAgent = settings.getUserAgentString();
                if (userAgent != null) {
                    // Normalize User-Agent so Google OAuth and Identity Services work smoothly
                    String cleanUserAgent = userAgent.replace("; wv", "").replaceAll("Version\\/\\d+\\.\\d+", "");
                    settings.setUserAgentString(cleanUserAgent);
                }
            }
        } catch (Exception e) {
            // graceful fallback
        }
    }
}
