import Foundation
import React

private struct PubkyBridgeValidationError: LocalizedError {
    let message: String

    var errorDescription: String? { message }
}

private enum PubkyBridge {
    static func object(_ json: String) throws -> [String: Any] {
        guard let data = json.data(using: .utf8),
              let value = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            throw PubkyBridgeValidationError(message: "Expected a JSON object")
        }
        return value
    }

    static func json(_ value: [String: Any]) throws -> String {
        let data = try JSONSerialization.data(withJSONObject: value)
        guard let result = String(data: data, encoding: .utf8) else {
            throw PubkyBridgeValidationError(message: "Failed to encode JSON")
        }
        return result
    }

    static func string(_ value: Any?) -> String? {
        guard !(value is NSNull) else { return nil }
        return value as? String
    }

    static func bool(_ value: Any?, default defaultValue: Bool = false) -> Bool {
        (value as? NSNumber)?.boolValue ?? defaultValue
    }

    static func uint64(_ value: Any?, field: String) throws -> UInt64? {
        guard let value, !(value is NSNull) else { return nil }
        if let string = value as? String, let parsed = UInt64(string) {
            return parsed
        }
        if let number = value as? NSNumber {
            let double = number.doubleValue
            guard double.isFinite, double >= 0, double.rounded(.towardZero) == double,
                  double <= Double(UInt64.max)
            else {
                throw PubkyBridgeValidationError(message: "\(field) must be an unsigned integer")
            }
            return UInt64(double)
        }
        throw PubkyBridgeValidationError(message: "\(field) must be an unsigned integer")
    }

    static func uint16(_ value: Any?, field: String) throws -> UInt16? {
        guard let value = try uint64(value, field: field) else { return nil }
        guard value <= UInt64(UInt16.max) else {
            throw PubkyBridgeValidationError(message: "\(field) exceeds UInt16")
        }
        return UInt16(value)
    }

    static func data(_ base64: String?, field: String) throws -> Data? {
        guard let base64 else { return nil }
        guard let result = Data(base64Encoded: base64) else {
            throw PubkyBridgeValidationError(message: "\(field) must be valid base64")
        }
        return result
    }

    static func grantApprovalMode(_ value: Any?) throws -> GrantApprovalMode? {
        guard let value = string(value) else { return nil }
        switch value {
        case "bareGrant": return .bareGrant
        case "signedApprovalV1": return .signedApprovalV1
        default:
            throw PubkyBridgeValidationError(message: "approvalFormat must be bareGrant or signedApprovalV1")
        }
    }

    static func customGrantProof(_ json: String) throws -> CustomGrantProof {
        let value = try object(json)
        guard let grant = string(value["grant"]), let proof = string(value["proof"]) else {
            throw PubkyBridgeValidationError(message: "Custom Grant proof requires grant and proof")
        }
        return CustomGrantProof(grant: grant, proof: proof)
    }

    static func customGrantProofJson(_ proof: CustomGrantProof) throws -> String {
        try json(["grant": proof.grant, "proof": proof.proof])
    }

    static func verifiedCustomGrantProofJson(_ proof: VerifiedCustomGrantProof) throws -> String {
        try json([
            "identity": proof.identity,
            "clientId": proof.clientId,
            "clientPublicKey": proof.clientPublicKey,
            "grantId": proof.grantId,
            "capabilities": proof.capabilities.map { ["path": $0.path, "permission": $0.permission] },
            "grantIssuedAt": String(proof.grantIssuedAt),
            "grantExpiresAt": String(proof.grantExpiresAt),
            "proofIssuedAt": String(proof.proofIssuedAt),
            "nonce": proof.nonce,
            "dataJson": proof.dataJson,
        ])
    }

    static func listOptions(_ json: String) throws -> StorageListOptions {
        let value = try object(json)
        return StorageListOptions(
            reverse: bool(value["reverse"]),
            shallow: bool(value["shallow"]),
            limit: try uint16(value["limit"], field: "limit"),
            cursor: string(value["cursor"])
        )
    }

    static func listPage(_ page: StorageListPage) throws -> String {
        var value: [String: Any] = ["entries": page.entries]
        if let cursor = page.nextCursor { value["nextCursor"] = cursor }
        return try json(value)
    }

    static func stats(_ stats: StorageResourceStats?) throws -> String? {
        guard let stats else { return nil }
        var value: [String: Any] = [:]
        if let length = stats.contentLength { value["contentLength"] = String(length) }
        if let type = stats.contentType { value["contentType"] = type }
        if let modified = stats.lastModifiedMs { value["lastModifiedMs"] = String(modified) }
        if let etag = stats.etag { value["etag"] = etag }
        return try json(value)
    }

    static func lockInfo(_ id: String, _ info: StorageLockInfo) throws -> String {
        try json([
            "id": id,
            "path": info.path,
            "token": info.token,
            "timeoutSeconds": String(info.timeoutSeconds),
        ])
    }

    static func flowState(_ state: GrantAuthFlowStateRecord) throws -> String {
        var value: [String: Any] = [
            "authorizationUrl": state.authorizationUrl,
            "clientKeySecret": state.clientKeySecret.base64EncodedString(),
        ]
        if let approvalKeySecret = state.approvalKeySecret {
            value["approvalKeySecret"] = approvalKeySecret.base64EncodedString()
        }
        return try json(value)
    }

    static func reject(_ error: Error, operation: String, reject: RCTPromiseRejectBlock) {
        var code = "PUBKY_UNKNOWN"
        var value: [String: Any] = ["kind": "unknown", "operation": operation]

        switch error {
        case let error as PubkyCoreError:
            switch error {
            case let .Transport(details):
                code = "PUBKY_TRANSPORT"
                value["kind"] = "transport"
                value["message"] = details
            case let .Server(status, details):
                code = "PUBKY_SERVER"
                value["kind"] = "server"
                value["status"] = Int(status)
                value["message"] = details
            case let .Validation(details):
                code = "PUBKY_VALIDATION"
                value["kind"] = "validation"
                value["message"] = details
            case let .DecodeJson(details):
                code = "PUBKY_DECODE_JSON"
                value["kind"] = "decodeJson"
                value["message"] = details
            case let .Pkarr(details, retryable):
                code = "PUBKY_PKARR"
                value["kind"] = "pkarr"
                value["retryable"] = retryable
                value["message"] = details
            case let .Parse(details):
                code = "PUBKY_PARSE"
                value["kind"] = "parse"
                value["message"] = details
            case let .Authentication(details, expired):
                code = "PUBKY_AUTHENTICATION"
                value["kind"] = "authentication"
                value["expired"] = expired
                value["message"] = details
            case let .Build(details):
                code = "PUBKY_BUILD"
                value["kind"] = "build"
                value["message"] = details
            case let .State(details):
                code = "PUBKY_STATE"
                value["kind"] = "state"
                value["message"] = details
            }
        case let validation as PubkyBridgeValidationError:
            code = "PUBKY_VALIDATION"
            value["kind"] = "validation"
            value["message"] = validation.message
        default:
            value["message"] = String(describing: error)
        }

        let message = (try? json(value)) ?? String(describing: error)
        reject(code, message, error as NSError)
    }
}

private final class PubkyBridgeState {
    static let shared = PubkyBridgeState()

    private let lock = NSLock()
    private var storageLocks: [String: PubkyStorageLock] = [:]
    private var eventStreams: [String: String] = [:]

    func store(lock storageLock: PubkyStorageLock, id: String) {
        lock.lock()
        storageLocks[id] = storageLock
        lock.unlock()
    }

    func storageLock(id: String) -> PubkyStorageLock? {
        lock.lock()
        defer { lock.unlock() }
        return storageLocks[id]
    }

    func removeStorageLock(id: String) {
        lock.lock()
        storageLocks.removeValue(forKey: id)
        lock.unlock()
    }

    func store(eventStream nativeId: String, id: String) {
        lock.lock()
        eventStreams[id] = nativeId
        lock.unlock()
    }

    func removeEventStream(id: String) -> String? {
        lock.lock()
        defer { lock.unlock() }
        return eventStreams.removeValue(forKey: id)
    }

    func removeAllEventStreams() {
        lock.lock()
        eventStreams.removeAll()
        lock.unlock()
    }
}

private final class PubkyStorageEventListener: PubkyEventStreamListener {
    weak var pubky: Pubky?
    let subscriptionId: String

    init(pubky: Pubky, subscriptionId: String) {
        self.pubky = pubky
        self.subscriptionId = subscriptionId
    }

    func onEvent(event: PubkyStorageEvent) {
        var eventValue: [String: Any] = [
            "eventType": event.eventType,
            "resource": event.resource,
            "cursor": String(event.cursor),
        ]
        eventValue["contentHash"] = event.contentHash ?? NSNull()

        pubky?.sendEvent(withName: "PubkyStorageEvent", body: [
            "subscriptionId": subscriptionId,
            "event": eventValue,
        ])
    }

    func onError(message: String) {
        pubky?.sendEvent(withName: "PubkyStorageEventError", body: [
            "subscriptionId": subscriptionId,
            "message": message,
        ])
    }

    func onComplete() {
        pubky?.sendEvent(withName: "PubkyStorageEventComplete", body: [
            "subscriptionId": subscriptionId,
        ])
    }
}

extension Pubky {
    private func requireStorageLock(_ id: String) throws -> PubkyStorageLock {
        guard let storageLock = PubkyBridgeState.shared.storageLock(id: id) else {
            throw PubkyBridgeValidationError(message: "Unknown or released storage lock")
        }
        return storageLock
    }

    @objc(configureClient:withResolver:withRejecter:)
    func configureClient(_ configJson: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let value = try PubkyBridge.object(configJson)
                let config = PubkyClientConfig(
                    useTestnet: PubkyBridge.bool(value["useTestnet"]),
                    testnetHost: PubkyBridge.string(value["testnetHost"]),
                    requestTimeoutMs: try PubkyBridge.uint64(value["requestTimeoutMs"], field: "requestTimeoutMs"),
                    readTimeoutMs: try PubkyBridge.uint64(value["readTimeoutMs"], field: "readTimeoutMs"),
                    poolMaxIdlePerHost: try PubkyBridge.uint64(value["poolMaxIdlePerHost"], field: "poolMaxIdlePerHost"),
                    maxErrorBodyBytes: try PubkyBridge.uint64(value["maxErrorBodyBytes"], field: "maxErrorBodyBytes"),
                    userAgentExtra: PubkyBridge.string(value["userAgentExtra"])
                )
                try react_native_pubky.configureClient(config: config)
                resolve(nil)
            } catch {
                PubkyBridge.reject(error, operation: "configureClient", reject: reject)
            }
        }
    }

    @objc(switchNetwork:withResolver:withRejecter:)
    func switchNetwork(_ useTestnet: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(react_native_pubky.switchNetwork(useTestnet: useTestnet))
    }

    @objc(publicGetBytes:withResolver:withRejecter:)
    func publicGetBytes(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.publicGetBytes(address: address).base64EncodedString()) }
            catch { PubkyBridge.reject(error, operation: "publicGetBytes", reject: reject) }
        }
    }

    @objc(publicExists:withResolver:withRejecter:)
    func publicExists(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.publicExists(address: address)) }
            catch { PubkyBridge.reject(error, operation: "publicExists", reject: reject) }
        }
    }

    @objc(publicStats:withResolver:withRejecter:)
    func publicStats(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try PubkyBridge.stats(react_native_pubky.publicStats(address: address))) }
            catch { PubkyBridge.reject(error, operation: "publicStats", reject: reject) }
        }
    }

    @objc(publicList:options:withResolver:withRejecter:)
    func publicList(_ address: String, options: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let page = try react_native_pubky.publicList(address: address, options: PubkyBridge.listOptions(options))
                resolve(try PubkyBridge.listPage(page))
            } catch { PubkyBridge.reject(error, operation: "publicList", reject: reject) }
        }
    }

    @objc(sessionGetBytes:sessionSecret:withResolver:withRejecter:)
    func sessionGetBytes(_ pathOrAddress: String, sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.sessionGetBytes(pathOrAddress: pathOrAddress, sessionSecret: sessionSecret).base64EncodedString()) }
            catch { PubkyBridge.reject(error, operation: "sessionGetBytes", reject: reject) }
        }
    }

    @objc(sessionExists:sessionSecret:withResolver:withRejecter:)
    func sessionExists(_ pathOrAddress: String, sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.sessionExists(pathOrAddress: pathOrAddress, sessionSecret: sessionSecret)) }
            catch { PubkyBridge.reject(error, operation: "sessionExists", reject: reject) }
        }
    }

    @objc(sessionStats:sessionSecret:withResolver:withRejecter:)
    func sessionStats(_ pathOrAddress: String, sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try PubkyBridge.stats(react_native_pubky.sessionStats(pathOrAddress: pathOrAddress, sessionSecret: sessionSecret))) }
            catch { PubkyBridge.reject(error, operation: "sessionStats", reject: reject) }
        }
    }

    @objc(sessionList:sessionSecret:options:withResolver:withRejecter:)
    func sessionList(_ pathOrAddress: String, sessionSecret: String, options: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let page = try react_native_pubky.sessionList(pathOrAddress: pathOrAddress, sessionSecret: sessionSecret, options: PubkyBridge.listOptions(options))
                resolve(try PubkyBridge.listPage(page))
            } catch { PubkyBridge.reject(error, operation: "sessionList", reject: reject) }
        }
    }

    @objc(sessionPutBytes:content:sessionSecret:withResolver:withRejecter:)
    func sessionPutBytes(_ pathOrAddress: String, content: String, sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                guard let data = try PubkyBridge.data(content, field: "content") else { throw PubkyBridgeValidationError(message: "content is required") }
                try react_native_pubky.sessionPutBytes(pathOrAddress: pathOrAddress, content: data, sessionSecret: sessionSecret)
                resolve(nil)
            } catch { PubkyBridge.reject(error, operation: "sessionPutBytes", reject: reject) }
        }
    }

    @objc(sessionDelete:sessionSecret:withResolver:withRejecter:)
    func sessionDelete(_ pathOrAddress: String, sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                try react_native_pubky.sessionDelete(pathOrAddress: pathOrAddress, sessionSecret: sessionSecret)
                resolve(nil)
            } catch { PubkyBridge.reject(error, operation: "sessionDelete", reject: reject) }
        }
    }

    @objc(startGrantAuthFlowWithConfig:withResolver:withRejecter:)
    func startGrantAuthFlowWithConfig(_ configJson: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let value = try PubkyBridge.object(configJson)
                let config = GrantAuthFlowConfig(
                    capabilities: PubkyBridge.string(value["capabilities"]) ?? "",
                    clientId: PubkyBridge.string(value["clientId"]) ?? "",
                    homeserver: PubkyBridge.string(value["homeserver"]),
                    signupToken: PubkyBridge.string(value["signupToken"]),
                    relay: PubkyBridge.string(value["relay"]),
                    clientSecret: try PubkyBridge.data(PubkyBridge.string(value["clientSecret"]), field: "clientSecret"),
                    clientKeySecret: try PubkyBridge.data(PubkyBridge.string(value["clientKeySecret"]), field: "clientKeySecret"),
                    approvalFormat: try PubkyBridge.grantApprovalMode(value["approvalFormat"]),
                    xSource: PubkyBridge.string(value["xSource"]),
                    xSuccess: PubkyBridge.string(value["xSuccess"]),
                    xError: PubkyBridge.string(value["xError"]),
                    xCancel: PubkyBridge.string(value["xCancel"])
                )
                resolve(try PubkyBridge.flowState(react_native_pubky.startGrantAuthFlowWithConfig(config: config)))
            } catch { PubkyBridge.reject(error, operation: "startGrantAuthFlowWithConfig", reject: reject) }
        }
    }

    @objc(saveGrantAuthFlow:withRejecter:)
    func saveGrantAuthFlow(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try PubkyBridge.flowState(react_native_pubky.saveGrantAuthFlow())) }
            catch { PubkyBridge.reject(error, operation: "saveGrantAuthFlow", reject: reject) }
        }
    }

    @objc(restoreGrantAuthFlow:withResolver:withRejecter:)
    func restoreGrantAuthFlow(_ stateJson: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let value = try PubkyBridge.object(stateJson)
                guard let authorizationUrl = PubkyBridge.string(value["authorizationUrl"]),
                      let secret = try PubkyBridge.data(PubkyBridge.string(value["clientKeySecret"]), field: "clientKeySecret")
                else { throw PubkyBridgeValidationError(message: "Invalid Grant flow state") }
                let approvalKeySecret = try PubkyBridge.data(PubkyBridge.string(value["approvalKeySecret"]), field: "approvalKeySecret")
                resolve(try react_native_pubky.restoreGrantAuthFlow(state: GrantAuthFlowStateRecord(
                    authorizationUrl: authorizationUrl,
                    clientKeySecret: secret,
                    approvalKeySecret: approvalKeySecret
                )))
            } catch { PubkyBridge.reject(error, operation: "restoreGrantAuthFlow", reject: reject) }
        }
    }

    @objc(pollGrantAuthFlow:withRejecter:)
    func pollGrantAuthFlow(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.pollGrantAuthFlow()) }
            catch { PubkyBridge.reject(error, operation: "pollGrantAuthFlow", reject: reject) }
        }
    }

    @objc(awaitGrantAuthFlow:withRejecter:)
    func awaitGrantAuthFlow(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.awaitGrantAuthFlow()) }
            catch { PubkyBridge.reject(error, operation: "awaitGrantAuthFlow", reject: reject) }
        }
    }

    @objc(cancelGrantAuthFlow:withRejecter:)
    func cancelGrantAuthFlow(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        react_native_pubky.cancelGrantAuthFlow()
        resolve(nil)
    }

    @objc(createCustomGrantProof:dataJson:withResolver:withRejecter:)
    func createCustomGrantProof(_ sessionSecret: String, dataJson: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let proof = try react_native_pubky.createCustomGrantProof(sessionSecret: sessionSecret, dataJson: dataJson)
                resolve(try PubkyBridge.customGrantProofJson(proof))
            } catch { PubkyBridge.reject(error, operation: "createCustomGrantProof", reject: reject) }
        }
    }

    @objc(verifyCustomGrantProof:clockSkewSeconds:withResolver:withRejecter:)
    func verifyCustomGrantProof(_ proofJson: String, clockSkewSeconds: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                guard let clockSkew = try PubkyBridge.uint64(clockSkewSeconds, field: "clockSkewSeconds") else {
                    throw PubkyBridgeValidationError(message: "clockSkewSeconds is required")
                }
                let proof = try PubkyBridge.customGrantProof(proofJson)
                let verified = try react_native_pubky.verifyCustomGrantProof(proof: proof, clockSkewSeconds: clockSkew)
                resolve(try PubkyBridge.verifiedCustomGrantProofJson(verified))
            } catch { PubkyBridge.reject(error, operation: "verifyCustomGrantProof", reject: reject) }
        }
    }

    @objc(grantEncryptionKeyScopes:withResolver:withRejecter:)
    func grantEncryptionKeyScopes(_ sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.grantEncryptionKeyScopes(sessionSecret: sessionSecret)) }
            catch { PubkyBridge.reject(error, operation: "grantEncryptionKeyScopes", reject: reject) }
        }
    }

    @objc(deriveGrantEncryptionKey:path:withResolver:withRejecter:)
    func deriveGrantEncryptionKey(_ sessionSecret: String, path: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.deriveGrantEncryptionKey(sessionSecret: sessionSecret, path: path)?.base64EncodedString()) }
            catch { PubkyBridge.reject(error, operation: "deriveGrantEncryptionKey", reject: reject) }
        }
    }

    @objc(grantSignedApproval:withResolver:withRejecter:)
    func grantSignedApproval(_ sessionSecret: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.grantSignedApproval(sessionSecret: sessionSecret)) }
            catch { PubkyBridge.reject(error, operation: "grantSignedApproval", reject: reject) }
        }
    }

    @objc(signInGrantBlocking:clientId:withResolver:withRejecter:)
    func signInGrantBlocking(_ secretKey: String, clientId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.signInGrantBlocking(secretKey: secretKey, clientId: clientId)) }
            catch { PubkyBridge.reject(error, operation: "signInGrantBlocking", reject: reject) }
        }
    }

    @objc(signInCookieBlocking:withResolver:withRejecter:)
    func signInCookieBlocking(_ secretKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do { resolve(try react_native_pubky.signInCookieBlocking(secretKey: secretKey)) }
            catch { PubkyBridge.reject(error, operation: "signInCookieBlocking", reject: reject) }
        }
    }

    @objc(startStorageEventStream:subscriptionId:withResolver:withRejecter:)
    func startStorageEventStream(_ configJson: String, subscriptionId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let value = try PubkyBridge.object(configJson)
                let rawUsers = value["users"] as? [[String: Any]] ?? []
                let users = try rawUsers.map { user in
                    EventStreamUser(
                        publicKey: PubkyBridge.string(user["publicKey"]) ?? "",
                        cursor: try PubkyBridge.uint64(user["cursor"], field: "cursor")
                    )
                }
                let config = EventStreamConfig(
                    users: users,
                    homeserver: PubkyBridge.string(value["homeserver"]),
                    paths: value["paths"] as? [String] ?? [],
                    limit: try PubkyBridge.uint16(value["limit"], field: "limit"),
                    maxEventBytes: try PubkyBridge.uint64(value["maxEventBytes"], field: "maxEventBytes"),
                    live: PubkyBridge.bool(value["live"]),
                    reverse: PubkyBridge.bool(value["reverse"]),
                    sessionSecret: PubkyBridge.string(value["sessionSecret"])
                )
                let listener = PubkyStorageEventListener(pubky: self, subscriptionId: subscriptionId)
                let nativeId = try react_native_pubky.startEventStream(config: config, listener: listener)
                PubkyBridgeState.shared.store(eventStream: nativeId, id: subscriptionId)
                resolve(nil)
            } catch { PubkyBridge.reject(error, operation: "startStorageEventStream", reject: reject) }
        }
    }

    @objc(stopStorageEventStream:withResolver:withRejecter:)
    func stopStorageEventStream(_ subscriptionId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let nativeId = PubkyBridgeState.shared.removeEventStream(id: subscriptionId) else {
            resolve(false)
            return
        }
        resolve(react_native_pubky.stopEventStream(subscriptionId: nativeId))
    }

    @objc(stopAllStorageEventStreams:withRejecter:)
    func stopAllStorageEventStreams(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        PubkyBridgeState.shared.removeAllEventStreams()
        resolve(String(react_native_pubky.stopAllEventStreams()))
    }

    @objc(acquireStorageLock:sessionSecret:timeoutSeconds:withResolver:withRejecter:)
    func acquireStorageLock(_ pathOrAddress: String, sessionSecret: String, timeoutSeconds: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                guard let timeout = try PubkyBridge.uint64(timeoutSeconds, field: "timeoutSeconds") else { throw PubkyBridgeValidationError(message: "timeoutSeconds is required") }
                let storageLock = try react_native_pubky.sessionLock(pathOrAddress: pathOrAddress, sessionSecret: sessionSecret, timeoutSeconds: timeout)
                let id = UUID().uuidString
                PubkyBridgeState.shared.store(lock: storageLock, id: id)
                resolve(try PubkyBridge.lockInfo(id, storageLock.info()))
            } catch { PubkyBridge.reject(error, operation: "acquireStorageLock", reject: reject) }
        }
    }

    @objc(refreshStorageLock:timeoutSeconds:withResolver:withRejecter:)
    func refreshStorageLock(_ id: String, timeoutSeconds: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                guard let timeout = try PubkyBridge.uint64(timeoutSeconds, field: "timeoutSeconds") else { throw PubkyBridgeValidationError(message: "timeoutSeconds is required") }
                resolve(try PubkyBridge.lockInfo(id, requireStorageLock(id).refresh(timeoutSeconds: timeout)))
            } catch { PubkyBridge.reject(error, operation: "refreshStorageLock", reject: reject) }
        }
    }

    @objc(putWithStorageLock:content:withResolver:withRejecter:)
    func putWithStorageLock(_ id: String, content: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                guard let data = try PubkyBridge.data(content, field: "content") else { throw PubkyBridgeValidationError(message: "content is required") }
                try requireStorageLock(id).put(content: data)
                resolve(nil)
            } catch { PubkyBridge.reject(error, operation: "putWithStorageLock", reject: reject) }
        }
    }

    @objc(deleteWithStorageLock:withResolver:withRejecter:)
    func deleteWithStorageLock(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                try requireStorageLock(id).delete()
                resolve(nil)
            } catch { PubkyBridge.reject(error, operation: "deleteWithStorageLock", reject: reject) }
        }
    }

    @objc(releaseStorageLock:withResolver:withRejecter:)
    func releaseStorageLock(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                try requireStorageLock(id).unlock()
                PubkyBridgeState.shared.removeStorageLock(id: id)
                resolve(nil)
            } catch { PubkyBridge.reject(error, operation: "releaseStorageLock", reject: reject) }
        }
    }
}
