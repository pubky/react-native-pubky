import Foundation

@objc(Pubky)
class Pubky: NSObject {
    @objc(auth:secretKey:withResolver:withRejecter:)
    func auth(_ url: String, secretKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.auth(url: url, secretKey: secretKey)
                resolve(result)
            } catch {
                reject("auth Error", "Failed to auth", error)
            }
        }
    }

    @objc(parseAuthUrl:withResolver:withRejecter:)
    func parseAuthUrl(_ url: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let result = react_native_pubky.parseAuthUrl(url: url)
            resolve(result)
        } catch {
            reject("parseAuthUrl Error", "Failed to parse auth url", error)
        }
    }

    @objc(publish:recordContent:secretKey:withResolver:withRejecter:)
    func publish(recordName: String, recordContent: String, secretKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.publish(recordName: recordName, recordContent: recordContent, secretKey: secretKey)
                resolve(result)
            } catch {
                reject("publish Error", "Failed to publish", error)
            }
        }
    }

    @objc(resolve:withResolver:withRejecter:)
    func resolve(publicKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.resolve(publicKey: publicKey)
                resolve(result)
            } catch {
                reject("resolve Error", "Failed to resolve", error)
            }
        }
    }

    @objc(signUp:homeserver:withResolver:withRejecter:)
    func signUp(_ secretKey: String, homeserver: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.signUp(secretKey: secretKey, homeserver: homeserver)
                resolve(result)
            } catch {
                reject("signUp Error", "Failed to sign up", error)
            }
        }
    }

    @objc(signIn:withResolver:withRejecter:)
    func signIn(_ secretKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.signIn(secretKey: secretKey)
                resolve(result)
            } catch {
                reject("signIn Error", "Failed to sign in", error)
            }
        }
    }

    @objc(signOut:withResolver:withRejecter:)
    func signOut(_ secretKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.signOut(secretKey: secretKey)
                resolve(result)
            } catch {
                reject("signOut Error", "Failed to sign out", error)
            }
        }
    }

    @objc(put:content:withResolver:withRejecter:)
    func put(_ url: String, content: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.put(url: url, content: content)
                resolve(result)
            } catch {
                reject("put Error", "Failed to put", error)
            }
        }
    }

    @objc(get:withResolver:withRejecter:)
    func get(_ url: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.get(url: url)
                resolve(result)
            } catch {
                reject("get Error", "Failed to get", error)
            }
        }
    }

    @objc(publishHttps:target:secretKey:withResolver:withRejecter:)
    func publishHttps(_ recordName: String, target: String, secretKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.publishHttps(recordName: recordName, target: target, secretKey: secretKey)
                resolve(result)
            } catch {
                reject("publishHttps Error", "Failed to publish HTTPS record", error)
            }
        }
    }

    @objc(resolveHttps:withResolver:withRejecter:)
    func resolveHttps(_ publicKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.resolveHttps(publicKey: publicKey)
                resolve(result)
            } catch {
                reject("resolveHttps Error", "Failed to resolve HTTPS record", error)
            }
        }
    }

    @objc(list:withResolver:withRejecter:)
    func list(_ url: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.list(url: url)
                resolve(result)
            } catch {
                reject("list Error", "Failed to list", error)
            }
        }
    }
}
