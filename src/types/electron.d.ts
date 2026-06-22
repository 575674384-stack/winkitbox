export {};

declare global {
  interface Window {
    winKitBox?: {
      openUrl: (url: string) => Promise<boolean>;
      fetchGitHub: (request: {
        url: string;
        proxy?: {
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
        proxy?: {
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
        proxyMode: "system" | "direct" | "manual";
        proxyManual: string;
        themeId: import("../core/themes").ThemeId;
        themeBackgrounds: Partial<Record<import("../core/themes").ThemeId, string>>;
        glassOpacity: number;
        glassBlur: number;
        customTools: import("../core/catalog").Tool[];
        customCategories: import("../core/catalog").CategoryDefinition[];
        toolCategoryOverrides: Record<string, string>;
      }>;
      setSettings: (settings: {
        toolRootPath: string;
        updateOnStartup?: boolean;
        aiBaseUrl?: string;
        aiApiKey?: string;
        aiModel?: string;
        proxyMode?: "system" | "direct" | "manual";
        proxyManual?: string;
        themeId?: import("../core/themes").ThemeId;
        themeBackgrounds?: Partial<Record<import("../core/themes").ThemeId, string>>;
        glassOpacity?: number;
        glassBlur?: number;
        customTools?: import("../core/catalog").Tool[];
        customCategories?: import("../core/catalog").CategoryDefinition[];
        toolCategoryOverrides?: Record<string, string>;
      }) => Promise<{
        toolRootPath: string;
        defaultToolRootPath: string;
        updateOnStartup: boolean;
        aiBaseUrl: string;
        aiApiKey: string;
        aiModel: string;
        proxyMode: "system" | "direct" | "manual";
        proxyManual: string;
        themeId: import("../core/themes").ThemeId;
        themeBackgrounds: Partial<Record<import("../core/themes").ThemeId, string>>;
        glassOpacity: number;
        glassBlur: number;
        customTools: import("../core/catalog").Tool[];
        customCategories: import("../core/catalog").CategoryDefinition[];
        toolCategoryOverrides: Record<string, string>;
      }>;
      getConfigBackups: () => Promise<import("../core/configBackups").ConfigBackupEntry[]>;
      createConfigBackup: () => Promise<import("../core/configBackups").ConfigBackupEntry[]>;
      restoreConfigBackup: (fileName: string) => Promise<{
        settings: Awaited<ReturnType<NonNullable<Window["winKitBox"]>["getSettings"]>>;
        backups: import("../core/configBackups").ConfigBackupEntry[];
      }>;
      getActivityLog: () => Promise<import("../core/activityLog").ActivityLogEntry[]>;
      addActivityLog: (
        entry: import("../core/activityLog").ActivityLogInput,
      ) => Promise<import("../core/activityLog").ActivityLogEntry[]>;
      clearActivityLog: () => Promise<import("../core/activityLog").ActivityLogEntry[]>;
      getAiLog: () => Promise<import("../core/aiLog").AiLogEntry[]>;
      addAiLog: (
        entry: import("../core/aiLog").AiLogInput,
      ) => Promise<import("../core/aiLog").AiLogEntry[]>;
      clearAiLog: () => Promise<import("../core/aiLog").AiLogEntry[]>;
      selectToolRoot: (currentPath?: string) => Promise<string | undefined>;
      selectLocalLauncher: (currentPath?: string) => Promise<string | undefined>;
      selectLocalPackage: (currentPath?: string) => Promise<string | undefined>;
      selectLocalFile: (currentPath?: string) => Promise<string | undefined>;
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
      checkToolUpdates: (
        descriptors: import("../core/toolUpdates").ToolUpdateDescriptor[],
      ) => Promise<import("../core/toolUpdates").ToolUpdateCheckResult[]>;
      checkToolSources: (
        descriptors: import("../core/toolSourceHealth").ToolSourceHealthDescriptor[],
      ) => Promise<import("../core/toolSourceHealth").ToolSourceHealthResult[]>;
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
          dedicatedMemoryGb?: number;
          driverVersion: string;
        }[];
        environment?: import("../core/environment").EnvironmentSnapshot;
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
      testDnsServers: (
        servers: string[],
        domain?: string,
      ) => Promise<{
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
      saveLogFile: (request: {
        content: string;
        fileName: string;
        format: "json" | "txt";
      }) => Promise<{
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
        aiResponse?: string;
      }>;
      recommendAiRepos: (request: {
        baseUrl: string;
        apiKey: string;
        model: string;
        prompt: string;
      }) => Promise<unknown & { aiResponse?: string }>;
      fixAiTool: (request: {
        baseUrl: string;
        apiKey: string;
        model: string;
        tool: import("../core/catalog").Tool;
        errorMessage?: string;
      }) => Promise<{
        candidate: import("../core/aiTool").AiToolCandidate;
        aiResponse?: string;
      }>;
      analyzeLocalFile: (request: {
        baseUrl: string;
        apiKey: string;
        model: string;
        filePath: string;
        toolName?: string;
        categoryId?: string;
        remark?: string;
      }) => Promise<{
        aiResponse?: string;
        candidate: {
          mode?: "collect" | "local-installer" | "local-archive" | "command";
          name?: string;
          summary?: string;
          description?: string;
          homepage?: string;
          launchCommand?: string;
          uninstallCommand?: string;
          archiveExecutable?: string;
          explanation?: string;
        };
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
      openToolDirectory: (descriptor: {
        toolId: string;
        label: string;
        wingetId?: string;
        appUserModelIds: string[];
        startMenuNames: string[];
        commands: string[];
        homepage: string;
      }) => Promise<{ code: number | null }>;
      onRunOutput: (callback: (value: string) => void) => () => void;
      onDownloadUpdateProgress: (callback: (value: {
        downloaded: number;
        total: number;
        percent: number;
      }) => void) => () => void;
    };
  }
}
