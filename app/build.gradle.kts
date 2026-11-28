plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
val releaseStoreFile = System.getenv("BIZFOX_KEYSTORE_FILE")
val releaseStorePassword = System.getenv("BIZFOX_KEYSTORE_PASSWORD")
val releaseKeyAlias = System.getenv("BIZFOX_KEY_ALIAS")
val releaseKeyPassword = System.getenv("BIZFOX_KEY_PASSWORD")
android {
    namespace = "com.digitalfox.bizfoxerp"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.digitalfox.bizfoxerp"
        minSdk = 23
        targetSdk = 35
        versionCode = 16
        versionName = "1.3.2"
        buildConfigField("String", "APP_URL", "\"https://digitalfoxstudios.github.io/biz-fox-erp/?nativeVersion=1.3.2\"")
        buildConfigField("String", "APP_NAME", "\"Biz FOX ERP\"")
        buildConfigField("String", "RELEASE_ASSET", "\"biz-fox-erp.apk\"")
    }
    buildFeatures { buildConfig = true }
    signingConfigs {
        create("release") {
            if (!releaseStoreFile.isNullOrBlank()) storeFile = file(releaseStoreFile)
            storePassword = releaseStorePassword
            keyAlias = releaseKeyAlias
            keyPassword = releaseKeyPassword
        }
    }
    buildTypes {
        getByName("release") { signingConfig = signingConfigs.getByName("release"); isMinifyEnabled = false }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
}
