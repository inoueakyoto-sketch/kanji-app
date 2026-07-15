# かんじたんけん iPad / CodeSandbox版

代表20字プロトタイプを、CodeSandboxのViteプロジェクトとして実行し、iPad SafariからURLで利用するための構成です。

## 起動

```bash
npm install
npm run dev
```

CodeSandboxでは `.codesandbox/tasks.json` により自動起動します。

## 主な追加

- Vite構成
- iPad Safari向けレスポンシブ調整
- 44px以上のタップ領域
- Safe Area対応
- Web App Manifest
- ホーム画面用アイコン
- Service Workerによるオフライン補助
- 学習記録の保存失敗時エラー処理
- pagehide / visibilitychange時の保存
- iPadの「ホーム画面に追加」案内

詳しい手順は `CODESANDBOX_SETUP.md` を参照してください。
