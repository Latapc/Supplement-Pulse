package com.suppletrack.app;

import android.app.Dialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.os.Message;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView mainWebView = this.bridge.getWebView();
                WebSettings settings = mainWebView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setSupportMultipleWindows(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);

                final String userAgent = settings.getUserAgentString();
                if (userAgent != null) {
                    // Normalize User-Agent so Google OAuth and Identity Services work smoothly
                    String cleanUserAgent = userAgent.replace("; wv", "").replaceAll("Version\\/\\d+\\.\\d+", "");
                    settings.setUserAgentString(cleanUserAgent);
                }

                mainWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                        WebView popupWebView = new WebView(MainActivity.this);
                        WebSettings popupSettings = popupWebView.getSettings();
                        popupSettings.setJavaScriptEnabled(true);
                        popupSettings.setDomStorageEnabled(true);
                        popupSettings.setSupportMultipleWindows(true);
                        popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                        if (userAgent != null) {
                            String cleanUserAgent = userAgent.replace("; wv", "").replaceAll("Version\\/\\d+\\.\\d+", "");
                            popupSettings.setUserAgentString(cleanUserAgent);
                        }

                        Dialog dialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
                        dialog.setContentView(popupWebView);
                        dialog.show();

                        popupWebView.setWebChromeClient(new WebChromeClient() {
                            @Override
                            public void onCloseWindow(WebView window) {
                                dialog.dismiss();
                                window.destroy();
                            }
                        });

                        popupWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                                return false;
                            }
                        });

                        dialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
                            @Override
                            public void onDismiss(DialogInterface d) {
                                popupWebView.destroy();
                            }
                        });

                        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                        transport.setWebView(popupWebView);
                        resultMsg.sendToTarget();
                        return true;
                    }
                });
            }
        } catch (Exception e) {
            // graceful fallback
        }
    }
}
