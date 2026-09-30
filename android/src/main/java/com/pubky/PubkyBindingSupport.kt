package com.pubky

import com.facebook.react.bridge.Promise
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import uniffi.pubkycore.EventStreamConfig
import uniffi.pubkycore.EventStreamUser
import uniffi.pubkycore.GrantAuthFlowConfig
import uniffi.pubkycore.GrantAuthFlowStateRecord
import uniffi.pubkycore.PubkyClientConfig
import uniffi.pubkycore.PubkyCoreException
import uniffi.pubkycore.StorageListOptions
import uniffi.pubkycore.StorageListPage
import uniffi.pubkycore.StorageLockInfo
import uniffi.pubkycore.StorageResourceStats

internal object PubkyBridge {
    fun objectValue(json: String): JSONObject = JSONObject(json)

    fun optionalString(value: JSONObject, key: String): String? =
        if (value.has(key) && !value.isNull(key)) value.getString(key) else null

    fun optionalULong(value: JSONObject, key: String): ULong? {
        if (!value.has(key) || value.isNull(key)) return null
        val raw = value.get(key)
        return when (raw) {
            is String -> raw.toULongOrNull()
            is Number -> {
                val number = raw.toDouble()
                if (!number.isFinite() || number < 0 || number % 1.0 != 0.0) null
                else number.toULong()
            }
            else -> null
        } ?: throw IllegalArgumentException("$key must be an unsigned integer")
    }

    fun optionalUShort(value: JSONObject, key: String): UShort? {
        val result = optionalULong(value, key) ?: return null
        require(result <= UShort.MAX_VALUE.toULong()) { "$key exceeds UInt16" }
        return result.toUShort()
    }

    fun optionalBytes(value: JSONObject, key: String): ByteArray? =
        optionalString(value, key)?.let {
            try {
                Base64.decode(it, Base64.DEFAULT)
            } catch (error: IllegalArgumentException) {
                throw IllegalArgumentException("$key must be valid base64", error)
            }
        }

    fun requiredBytes(base64: String, field: String): ByteArray =
        try {
            Base64.decode(base64, Base64.DEFAULT)
        } catch (error: IllegalArgumentException) {
            throw IllegalArgumentException("$field must be valid base64", error)
        }

    fun clientConfig(json: String): PubkyClientConfig {
        val value = objectValue(json)
        return PubkyClientConfig(
            useTestnet = value.optBoolean("useTestnet", false),
            testnetHost = optionalString(value, "testnetHost"),
            requestTimeoutMs = optionalULong(value, "requestTimeoutMs"),
            readTimeoutMs = optionalULong(value, "readTimeoutMs"),
            poolMaxIdlePerHost = optionalULong(value, "poolMaxIdlePerHost"),
            maxErrorBodyBytes = optionalULong(value, "maxErrorBodyBytes"),
            userAgentExtra = optionalString(value, "userAgentExtra"),
        )
    }

    fun listOptions(json: String): StorageListOptions {
        val value = objectValue(json)
        return StorageListOptions(
            reverse = value.optBoolean("reverse", false),
            shallow = value.optBoolean("shallow", false),
            limit = optionalUShort(value, "limit"),
            cursor = optionalString(value, "cursor"),
        )
    }

    fun grantFlowConfig(json: String): GrantAuthFlowConfig {
        val value = objectValue(json)
        return GrantAuthFlowConfig(
            capabilities = value.optString("capabilities", ""),
            clientId = value.optString("clientId", ""),
            homeserver = optionalString(value, "homeserver"),
            signupToken = optionalString(value, "signupToken"),
            relay = optionalString(value, "relay"),
            clientSecret = optionalBytes(value, "clientSecret"),
            clientKeySecret = optionalBytes(value, "clientKeySecret"),
            xSource = optionalString(value, "xSource"),
            xSuccess = optionalString(value, "xSuccess"),
            xError = optionalString(value, "xError"),
            xCancel = optionalString(value, "xCancel"),
        )
    }

    fun grantFlowState(json: String): GrantAuthFlowStateRecord {
        val value = objectValue(json)
        return GrantAuthFlowStateRecord(
            authorizationUrl = value.getString("authorizationUrl"),
            clientKeySecret = requiredBytes(value.getString("clientKeySecret"), "clientKeySecret"),
        )
    }

    fun eventStreamConfig(json: String): EventStreamConfig {
        val value = objectValue(json)
        val users = value.optJSONArray("users") ?: JSONArray()
        val paths = value.optJSONArray("paths") ?: JSONArray()
        return EventStreamConfig(
            users = (0 until users.length()).map { index ->
                val user = users.getJSONObject(index)
                EventStreamUser(
                    publicKey = user.optString("publicKey", ""),
                    cursor = optionalULong(user, "cursor"),
                )
            },
            homeserver = optionalString(value, "homeserver"),
            paths = (0 until paths.length()).map(paths::getString),
            limit = optionalUShort(value, "limit"),
            maxEventBytes = optionalULong(value, "maxEventBytes"),
            live = value.optBoolean("live", false),
            reverse = value.optBoolean("reverse", false),
            sessionSecret = optionalString(value, "sessionSecret"),
        )
    }

    fun listPage(page: StorageListPage): String = JSONObject()
        .put("entries", JSONArray(page.entries))
        .apply { page.nextCursor?.let { put("nextCursor", it) } }
        .toString()

    fun stats(stats: StorageResourceStats?): String? = stats?.let {
        JSONObject()
            .apply { it.contentLength?.let { value -> put("contentLength", value.toString()) } }
            .apply { it.contentType?.let { value -> put("contentType", value) } }
            .apply { it.lastModifiedMs?.let { value -> put("lastModifiedMs", value.toString()) } }
            .apply { it.etag?.let { value -> put("etag", value) } }
            .toString()
    }

    fun lockInfo(id: String, info: StorageLockInfo): String = JSONObject()
        .put("id", id)
        .put("path", info.path)
        .put("token", info.token)
        .put("timeoutSeconds", info.timeoutSeconds.toString())
        .toString()

    fun flowState(state: GrantAuthFlowStateRecord): String = JSONObject()
        .put("authorizationUrl", state.authorizationUrl)
        .put("clientKeySecret", Base64.encodeToString(state.clientKeySecret, Base64.NO_WRAP))
        .toString()

    fun reject(error: Throwable, operation: String, promise: Promise) {
        var code = "PUBKY_UNKNOWN"
        val value = JSONObject().put("kind", "unknown").put("operation", operation)

        when (error) {
            is PubkyCoreException.Transport -> {
                code = "PUBKY_TRANSPORT"
                value.put("kind", "transport").put("message", error.details)
            }
            is PubkyCoreException.Server -> {
                code = "PUBKY_SERVER"
                value.put("kind", "server").put("status", error.status.toInt()).put("message", error.details)
            }
            is PubkyCoreException.Validation -> {
                code = "PUBKY_VALIDATION"
                value.put("kind", "validation").put("message", error.details)
            }
            is PubkyCoreException.DecodeJson -> {
                code = "PUBKY_DECODE_JSON"
                value.put("kind", "decodeJson").put("message", error.details)
            }
            is PubkyCoreException.Pkarr -> {
                code = "PUBKY_PKARR"
                value.put("kind", "pkarr").put("retryable", error.retryable).put("message", error.details)
            }
            is PubkyCoreException.Parse -> {
                code = "PUBKY_PARSE"
                value.put("kind", "parse").put("message", error.details)
            }
            is PubkyCoreException.Authentication -> {
                code = "PUBKY_AUTHENTICATION"
                value.put("kind", "authentication").put("expired", error.expired).put("message", error.details)
            }
            is PubkyCoreException.Build -> {
                code = "PUBKY_BUILD"
                value.put("kind", "build").put("message", error.details)
            }
            is PubkyCoreException.State -> {
                code = "PUBKY_STATE"
                value.put("kind", "state").put("message", error.details)
            }
            is IllegalArgumentException, is org.json.JSONException -> {
                code = "PUBKY_VALIDATION"
                value.put("kind", "validation").put("message", error.message ?: error.toString())
            }
            else -> value.put("message", error.message ?: error.toString())
        }

        promise.reject(code, value.toString(), error)
    }
}
