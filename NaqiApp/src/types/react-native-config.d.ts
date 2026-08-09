declare module 'react-native-config' {
  export interface NativeConfig {
    META_APP_ID: string;
    META_CLIENT_TOKEN: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
