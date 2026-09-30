package com.pubky

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.pubkycore.*
import android.util.Base64
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class PubkyModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val storageLocks = ConcurrentHashMap<String, PubkyStorageLock>()
    private val eventStreams = ConcurrentHashMap<String, String>()

    init {
        // Initialize rustls-platform-verifier with the app Context before any TLS call.
        // Required on Android: pkarr's relay TLS uses it (see uniffi.pubkycore.RustlsInit).
        RustlsInit.ensure(reactContext)
    }

    override fun getName(): String {
        return NAME
    }

    private val eventListener = object : EventListener {
        override fun onEventOccurred(eventData: String) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("PubkyEvent", eventData)
        }
    }

    private fun runBinding(operation: String, promise: Promise, block: () -> Any?) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = block()
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Throwable) {
                withContext(Dispatchers.Main) { PubkyBridge.reject(error, operation, promise) }
            }
        }
    }

    private fun unsigned(value: Double, field: String): ULong {
        require(value.isFinite() && value >= 0 && value % 1.0 == 0.0) {
            "$field must be an unsigned integer"
        }
        return value.toULong()
    }

    private inner class StorageEventListener(
        private val subscriptionId: String,
    ) : PubkyEventStreamListener {
        override fun onEvent(event: PubkyStorageEvent) {
            val eventValue = Arguments.createMap().apply {
                putString("eventType", event.eventType)
                putString("resource", event.resource)
                putString("cursor", event.cursor.toString())
                event.contentHash?.let { putString("contentHash", it) } ?: putNull("contentHash")
            }
            val body = Arguments.createMap().apply {
                putString("subscriptionId", subscriptionId)
                putMap("event", eventValue)
            }
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("PubkyStorageEvent", body)
        }

        override fun onError(message: String) {
            val body = Arguments.createMap().apply {
                putString("subscriptionId", subscriptionId)
                putString("message", message)
            }
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("PubkyStorageEventError", body)
        }

        override fun onComplete() {
            val body = Arguments.createMap().apply {
                putString("subscriptionId", subscriptionId)
            }
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("PubkyStorageEventComplete", body)
        }
    }

    @ReactMethod
    fun setEventListener(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                setEventListener(eventListener)
                withContext(Dispatchers.Main) {
                    promise.resolve(null)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun removeEventListener(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                removeEventListener()
                withContext(Dispatchers.Main) {
                    promise.resolve(null)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun deleteFile(url: String, secretKey: String, clientId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = deleteFile(url, secretKey, clientId)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun auth(url: String, secretKey: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = auth(url, secretKey)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun parseAuthUrl(url: String, promise: Promise) {
        try {
            val result = parseAuthUrl(url)
            val array = Arguments.createArray().apply {
                result.forEach { pushString(it) }
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("Error", e.message)
        }
    }

    @ReactMethod
    fun parseDeepLink(url: String, promise: Promise) {
        try {
            val result = parseDeepLink(url)
            val array = Arguments.createArray().apply {
                result.forEach { pushString(it) }
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("Error", e.message)
        }
    }

    @ReactMethod
    fun publish(recordName: String, recordContent: String, secretKey: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = publish(recordName, recordContent, secretKey)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun resolve(publicKey: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = resolve(publicKey)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun getSignupToken(homeserverPubky: String, adminPassword: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = getSignupToken(homeserverPubky, adminPassword)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun signUp(secretKey: String, homeserver: String, signupToken: String?, clientId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signUp(secretKey, homeserver, signupToken, clientId)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun signUpGrant(secretKey: String, homeserver: String, signupToken: String?, clientId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signUpGrant(secretKey, homeserver, signupToken, clientId)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun signUpCookie(secretKey: String, homeserver: String, signupToken: String?, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signUpCookie(secretKey, homeserver, signupToken)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun republishHomeserver(secretKey: String, homeserver: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = republishHomeserver(secretKey, homeserver)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun signIn(secretKey: String, clientId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signIn(secretKey, clientId)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun signInGrant(secretKey: String, clientId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signInGrant(secretKey, clientId)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun signInCookie(secretKey: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signInCookie(secretKey)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun signOut(sessionSecret: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signOut(sessionSecret)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun listGrants(sessionSecret: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = listGrants(sessionSecret)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun revokeGrant(sessionSecret: String, grantId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = revokeGrant(sessionSecret, grantId)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun revalidateSession(sessionSecret: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = revalidateSession(sessionSecret)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun put(url: String, content: String, secretKey: String, clientId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = put(url, content, secretKey, clientId)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun get(url: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = get(url)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun publishHttps(recordName: String, target: String, secretKey: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = publishHttps(recordName, target, secretKey)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun resolveHttps(publicKey: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = resolveHttps(publicKey)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun list(url: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = list(url)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun generateSecretKey(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = generateSecretKey()
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun getPublicKeyFromSecretKey(secretKey: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = getPublicKeyFromSecretKey(secretKey)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun createRecoveryFile(secretKey: String, passphrase: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = createRecoveryFile(secretKey, passphrase)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun decryptRecoveryFile(recoveryFile: String, passphrase: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = decryptRecoveryFile(recoveryFile, passphrase)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun getHomeserver(pubky: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = getHomeserver(pubky)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun generateMnemonicPhrase(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = generateMnemonicPhrase()
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun mnemonicPhraseToKeypair(mnemonicPhrase: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = mnemonicPhraseToKeypair(mnemonicPhrase)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun generateMnemonicPhraseAndKeypair(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = generateMnemonicPhraseAndKeypair()
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun validateMnemonicPhrase(mnemonicPhrase: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = validateMnemonicPhrase(mnemonicPhrase)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun startAuthFlow(capabilities: String, clientId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = startAuthFlow(capabilities, clientId)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun startGrantAuthFlow(capabilities: String, clientId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = startGrantAuthFlow(capabilities, clientId)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun startCookieAuthFlow(capabilities: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = startCookieAuthFlow(capabilities)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun awaitAuthApproval(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = awaitAuthApproval()
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun awaitGrantAuthApproval(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = awaitGrantAuthApproval()
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun awaitCookieAuthApproval(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = awaitCookieAuthApproval()
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun putWithSession(url: String, content: String, sessionSecret: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = putWithSession(url, content, sessionSecret)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun deleteWithSession(url: String, sessionSecret: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = deleteWithSession(url, sessionSecret)
                val array = Arguments.createArray().apply {
                    result.forEach { pushString(it) }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(array)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("Error", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun configureClient(configJson: String, promise: Promise) =
        runBinding("configureClient", promise) {
            uniffi.pubkycore.configureClient(PubkyBridge.clientConfig(configJson))
            null
        }

    @ReactMethod
    fun switchNetwork(useTestnet: Boolean, promise: Promise) =
        runBinding("switchNetwork", promise) {
            Arguments.createArray().apply {
                uniffi.pubkycore.switchNetwork(useTestnet).forEach { pushString(it) }
            }
        }

    @ReactMethod
    fun publicGetBytes(address: String, promise: Promise) =
        runBinding("publicGetBytes", promise) {
            Base64.encodeToString(uniffi.pubkycore.publicGetBytes(address), Base64.NO_WRAP)
        }

    @ReactMethod
    fun publicExists(address: String, promise: Promise) =
        runBinding("publicExists", promise) {
            uniffi.pubkycore.publicExists(address)
        }

    @ReactMethod
    fun publicStats(address: String, promise: Promise) =
        runBinding("publicStats", promise) {
            PubkyBridge.stats(uniffi.pubkycore.publicStats(address))
        }

    @ReactMethod
    fun publicList(address: String, options: String, promise: Promise) =
        runBinding("publicList", promise) {
            PubkyBridge.listPage(
                uniffi.pubkycore.publicList(address, PubkyBridge.listOptions(options)),
            )
        }

    @ReactMethod
    fun sessionGetBytes(pathOrAddress: String, sessionSecret: String, promise: Promise) =
        runBinding("sessionGetBytes", promise) {
            Base64.encodeToString(
                uniffi.pubkycore.sessionGetBytes(pathOrAddress, sessionSecret),
                Base64.NO_WRAP,
            )
        }

    @ReactMethod
    fun sessionExists(pathOrAddress: String, sessionSecret: String, promise: Promise) =
        runBinding("sessionExists", promise) {
            uniffi.pubkycore.sessionExists(pathOrAddress, sessionSecret)
        }

    @ReactMethod
    fun sessionStats(pathOrAddress: String, sessionSecret: String, promise: Promise) =
        runBinding("sessionStats", promise) {
            PubkyBridge.stats(uniffi.pubkycore.sessionStats(pathOrAddress, sessionSecret))
        }

    @ReactMethod
    fun sessionList(pathOrAddress: String, sessionSecret: String, options: String, promise: Promise) =
        runBinding("sessionList", promise) {
            PubkyBridge.listPage(
                uniffi.pubkycore.sessionList(
                    pathOrAddress,
                    sessionSecret,
                    PubkyBridge.listOptions(options),
                ),
            )
        }

    @ReactMethod
    fun sessionPutBytes(
        pathOrAddress: String,
        content: String,
        sessionSecret: String,
        promise: Promise,
    ) = runBinding("sessionPutBytes", promise) {
        uniffi.pubkycore.sessionPutBytes(
            pathOrAddress,
            PubkyBridge.requiredBytes(content, "content"),
            sessionSecret,
        )
        null
    }

    @ReactMethod
    fun sessionDelete(pathOrAddress: String, sessionSecret: String, promise: Promise) =
        runBinding("sessionDelete", promise) {
            uniffi.pubkycore.sessionDelete(pathOrAddress, sessionSecret)
            null
        }

    @ReactMethod
    fun startGrantAuthFlowWithConfig(configJson: String, promise: Promise) =
        runBinding("startGrantAuthFlowWithConfig", promise) {
            PubkyBridge.flowState(
                uniffi.pubkycore.startGrantAuthFlowWithConfig(
                    PubkyBridge.grantFlowConfig(configJson),
                ),
            )
        }

    @ReactMethod
    fun saveGrantAuthFlow(promise: Promise) =
        runBinding("saveGrantAuthFlow", promise) {
            PubkyBridge.flowState(uniffi.pubkycore.saveGrantAuthFlow())
        }

    @ReactMethod
    fun restoreGrantAuthFlow(stateJson: String, promise: Promise) =
        runBinding("restoreGrantAuthFlow", promise) {
            uniffi.pubkycore.restoreGrantAuthFlow(PubkyBridge.grantFlowState(stateJson))
        }

    @ReactMethod
    fun pollGrantAuthFlow(promise: Promise) =
        runBinding("pollGrantAuthFlow", promise) {
            uniffi.pubkycore.pollGrantAuthFlow()
        }

    @ReactMethod
    fun awaitGrantAuthFlow(promise: Promise) =
        runBinding("awaitGrantAuthFlow", promise) {
            uniffi.pubkycore.awaitGrantAuthFlow()
        }

    @ReactMethod
    fun cancelGrantAuthFlow(promise: Promise) =
        runBinding("cancelGrantAuthFlow", promise) {
            uniffi.pubkycore.cancelGrantAuthFlow()
            null
        }

    @ReactMethod
    fun signInGrantBlocking(secretKey: String, clientId: String, promise: Promise) =
        runBinding("signInGrantBlocking", promise) {
            uniffi.pubkycore.signInGrantBlocking(secretKey, clientId)
        }

    @ReactMethod
    fun signInCookieBlocking(secretKey: String, promise: Promise) =
        runBinding("signInCookieBlocking", promise) {
            uniffi.pubkycore.signInCookieBlocking(secretKey)
        }

    @ReactMethod
    fun startStorageEventStream(
        configJson: String,
        subscriptionId: String,
        promise: Promise,
    ) = runBinding("startStorageEventStream", promise) {
        val nativeId = uniffi.pubkycore.startEventStream(
            PubkyBridge.eventStreamConfig(configJson),
            StorageEventListener(subscriptionId),
        )
        eventStreams[subscriptionId] = nativeId
        null
    }

    @ReactMethod
    fun stopStorageEventStream(subscriptionId: String, promise: Promise) =
        runBinding("stopStorageEventStream", promise) {
            eventStreams.remove(subscriptionId)?.let { nativeId ->
                uniffi.pubkycore.stopEventStream(nativeId)
            } ?: false
        }

    @ReactMethod
    fun stopAllStorageEventStreams(promise: Promise) =
        runBinding("stopAllStorageEventStreams", promise) {
            eventStreams.clear()
            uniffi.pubkycore.stopAllEventStreams().toString()
        }

    @ReactMethod
    fun acquireStorageLock(
        pathOrAddress: String,
        sessionSecret: String,
        timeoutSeconds: Double,
        promise: Promise,
    ) = runBinding("acquireStorageLock", promise) {
        val storageLock = uniffi.pubkycore.sessionLock(
            pathOrAddress,
            sessionSecret,
            unsigned(timeoutSeconds, "timeoutSeconds"),
        )
        val id = UUID.randomUUID().toString()
        storageLocks[id] = storageLock
        PubkyBridge.lockInfo(id, storageLock.info())
    }

    @ReactMethod
    fun refreshStorageLock(lockId: String, timeoutSeconds: Double, promise: Promise) =
        runBinding("refreshStorageLock", promise) {
            val storageLock = storageLocks[lockId]
                ?: throw IllegalArgumentException("Unknown or released storage lock")
            PubkyBridge.lockInfo(
                lockId,
                storageLock.refresh(unsigned(timeoutSeconds, "timeoutSeconds")),
            )
        }

    @ReactMethod
    fun putWithStorageLock(lockId: String, content: String, promise: Promise) =
        runBinding("putWithStorageLock", promise) {
            val storageLock = storageLocks[lockId]
                ?: throw IllegalArgumentException("Unknown or released storage lock")
            storageLock.put(PubkyBridge.requiredBytes(content, "content"))
            null
        }

    @ReactMethod
    fun deleteWithStorageLock(lockId: String, promise: Promise) =
        runBinding("deleteWithStorageLock", promise) {
            val storageLock = storageLocks[lockId]
                ?: throw IllegalArgumentException("Unknown or released storage lock")
            storageLock.delete()
            null
        }

    @ReactMethod
    fun releaseStorageLock(lockId: String, promise: Promise) =
        runBinding("releaseStorageLock", promise) {
            val storageLock = storageLocks[lockId]
                ?: throw IllegalArgumentException("Unknown or released storage lock")
            storageLock.unlock()
            storageLocks.remove(lockId)?.destroy()
            null
        }

    companion object {
        const val NAME = "Pubky"
    }
}
