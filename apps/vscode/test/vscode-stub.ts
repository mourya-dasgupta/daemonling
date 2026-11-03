/** A tiny in-memory stand-in for the `vscode` module, enough to drive `activate()` in tests. */
type Handler = (...args: unknown[]) => unknown;

export const calls = {
  commands: new Map<string, Handler>(),
  windowListeners: [] as Handler[],
  configListeners: [] as Handler[],
  info: [] as string[],
  warnings: [] as string[],
  inputBox: 'Vee' as string | undefined,
  quickPick: undefined as unknown,
  infoChoice: undefined as string | undefined,
  config: {} as Record<string, unknown>,
  panels: [] as Array<{ webview: { html: string; listeners: Handler[] } }>,
};

export const StatusBarAlignment = { Left: 1, Right: 2 };
export const ViewColumn = { Beside: -2 };

export const window = {
  state: { focused: true },
  createStatusBarItem: () => ({
    text: '',
    tooltip: '',
    command: '',
    visible: false,
    show() {
      this.visible = true;
    },
    hide() {
      this.visible = false;
    },
    dispose() {},
  }),
  onDidChangeWindowState: (cb: Handler) => {
    calls.windowListeners.push(cb);
    return { dispose() {} };
  },
  showInformationMessage: async (message: string) => {
    calls.info.push(message);
    return calls.infoChoice;
  },
  showWarningMessage: async (message: string) => {
    calls.warnings.push(message);
    return undefined;
  },
  showInputBox: async () => calls.inputBox,
  showQuickPick: async () => calls.quickPick,
  createWebviewPanel: () => {
    const panel = {
      webview: {
        html: '',
        cspSource: 'vscode-resource:',
        listeners: [] as Handler[],
        onDidReceiveMessage(cb: Handler) {
          panel.webview.listeners.push(cb);
          return { dispose() {} };
        },
      },
      reveal() {},
      onDidDispose: () => ({ dispose() {} }),
    };
    calls.panels.push(panel);
    return panel;
  },
};

export const workspace = {
  getConfiguration: () => ({
    get: <T>(key: string, fallback: T): T =>
      key in calls.config ? (calls.config[key] as T) : fallback,
  }),
  onDidChangeConfiguration: (cb: Handler) => {
    calls.configListeners.push(cb);
    return { dispose() {} };
  },
};

export const commands = {
  registerCommand: (id: string, fn: Handler) => {
    calls.commands.set(id, fn);
    return { dispose() {} };
  },
  executeCommand: async (id: string, ...args: unknown[]) => calls.commands.get(id)?.(...args),
};
