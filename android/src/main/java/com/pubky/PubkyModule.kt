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

class PubkyModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

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
    fun deleteFile(url: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = deleteFile(url)
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
    fun session(pubky: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = session(pubky)
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
    fun signUp(secretKey: String, homeserver: String, signupToken: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signUp(secretKey, homeserver, signupToken)
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
    fun signIn(secretKey: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signIn(secretKey)
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
    fun signOut(secretKey: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = signOut(secretKey)
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
    fun put(url: String, content: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = put(url, content)
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

    companion object {
        const val NAME = "Pubky"
    }
}
