#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(Pubky, NSObject)

RCT_EXTERN_METHOD(auth:(NSString *)url
                  secretKey:(NSString *)secretKey
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(parseAuthUrl:(NSString *)url
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
