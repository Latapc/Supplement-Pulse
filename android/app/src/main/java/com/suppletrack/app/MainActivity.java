package com.suppletrack.app;

import android.app.Dialog;
import android.content.DialogInterface;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPasswordOption;
import androidx.credentials.PasswordCredential;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.CreateCredentialException;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            // Block screenshots and screen capture (Android OS FLAG_SECURE)
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);

            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView mainWebView = this.bridge.getWebView();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    mainWebView.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_YES);
                }
                WebSettings settings = mainWebView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setSupportMultipleWindows(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);

                // Javascript interface to toggle screenshot protection in sensitive areas
                mainWebView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void enableScreenshotProtection() {
                        runOnUiThread(() -> getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE));
                    }
                    @JavascriptInterface
                    public void disableScreenshotProtection() {
                        runOnUiThread(() -> getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE));
                    }
                }, "AndroidSecurity");

                // Google Credential Manager interface for saved passwords, passkeys & autofill bottom sheet
                mainWebView.addJavascriptInterface(new AndroidCredentialsInterface(), "AndroidCredentials");

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

    /**
     * Native Android Jetpack Credential Manager bridge for Google Password Manager
     */
    public class AndroidCredentialsInterface {

        @JavascriptInterface
        public void requestCredentials() {
            runOnUiThread(() -> {
                try {
                    CredentialManager credentialManager = CredentialManager.create(MainActivity.this);
                    GetPasswordOption getPasswordOption = new GetPasswordOption();
                    GetCredentialRequest getCredRequest = new GetCredentialRequest.Builder()
                        .addCredentialOption(getPasswordOption)
                        .build();

                    credentialManager.getCredentialAsync(
                        MainActivity.this,
                        getCredRequest,
                        null,
                        ContextCompat.getMainExecutor(MainActivity.this),
                        new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                            @Override
                            public void onResult(GetCredentialResponse result) {
                                try {
                                    Credential credential = result.getCredential();
                                    if (credential instanceof PasswordCredential) {
                                        PasswordCredential pw = (PasswordCredential) credential;
                                        String user = pw.getId() != null ? pw.getId() : "";
                                        String pass = pw.getPassword() != null ? pw.getPassword() : "";
                                        sendCredentialsToWeb(user, pass);
                                    }
                                } catch (Exception ex) {
                                    sendCredentialErrorToWeb("Parse error: " + ex.getMessage());
                                }
                            }

                            @Override
                            public void onError(GetCredentialException e) {
                                sendCredentialErrorToWeb(e.getMessage());
                            }
                        }
                    );
                } catch (Exception e) {
                    sendCredentialErrorToWeb(e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void saveCredentials(String email, String password) {
            if (email == null || email.trim().isEmpty() || password == null || password.isEmpty()) {
                return;
            }
            runOnUiThread(() -> {
                try {
                    CredentialManager credentialManager = CredentialManager.create(MainActivity.this);
                    CreatePasswordRequest createPasswordRequest = new CreatePasswordRequest(email.trim(), password);

                    credentialManager.createCredentialAsync(
                        MainActivity.this,
                        createPasswordRequest,
                        null,
                        ContextCompat.getMainExecutor(MainActivity.this),
                        new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                            @Override
                            public void onResult(CreateCredentialResponse result) {
                                notifySavedToWeb(true, "Password saved to Google Password Manager");
                            }

                            @Override
                            public void onError(CreateCredentialException e) {
                                notifySavedToWeb(false, e.getMessage());
                            }
                        }
                    );
                } catch (Exception e) {
                    notifySavedToWeb(false, e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public boolean isSupported() {
            return true;
        }

        private void sendCredentialsToWeb(String email, String password) {
            if (bridge != null && bridge.getWebView() != null) {
                WebView wv = bridge.getWebView();
                wv.post(() -> {
                    String escapedEmail = escapeForJs(email);
                    String escapedPass = escapeForJs(password);
                    String js = "window.dispatchEvent(new CustomEvent('onAndroidCredentialsReceived', { detail: { email: '" 
                        + escapedEmail + "', password: '" + escapedPass + "' } }));";
                    wv.evaluateJavascript(js, null);
                });
            }
        }

        private void sendCredentialErrorToWeb(String error) {
            if (bridge != null && bridge.getWebView() != null) {
                WebView wv = bridge.getWebView();
                wv.post(() -> {
                    String js = "window.dispatchEvent(new CustomEvent('onAndroidCredentialsError', { detail: { error: '" 
                        + escapeForJs(error) + "' } }));";
                    wv.evaluateJavascript(js, null);
                });
            }
        }

        private void notifySavedToWeb(boolean success, String message) {
            if (bridge != null && bridge.getWebView() != null) {
                WebView wv = bridge.getWebView();
                wv.post(() -> {
                    String js = "window.dispatchEvent(new CustomEvent('onAndroidCredentialsSaved', { detail: { success: " 
                        + success + ", message: '" + escapeForJs(message) + "' } }));";
                    wv.evaluateJavascript(js, null);
                });
            }
        }

        private String escapeForJs(String str) {
            if (str == null) return "";
            return str.replace("\\", "\\\\")
                      .replace("'", "\\'")
                      .replace("\"", "\\\"")
                      .replace("\n", "\\n")
                      .replace("\r", "\\r");
        }
    }
}
