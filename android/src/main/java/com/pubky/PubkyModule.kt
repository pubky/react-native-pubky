package com.pubky

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.mobile.auth

class PubkyModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
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

  companion object {
    const val NAME = "Pubky"
  }
}
