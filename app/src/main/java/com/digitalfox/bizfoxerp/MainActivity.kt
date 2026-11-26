package com.digitalfox.bizfoxerp

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.core.app.NotificationCompat
import android.os.Handler
import android.os.Looper
import android.Manifest
import android.content.pm.PackageManager
import android.webkit.GeolocationPermissions
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.provider.MediaStore
import androidx.core.content.FileProvider
import java.io.File
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.view.View
import android.widget.FrameLayout
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
    private var pendingCameraUri: Uri? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private var pendingGeoOrigin: String? = null
    private var downloadReceiverRegistered = false
    private var activeDownloadId = -1L
    private var pendingInstallUri: Uri? = null
    private val appUrl = BuildConfig.APP_URL
    private val releasesApi = "https://api.github.com/repos/digitalfoxstudios/biz-fox-erp/releases/latest"

    private val downloadReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return
            val completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
            if (completedId != activeDownloadId) return
            val manager = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
            manager.query(DownloadManager.Query().setFilterById(completedId)).use { cursor ->
                if (!cursor.moveToFirst()) {
                    Toast.makeText(this@MainActivity, "Could not find the downloaded update.", Toast.LENGTH_LONG).show()
                    return
                }
                val status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    pendingInstallUri = manager.getUriForDownloadedFile(completedId)
                    if (pendingInstallUri != null) installDownloadedApk()
                    else Toast.makeText(this@MainActivity, "Android could not open the downloaded APK.", Toast.LENGTH_LONG).show()
                } else {
                    val reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
                    Toast.makeText(this@MainActivity, "Update download failed (code $reason). Please try again.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerDownloadReceiver()
        createNotificationChannel()
        val root = FrameLayout(this).apply { setBackgroundColor(Color.WHITE) }
        val mainLayout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(Color.WHITE) }
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            setPadding(16, 10, 12, 10); setBackgroundColor(Color.rgb(25, 45, 72))
        }
        val brandMark = ImageView(this).apply {
            setImageResource(R.drawable.biz_fox_logo)
            scaleType = ImageView.ScaleType.FIT_CENTER
            contentDescription = "Biz FOX ERP logo"
            layoutParams = LinearLayout.LayoutParams(42, 42).apply { rightMargin = 11 }
        }
        val brand = TextView(this).apply {
            text = BuildConfig.APP_NAME + if (BuildConfig.APP_NAME == "Biz FOX Staff") "\nSTAFF WORKSPACE" else "\nOFFICE WORKSPACE"; textSize = 16f; setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE); layoutParams = LinearLayout.LayoutParams(0, -2, 1f)
        }
        bar.addView(brandMark); bar.addView(brand)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply { max = 100; visibility = View.GONE }
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setGeolocationEnabled(true)
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            addJavascriptInterface(AndroidUpdateBridge(), "BizFoxAndroid")
            CookieManager.getInstance().setAcceptCookie(true)
            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) { this@MainActivity.progress.visibility = View.VISIBLE }
                override fun onPageFinished(view: WebView?, url: String?) { this@MainActivity.progress.visibility = View.GONE }
                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                    if (request?.isForMainFrame == true) view?.loadUrl("file:///android_asset/offline.html")
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    this@MainActivity.progress.progress = newProgress
                    this@MainActivity.progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
                }
                override fun onShowFileChooser(view: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = callback
                    return try {
                        if (params?.isCaptureEnabled == true) {
                            launchDirectCamera()
                        } else {
                            val chooser = params?.createIntent() ?: return false
                            chooser.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.mode == FileChooserParams.MODE_OPEN_MULTIPLE)
                            startActivityForResult(chooser, FILE_PICKER_REQUEST)
                        }
                        true
                    } catch (_: Exception) { fileCallback?.onReceiveValue(null); fileCallback = null; pendingCameraUri = null; false }
                }
                override fun onGeolocationPermissionsShowPrompt(origin: String?, callback: GeolocationPermissions.Callback?) {
                    if (origin == null || callback == null) return
                    val fine = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    val coarse = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    if (fine || coarse) {
                        callback.invoke(origin, true, false)
                    } else {
                        pendingGeoOrigin = origin
                        pendingGeoCallback = callback
                        requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION), LOCATION_REQUEST)
                    }
                }
            }
            setDownloadListener(DownloadListener { url, _, contentDisposition, mimeType, _ ->
                try {
                    val request = DownloadManager.Request(Uri.parse(url))
                    request.setMimeType(mimeType)
                    request.setTitle(android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType))
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType))
                    (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
                } catch (_: Exception) { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
            })
        }
        mainLayout.addView(bar)
        mainLayout.addView(progress, LinearLayout.LayoutParams(-1, 4))
        mainLayout.addView(web, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(mainLayout, FrameLayout.LayoutParams(-1, -1))
        val splash = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
            setBackgroundColor(Color.rgb(16, 24, 39))
        }
        val splashLogo = ImageView(this).apply {
            setImageResource(R.drawable.biz_fox_logo)
            scaleType = ImageView.ScaleType.FIT_CENTER
            contentDescription = "Biz FOX ERP"
            layoutParams = LinearLayout.LayoutParams(132, 132).apply { bottomMargin = 22 }
        }
        val splashTitle = TextView(this).apply {
            text = BuildConfig.APP_NAME
            textSize = 27f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }
        val splashStudio = TextView(this).apply {
            text = "DIGITAL FOX STUDIO"
            textSize = 11f
            letterSpacing = 0.18f
            setTextColor(Color.rgb(255, 173, 94))
            gravity = Gravity.CENTER
            setPadding(0, 10, 0, 0)
        }
        splash.addView(splashLogo)
        splash.addView(splashTitle)
        splash.addView(splashStudio)
        root.addView(splash, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)
        if (savedInstanceState == null) web.loadUrl(appUrl) else web.restoreState(savedInstanceState)
        Handler(Looper.getMainLooper()).postDelayed({
            if (!isFinishing) {
                root.removeView(splash)
                if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_REQUEST)
                }
            }
        }, 3000L)
    }

    private fun launchDirectCamera() {
        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (cameraIntent.resolveActivity(packageManager) == null) {
            fileCallback?.onReceiveValue(null)
            fileCallback = null
            Toast.makeText(this, "No camera app is available on this phone.", Toast.LENGTH_LONG).show()
            return
        }
        val photoFile = File.createTempFile("bizfox-site-", ".jpg", cacheDir)
        val authority = "${applicationContext.packageName}.fileprovider"
        val outputUri = FileProvider.getUriForFile(this, authority, photoFile)
        pendingCameraUri = outputUri
        cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, outputUri)
        cameraIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        cameraIntent.clipData = android.content.ClipData.newUri(contentResolver, "Site photo", outputUri)
        startActivityForResult(cameraIntent, CAMERA_CAPTURE_REQUEST)
    }

    private fun registerDownloadReceiver() {
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(downloadReceiver, filter, Context.RECEIVER_EXPORTED)
        else registerReceiver(downloadReceiver, filter)
        downloadReceiverRegistered = true
    }

    private inner class AndroidUpdateBridge {
        @JavascriptInterface fun checkForUpdates() { runOnUiThread { this@MainActivity.checkForUpdates() } }
        @JavascriptInterface fun requestNotifications() { runOnUiThread { this@MainActivity.requestNotificationPermission() } }
        @JavascriptInterface fun showNotification(title: String, body: String) { runOnUiThread { this@MainActivity.showLocalNotification(title, body) } }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(NOTIFICATION_CHANNEL, "Biz FOX ERP alerts", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Work assignments, office updates and sync notifications"
            }
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_REQUEST)
        } else {
            Toast.makeText(this, "Biz FOX notifications are enabled.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showLocalNotification(title: String, body: String) {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title.take(80))
            .setContentText(body.take(180))
            .setStyle(NotificationCompat.BigTextStyle().bigText(body.take(500)))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
        try { androidx.core.app.NotificationManagerCompat.from(this).notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification) }
        catch (_: SecurityException) { requestNotificationPermission() }
    }

    private fun compareVersions(remote: String, installed: String): Int {
        val a = remote.removePrefix("v").split(".").map { it.toIntOrNull() ?: 0 }
        val b = installed.removePrefix("v").split(".").map { it.toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(a.size, b.size)) {
            val difference = a.getOrElse(i) { 0 }.compareTo(b.getOrElse(i) { 0 })
            if (difference != 0) return difference
        }
        return 0
    }

    private fun checkForUpdates() {
        val checkingDialog = AlertDialog.Builder(this).setTitle("Biz FOX ERP updates")
            .setMessage("Checking the latest Android version…").setCancelable(false).show()
        thread {
            var remoteVersion: String? = null
            var apkUrl: String? = null
            var failure: String? = null
            var connection: HttpURLConnection? = null
            try {
                connection = URL(releasesApi).openConnection() as HttpURLConnection
                connection.connectTimeout = 12000
                connection.readTimeout = 12000
                connection.setRequestProperty("Accept", "application/vnd.github+json")
                val responseCode = connection.responseCode
                if (responseCode !in 200..299) throw IllegalStateException("GitHub returned HTTP $responseCode")
                val json = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                remoteVersion = json.optString("tag_name").removePrefix("v")
                val assets = json.optJSONArray("assets")
                if (assets != null) for (i in 0 until assets.length()) {
                    val asset = assets.getJSONObject(i)
                    if (asset.optString("name") == BuildConfig.RELEASE_ASSET) { apkUrl = asset.optString("browser_download_url"); break }
                }
                if (remoteVersion.isNullOrBlank() || apkUrl.isNullOrBlank()) throw IllegalStateException("No matching APK was published.")
            } catch (error: Exception) { failure = error.message ?: "Network error" }
            finally { connection?.disconnect() }
            runOnUiThread {
                checkingDialog.dismiss()
                when {
                    failure != null -> AlertDialog.Builder(this).setTitle("Update check failed")
                        .setMessage("Could not check for updates. Check your internet connection and try again.\n\n$failure")
                        .setPositiveButton("OK", null).show()
                    compareVersions(remoteVersion!!, BuildConfig.VERSION_NAME) <= 0 -> AlertDialog.Builder(this)
                        .setTitle("You're up to date")
                        .setMessage("Biz FOX " + BuildConfig.VERSION_NAME + " is the latest version available.")
                        .setPositiveButton("OK", null).show()
                    else -> AlertDialog.Builder(this).setTitle("Update available")
                        .setMessage("Biz FOX " + BuildConfig.VERSION_NAME + " → " + remoteVersion + " is available. Download it now? You can keep using the app while it downloads.")
                        .setNegativeButton("Later", null)
                        .setPositiveButton("Download update") { _, _ -> downloadUpdate(apkUrl!!, remoteVersion!!) }.show()
                }
            }
        }
    }

    private fun downloadUpdate(apkUrl: String, version: String) {
        try {
            val uri = Uri.parse(apkUrl)
            if (uri.scheme != "https" || uri.host != "github.com") {
                Toast.makeText(this, "The update source is not trusted.", Toast.LENGTH_LONG).show()
                return
            }
            val request = DownloadManager.Request(uri)
                .setTitle(BuildConfig.APP_NAME + " update")
                .setDescription("Downloading version " + version)
                .setMimeType("application/vnd.android.package-archive")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(false)
                .setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "biz-fox-" + BuildConfig.RELEASE_ASSET)
            activeDownloadId = (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
            Toast.makeText(this, "Update download started. You can keep using Biz FOX.", Toast.LENGTH_LONG).show()
        } catch (error: Exception) {
            AlertDialog.Builder(this).setTitle("Download could not start")
                .setMessage(error.message ?: "Please try again.").setPositiveButton("OK", null).show()
        }
    }

    private fun installDownloadedApk() {
        val apkUri = pendingInstallUri ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
            AlertDialog.Builder(this).setTitle("Allow Biz FOX to install updates")
                .setMessage("Android requires permission to install updates downloaded by Biz FOX. Enable “Allow from this source”, then return here to continue.")
                .setNegativeButton("Cancel") { _, _ -> pendingInstallUri = null }
                .setPositiveButton("Open settings") { _, _ ->
                    try { startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + packageName))) }
                    catch (_: Exception) { Toast.makeText(this, "Open Android Settings and allow installs for Biz FOX.", Toast.LENGTH_LONG).show() }
                }.show()
            return
        }
        try {
            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(installIntent)
            pendingInstallUri = null
        } catch (error: Exception) {
            Toast.makeText(this, "Android could not open the installer: " + error.message, Toast.LENGTH_LONG).show()
        }
    }

    override fun onResume() {
        super.onResume()
        if (pendingInstallUri != null && (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || packageManager.canRequestPackageInstalls())) installDownloadedApk()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_REQUEST) {
            val granted = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
            pendingGeoCallback?.invoke(pendingGeoOrigin, granted, false)
            pendingGeoCallback = null
            pendingGeoOrigin = null
        } else if (requestCode == NOTIFICATION_REQUEST) {
            val granted = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
            Toast.makeText(this, if (granted) "Biz FOX notifications enabled." else "Notifications are disabled. You can enable them in Android Settings.", Toast.LENGTH_LONG).show()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == CAMERA_CAPTURE_REQUEST) {
            val result = if (resultCode == Activity.RESULT_OK) pendingCameraUri?.let { arrayOf(it) } else null
            fileCallback?.onReceiveValue(result)
            fileCallback = null
            pendingCameraUri = null
        } else if (requestCode == FILE_PICKER_REQUEST) {
            val result = if (resultCode == Activity.RESULT_OK && data != null) WebChromeClient.FileChooserParams.parseResult(resultCode, data) else null
            fileCallback?.onReceiveValue(result); fileCallback = null
        }
    }

    override fun onSaveInstanceState(outState: Bundle) { web.saveState(outState); super.onSaveInstanceState(outState) }
    override fun onDestroy() {
        if (downloadReceiverRegistered) { try { unregisterReceiver(downloadReceiver) } catch (_: Exception) { }; downloadReceiverRegistered = false }
        if (this::web.isInitialized) web.destroy()
        super.onDestroy()
    }
    @Suppress("DEPRECATION")
    override fun onBackPressed() { if (this::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed() }
    companion object {
        private const val FILE_PICKER_REQUEST = 4102
        private const val LOCATION_REQUEST = 4103
        private const val CAMERA_CAPTURE_REQUEST = 4104
        private const val NOTIFICATION_REQUEST = 4105
        private const val NOTIFICATION_CHANNEL = "bizfox_alerts"
    }
}
