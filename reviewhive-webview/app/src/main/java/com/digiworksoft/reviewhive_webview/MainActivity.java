package com.digiworksoft.reviewhive_webview;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    // File chooser callback for <input type="file"> (Issue #1)
    private ValueCallback<Uri[]> fileUploadCallback;
    private final ActivityResultLauncher<Intent> fileChooserLauncher =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    result -> {
                        if (fileUploadCallback == null) return;
                        Uri[] results = null;
                        if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                            Uri dataUri = result.getData().getData();
                            if (dataUri != null) {
                                results = new Uri[]{dataUri};
                            }
                        }
                        fileUploadCallback.onReceiveValue(results);
                        fileUploadCallback = null;
                    }
            );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Issue #7: Let app draw behind system bars, then apply insets as padding
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        setContentView(R.layout.activity_main);

        // Issue #7: Apply window insets as padding to keep WebView clear of status bar & nav buttons
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        webView = findViewById(R.id.webView);

        // Issue #5: Override URL loading to open external links (WhatsApp, Google Maps) in browser/app
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                String host = request.getUrl().getHost();

                if (host == null) return false;

                // External domains that should open in the native app or browser
                if (host.contains("wa.me") || host.contains("whatsapp.com")
                        || host.contains("maps.google.com") || host.contains("google.com/maps")
                        || host.contains("g.page") || host.contains("goo.gl")
                        || host.contains("play.google.com")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    try {
                        startActivity(intent);
                    } catch (Exception e) {
                        // No app can handle this URL — let WebView try
                        return false;
                    }
                    return true;
                }

                // All other URLs: let WebView handle normally
                return false;
            }
        });

        // Issue #1: WebChromeClient for <input type="file"> support
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                                             FileChooserParams fileChooserParams) {
                // Cancel any existing callback
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = callback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    Toast.makeText(MainActivity.this, "Cannot open file chooser", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        WebSettings webSettings = webView.getSettings();

        // Required for modern apps (Next.js)
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);

        // Allow file access for uploads
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        // Disable zoom controls
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);

        // Handle CSV / PDF / QR poster downloads
        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mimetype);
            request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

            // Forward session cookie so auth middleware doesn't reject the download
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) {
                request.addRequestHeader("cookie", cookies);
            }

            String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            dm.enqueue(request);
            Toast.makeText(this, "Downloading " + filename, Toast.LENGTH_SHORT).show();
        });

        // Load URL from strings.xml
        String baseUrl = getString(R.string.base_url);
        webView.loadUrl(baseUrl);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}