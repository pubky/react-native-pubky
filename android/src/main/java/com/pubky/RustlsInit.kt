// NOTE: This file declares `package uniffi.pubkycore` but intentionally lives in the
// com/pubky/ directory. The uniffi bindings directory (java/uniffi/pubkycore/) is
// regenerated/wiped whenever the Kotlin bindings are rebuilt, which would delete this
// file. Keeping it alongside PubkyModule.kt (which is not regenerated) makes it durable.
// The package stays `uniffi.pubkycore` so the JNI symbol name remains
// `Java_uniffi_pubkycore_RustlsInit_initPlatformVerifier`, matching the Rust export in
// pubky-core-ffi/src/rustls_init.rs (changing the package would require rebuilding the .so).
package uniffi.pubkycore

import android.content.Context

/**
 * One-time Android initialization for rustls-platform-verifier.
 *
 * pkarr's relay HTTP client (reqwest 0.13 + rustls-platform-verifier) must be handed the
 * JVM + application Context before the first TLS handshake, or verification fails with
 * "Expect rustls-platform-verifier to be initialized". The uniffi bindings load
 * libpubkycore.so via JNA (no JNI_OnLoad), so we trigger init explicitly here: we load the
 * library through System.loadLibrary so the JVM binds the JNI symbol, then call into Rust
 * (see pubky-core-ffi/src/rustls_init.rs) passing the application Context.
 *
 * iOS/macOS use Security.framework and need no initialization, so this is Android-only.
 */
object RustlsInit {
    @JvmStatic
    private external fun initPlatformVerifier(context: Context)

    @Volatile
    private var initialized = false

    @JvmStatic
    @Synchronized
    fun ensure(context: Context) {
        if (initialized) return
        // Bind the JNI symbol in libpubkycore.so. This resolves to the same loaded library
        // that uniffi's JNA layer uses, so the Rust-side rustls-platform-verifier `GLOBAL`
        // is shared. init is idempotent (OnceCell) on the Rust side.
        System.loadLibrary("pubkycore")
        initPlatformVerifier(context.applicationContext)
        initialized = true
    }
}
