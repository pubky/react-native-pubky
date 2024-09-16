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
        Task {
            do {
                let result = react_native_pubky.parseAuthUrl(url: url)
                resolve(result)
            } catch {
                reject("parseAuthUrl Error", "Failed to parse auth url", error)
            }
        }
    }
}
