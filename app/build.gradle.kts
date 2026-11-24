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
        versionCode = 6
        versionName = "1.0.5"
    }
    signingConfigs {
        create("release") {
            if (!releaseStoreFile.isNullOrBlank()) storeFile = file(releaseStoreFile)
            storePassword = releaseStorePassword
            keyAlias = releaseKeyAlias
            keyPassword = releaseKeyPassword
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
