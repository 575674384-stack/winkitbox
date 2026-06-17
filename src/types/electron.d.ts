export {};

declare global {
  interface Window {
    winKitBox?: {
      openUrl: (url: string) => Promise<boolean>;
      fetchGitHub: (request: {
        url: string;
        proxy: {
          mode: "system" | "direct" | "manual";
          manualProxy: string;
        };
        token?: string;
      }) => Promise<{
        ok: boolean;
        status: number;
        text: string;
        headers: Record<string, string>;
      }>;
      translateText: (request: {
        url: string;
        proxy: {
          mode: "system" | "direct" | "manual";
          manualProxy: string;
        };
      }) => Promise<{
        ok: boolean;
        status: number;
        text: string;
        headers: Record<string, string>;
      }>;
      getSettings: () => Promise<{
        toolRootPath: string;
        defaultToolRootPath: string;
        updateOnStartup: boolean;
        aiBaseUrl: string;
        aiApiKey: string;
        aiModel: string;
        themeId: import("../core/themes").ThemeId;
        themeBackgrounds: Partial<Record<import("../core/themes").ThemeId, string>>;
        glassOpacity: number;
        glassBlur: number;
        customTools: import("../core/catalog").Tool[];
        customCategories: import("../core/catalog").CategoryDefinition[];
      }>;
      setSettings: (settings: {
        toolRootPath: string;
        updateOnStartup?: boolean;
        aiBaseUrl?: string;
        aiApiKey?: string;
        aiModel?: string;
        themeId?: import("../core/themes").ThemeId;
        themeBackgrounds?: Partial<Record<import("../core/themes").ThemeId, string>>;
        glassOpacity?: number;
        glassBlur?: number;
        customTools?: import("../core/catalog").Tool[];
        customCategories?: import("../core/catalog").CategoryDefinition[];
      }) => Promise<{
        toolRootPath: string;
        defaultToolRootPath: string;
        updateOnStartup: boolean;
        aiBaseUrl: string;
        aiApiKey: string;
        aiModel: string;
        themeId: import("../core/themes").ThemeId;
        themeBackgrounds: Partial<Record<import("../core/themes").ThemeId, string>>;
        glassOpacity: number;
        glassBlur: number;
        customTools: import("../core/catalog").Tool[];
        customCategories: import("../core/catalog").CategoryDefinition[];
      }>;
      selectToolRoot: (currentPath?: string) => Promise<string | undefined>;
      selectLocalLauncher: (currentPath?: string) => Promise<string | undefined>;
      selectThemeBackground: (request: {
        themeId: import("../core/themes").ThemeId;
      }) => Promise<{
        canceled: boolean;
        themeId?: import("../core/themes").ThemeId;
        backgroundUrl?: string;
      }>;
      clearThemeBackground: (request: {
        themeId: import("../core/themes").ThemeId;
      }) => Promise<{
        themeId: import("../core/themes").ThemeId;
        backgroundUrl: string;
      }>;
      checkUpdates: () => Promise<{
        currentVersion: string;
        latestVersion?: string;
        releaseUrl?: string;
        hasUpdate: boolean;
        assets: {
          name: string;
          browser_download_url: string;
        }[];
        error?: string;
      }>;
      downloadUpdate: (request: {
        downloadUrl: string;
        fileName: string;
      }) => Promise<{ filePath: string }>;
      applyUpdate: (request: { installerPath: string }) => Promise<{ ok: boolean }>;
      getSystemInfo: () => Promise<{
        computerName: string;
        os: {
          caption: string;
          version: string;
          buildNumber: string;
        };
        cpu: string;
        memoryGb: number;
        disks: {
          name: string;
          volumeName: string;
          fileSystem: string;
          sizeGb: number;
          freeGb: number;
        }[];
        physicalDisks: {
          model: string;
          interfaceType: string;
          mediaType: string;
          sizeGb: number;
        }[];
        gpus: {
          name: string;
          adapterRamGb?: number;
          driverVersion: string;
        }[];
        utf8BetaEnabled: boolean;
        adapters: {
          id: string;
          name: string;
          description: string;
          status: string;
          macAddress: string;
          dhcpEnabled: boolean;
          ipv4: {
            address: string;
            prefixLength: number;
          }[];
          gateway: string;
          dnsServers: string[];
        }[];
      }>;
      testDnsServers: (servers: string[]) => Promise<{
        server: string;
        latencyMs?: number;
        ok: boolean;
        error?: string;
      }[]>;
      applyNetworkConfig: (request: {
        adapterId: string;
        mode: "dns" | "static" | "dhcp";
        ipAddress?: string;
        prefixLength?: number;
        gateway?: string;
        dnsServers: string[];
      }) => Promise<{ code: number | null }>;
      setSystemUtf8Beta: (request: {
        enabled: boolean;
      }) => Promise<{ code: number | null }>;
      saveConfigFile: (request: { content: string }) => Promise<{
        canceled: boolean;
        filePath?: string;
      }>;
      openConfigFile: () => Promise<{
        canceled: boolean;
        filePath?: string;
        content?: string;
      }>;
      listAiModels: (request: {
        baseUrl: string;
        apiKey: string;
      }) => Promise<{ models: string[] }>;
      testAiConnection: (request: {
        baseUrl: string;
        apiKey: string;
        model: string;
      }) => Promise<{ ok: boolean }>;
      generateAiTool: (request: {
        baseUrl: string;
        apiKey: string;
        model: string;
        toolUrl: string;
        categoryId?: string;
      }) => Promise<{
        candidate: import("../core/aiTool").AiToolCandidate;
        context: import("../core/aiTool").AiToolGitHubContext;
      }>;
      fixAiTool: (request: {
        baseUrl: string;
        apiKey: string;
        model: string;
        tool: import("../core/catalog").Tool;
        errorMessage?: string;
      }) => Promise<{
        candidate: import("../core/aiTool").AiToolCandidate;
      }>;
      runPowerShell: (script: string) => Promise<{ code: number | null }>;
      detectTools: (descriptors: {
        toolId: string;
        label: string;
        wingetId?: string;
        appUserModelIds: string[];
        startMenuNames: string[];
        commands: string[];
        homepage: string;
      }[]) => Promise<{
        toolId: string;
        installed: boolean;
        launcherFound: boolean;
        launcherType: string;
        message: string;
      }[]>;
      launchTool: (descriptor: {
        toolId: string;
        label: string;
        wingetId?: string;
        appUserModelIds: string[];
        startMenuNames: string[];
        commands: string[];
        homepage: string;
      }) => Promise<{ code: number | null }>;
      onRunOutput: (callback: (value: string) => void) => () => void;
    };
  }
}
