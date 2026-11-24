package com.digitalfox.bizfoxerp

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.view.View
import android.graphics.Color
import android.graphics.Typeface
import android.view.Gravity
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var progress: ProgressBar
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private val appUrl = "https://digitalfoxstudios.github.io/biz-fox-erp/"
    private val releasesApi = "https://api.github.com/repos/digitalfoxstudios/biz-fox-erp/releases/latest"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(Color.WHITE) }
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            setPadding(16, 10, 12, 10); setBackgroundColor(Color.rgb(25, 45, 72))
        }
        val brand = TextView(this).apply {
            text = "Biz FOX ERP"; textSize = 18f; setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE); layoutParams = LinearLayout.LayoutParams(0, -2, 1f)
        }
        val update = Button(this).apply {
            text = "Check updates"; textSize = 12f
            setOnClickListener { checkForUpdates() }
        }
        bar.addView(brand); bar.addView(update)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100; visibility = View.GONE
        }
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            CookieManager.getInstance().setAcceptCookie(true)
            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    progress.visibility = View.VISIBLE
                }
                override fun onPageFinished(view: WebView?, url: String?) { progress.visibility = View.GONE }
                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                    if (request?.isForMainFrame == true) view?.loadUrl("file:///android_asset/offline.html")
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    progress.progress = newProgress
                    progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
                }
                override fun onShowFileChooser(view: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = callback
                    return try {
                        startActivityForResult(params?.createIntent(), FILE_PICKER_REQUEST)
                        true
                    } catch (_: Exception) { fileCallback = null; false }
                }
            }
            setDownloadListener(DownloadListener { url, _, contentDisposition, mimeType, _ ->
                try {
                    val request = android.app.DownloadManager.Request(Uri.parse(url))
                    request.setMimeType(mimeType)
                    request.setTitle(android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType))
                    request.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS,
                        android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType))
                    (getSystemService(DOWNLOAD_SERVICE) as android.app.DownloadManager).enqueue(request)
                } catch (_: Exception) {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                }
            })
        }
        root.addView(bar)
        root.addView(progress, LinearLayout.LayoutParams(-1, 4))
        root.addView(web, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
        if (savedInstanceState == null) web.loadUrl(appUrl) else web.restoreState(savedInstanceState)
    }

    private fun checkForUpdates() {
        AlertDialog.Builder(this).setTitle("Biz FOX ERP updates")
            .setMessage("Checking for the latest Android APK…").setCancelable(true).show().also { dialog ->
                thread {
                    var version: String? = null
                    var apkUrl: String? = null
                    try {
                        val connection = URL(releasesApi).openConnection() as HttpURLConnection
                        connection.connectTimeout = 10000; connection.readTimeout = 10000
                        connection.setRequestProperty("Accept", "application/vnd.github+json")
                        val json = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                        version = json.optString("tag_name").removePrefix("v")
                        val assets = json.optJSONArray("assets")
                        if (assets != null) for (i in 0 until assets.length()) {
                            val asset = assets.getJSONObject(i)
                            if (asset.optString("name").endsWith(".apk", true)) { apkUrl = asset.optString("browser_download_url"); break }
                        }
                        connection.disconnect()
                    } catch (_: Exception) { }
                    runOnUiThread {
                        dialog.dismiss()
                        if (apkUrl != null) {
                            AlertDialog.Builder(this).setTitle("Update available")
                                .setMessage("Biz FOX ERP version $version is available. Download and install the new APK?")
                                .setNegativeButton("Later", null)
                                .setPositiveButton("Download APK") { _, _ -> startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl))) }
                                .show()
                        } else {
                            AlertDialog.Builder(this).setTitle("No update found")
                                .setMessage("No published Android APK update is available yet. Your installed app can continue to be used.")
                                .setPositiveButton("OK", null).show()
                        }
                    }
                }
            }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_PICKER_REQUEST) {
            val result = if (resultCode == Activity.RESULT_OK && data != null) WebChromeClient.FileChooserParams.parseResult(resultCode, data) else null
            fileCallback?.onReceiveValue(result); fileCallback = null
        }
    }
    override fun onSaveInstanceState(outState: Bundle) { web.saveState(outState); super.onSaveInstanceState(outState) }
    override fun onBackPressed() { if (this::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed() }

    companion object { private const val FILE_PICKER_REQUEST = 4102 }
}
