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
import uniffi.pubkymobile.auth
import uniffi.pubkymobile.parseAuthUrl
import uniffi.pubkymobile.publish
import uniffi.pubkymobile.resolve
import uniffi.pubkymobile.signUp
import uniffi.pubkymobile.signIn
import uniffi.pubkymobile.signOut
import uniffi.pubkymobile.put
import uniffi.pubkymobile.get
import uniffi.pubkymobile.publishHttps
import uniffi.pubkymobile.resolveHttps

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
  fun signUp(secretKey: String, homeserver: String, promise: Promise) {
      CoroutineScope(Dispatchers.IO).launch {
          try {
              val result = signUp(secretKey, homeserver)
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

  companion object {
    const val NAME = "Pubky"
  }
}
