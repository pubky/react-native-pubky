import Foundation
import React

@objc(Pubky)
class Pubky: RCTEventEmitter {

    override init() {
        super.init()
    }

    @objc override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    override func supportedEvents() -> [String]! {
        return ["PubkyEvent"]
    }

    class EventListenerImpl: EventListener {
        weak var pubky: Pubky?

        init(pubky: Pubky) {
            self.pubky = pubky
        }

        func onEventOccurred(eventData: String) {
            pubky?.sendEvent(withName: "PubkyEvent", body: eventData)
        }
    }

    @objc(setEventListener:withRejecter:)
    func setEventListener(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let listener = EventListenerImpl(pubky: self)
        react_native_pubky.setEventListener(listener: listener)
        resolve(nil)
    }

    @objc(removeEventListener:withRejecter:)
    func removeEventListener(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        react_native_pubky.removeEventListener()
        resolve(nil)
    }

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

    @objc(getSignupToken:adminPassword:withResolver:withRejecter:)
    func getSignupToken(_ homeserverPubky: String, adminPassword: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.getSignupToken(homeserverPubky: homeserverPubky, adminPassword: adminPassword)
                resolve(result)
            } catch {
                reject("getSignupToken Error", "Failed to get signup token", error)
            }
        }
    }

    @objc(signUp:homeserver:signupToken:withResolver:withRejecter:)
    func signUp(_ secretKey: String, homeserver: String, signupToken: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.signUp(secretKey: secretKey, homeserver: homeserver, signupToken: signupToken)
                resolve(result)
            } catch {
                reject("signUp Error", "Failed to sign up", error)
            }
        }
    }

    @objc(republishHomeserver:homeserver:withResolver:withRejecter:)
    func republishHomeserver(_ secretKey: String, homeserver: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.republishHomeserver(secretKey: secretKey, homeserver: homeserver)
                resolve(result)
            } catch {
                reject("republishHomeserver Error", "Failed to republish homeserver", error)
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
    func signOut(_ sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.signOut(sessionSecret: sessionSecret)
                resolve(result)
            } catch {
                reject("signOut Error", "Failed to sign out", error)
            }
        }
    }

    @objc(revalidateSession:withResolver:withRejecter:)
    func revalidateSession(_ sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.revalidateSession(sessionSecret: sessionSecret)
                resolve(result)
            } catch {
                reject("revalidateSession Error", "Failed to revalidate session", error)
            }
        }
    }

    @objc(put:content:secretKey:withResolver:withRejecter:)
    func put(_ url: String, content: String, secretKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.put(url: url, content: content, secretKey: secretKey)
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

    @objc(deleteFile:secretKey:withResolver:withRejecter:)
    func deleteFile(_ url: String, secretKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.deleteFile(url: url, secretKey: secretKey)
                resolve(result)
            } catch {
                reject("list Error", "Failed to deleteFile", error)
            }
        }
    }

    @objc(generateSecretKey:withRejecter:)
    func generateSecretKey(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.generateSecretKey()
                resolve(result)
            } catch {
                reject("generateSecretKey Error", "Failed to generate secret key", error)
            }
        }
    }

    @objc(getPublicKeyFromSecretKey:withResolver:withRejecter:)
    func getPublicKeyFromSecretKey(_ secretKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.getPublicKeyFromSecretKey(secretKey: secretKey)
                resolve(result)
            } catch {
                reject("getPublicKeyFromSecretKey Error", "Failed to get public key", error)
            }
        }
    }

    @objc(createRecoveryFile:passphrase:withResolver:withRejecter:)
    func createRecoveryFile(_ secretKey: String, passphrase: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let result = react_native_pubky.createRecoveryFile(secretKey: secretKey, passphrase: passphrase)
            resolve(result)
        } catch {
            reject("createRecoveryFile Error", "Failed to create recovery file", error)
        }
    }

    @objc(decryptRecoveryFile:passphrase:withResolver:withRejecter:)
    func decryptRecoveryFile(_ recoveryFile: String, passphrase: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let result = react_native_pubky.decryptRecoveryFile(recoveryFile: recoveryFile, passphrase: passphrase)
            resolve(result)
        } catch {
            reject("decryptRecoveryFile Error", "Failed to decrypt recovery file", error)
        }
    }

    @objc(getHomeserver:withResolver:withRejecter:)
    func getHomeserver(_ pubky: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await react_native_pubky.getHomeserver(pubky: pubky)
                resolve(result)
            } catch {
                reject("getHomeserver Error", "Failed to get homeserver", error)
            }
        }
    }

    @objc(generateMnemonicPhrase:withRejecter:)
    func generateMnemonicPhrase(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.generateMnemonicPhrase()
                resolve(result)
            } catch {
                reject("generateMnemonicPhrase Error", "Failed to generate mnemonic phrase", error)
            }
        }
    }

    @objc(mnemonicPhraseToKeypair:withResolver:withRejecter:)
    func mnemonicPhraseToKeypair(_ mnemonicPhrase: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.mnemonicPhraseToKeypair(mnemonicPhrase: mnemonicPhrase)
                resolve(result)
            } catch {
                reject("mnemonicPhraseToKeypair Error", "Failed to convert mnemonic phrase to keypair", error)
            }
        }
    }

    @objc(generateMnemonicPhraseAndKeypair:withRejecter:)
    func generateMnemonicPhraseAndKeypair(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.generateMnemonicPhraseAndKeypair()
                resolve(result)
            } catch {
                reject("generateMnemonicPhraseAndKeypair Error", "Failed to generate mnemonic phrase and keypair", error)
            }
        }
    }

    @objc(validateMnemonicPhrase:withResolver:withRejecter:)
    func validateMnemonicPhrase(_ mnemonicPhrase: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.validateMnemonicPhrase(mnemonicPhrase: mnemonicPhrase)
                resolve(result)
            } catch {
                reject("validateMnemonicPhrase Error", "Failed to validate mnemonic phrase", error)
            }
        }
    }

    @objc(startAuthFlow:withResolver:withRejecter:)
    func startAuthFlow(_ capabilities: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.startAuthFlow(capabilitiesStr: capabilities)
                resolve(result)
            } catch {
                reject("startAuthFlow Error", "Failed to start auth flow", error)
            }
        }
    }

    @objc(awaitAuthApproval:withRejecter:)
    func awaitAuthApproval(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.awaitAuthApproval()
                resolve(result)
            } catch {
                reject("awaitAuthApproval Error", "Failed to await auth approval", error)
            }
        }
    }

    @objc(putWithSession:content:sessionSecret:withResolver:withRejecter:)
    func putWithSession(_ url: String, content: String, sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.putWithSession(url: url, content: content, sessionSecret: sessionSecret)
                resolve(result)
            } catch {
                reject("putWithSession Error", "Failed to put with session", error)
            }
        }
    }

    @objc(deleteWithSession:sessionSecret:withResolver:withRejecter:)
    func deleteWithSession(_ url: String, sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = react_native_pubky.deleteWithSession(url: url, sessionSecret: sessionSecret)
                resolve(result)
            } catch {
                reject("deleteWithSession Error", "Failed to delete with session", error)
            }
        }
    }
}
