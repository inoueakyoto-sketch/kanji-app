# CodeSandbox + iPad Safari セットアップ

## 1. CodeSandboxへ登録

推奨は、GitHubリポジトリにこのフォルダを置き、CodeSandboxのRepositoryとして開く方法です。
試作だけなら、CodeSandboxのVite Sandboxへファイル一式をアップロードしても構いません。

CodeSandboxは `package.json` と `.codesandbox/tasks.json` を読み、`npm run dev` を自動起動します。
Viteの標準ポートは5173です。

## 2. iPadで開くURL

CodeSandboxの編集画面URLや埋め込みURLではなく、Previewの「Open in New Window」で開いたアプリ単体のURLを共有してください。
同じ学習記録を継続するため、運用中はURLを変更しないでください。

## 3. ホーム画面へ追加

1. iPadのSafariでPreview URLを開く
2. Safariの共有ボタンを押す
3. 「ホーム画面に追加」を選ぶ
4. 追加された「かんじたんけん」アイコンから起動する

Web App Manifest、Apple touch icon、standalone表示を設定済みです。

## 4. 記録保存

現版は端末内のlocalStorageに記録します。

- 同じiPad・同じURLでのみ同じ記録を参照できます
- Safariのプライベートブラウズでは運用しないでください
- SafariのWebサイトデータを消すと記録も消えます
- SandboxをForkしてURLが変わると別の保存領域になります
- おとな画面の「記録を書き出す」で定期的にJSONバックアップを保存してください

同じiPadを複数の子どもが共有する正式運用では、匿名プロフィール切替機能を次に追加してください。
複数端末で同期する正式運用では、認証付きデータベースが必要です。

## 5. オフライン

初回はオンラインで全画面を一度読み込んでください。Service Workerがアプリ本体をキャッシュし、その後は一時的に通信が切れても起動できる構成です。
CodeSandbox側のURLや配信条件が変更された場合は、再度オンライン接続が必要です。

## 6. iPad検査項目

- Safari通常タブとホーム画面起動の両方
- 縦向きと横向き
- 画面分割を解除した通常表示
- 20字すべてのSVG表示
- タップ領域と誤タップ
- スクロール中の操作
- 5分以上の連続利用
- Safariを閉じて再起動した後の記録
- Wi-Fiを切った状態での再起動
- 記録JSONの書き出し

## 7. 正式運用前に必要な追加

- 子どもごとの匿名プロフィール切替
- おとな画面を開く簡易PIN
- 記録JSONの読み込み（復元）
- バージョン表示とデータ移行
- CodeSandbox URLを変更しない運用ルール
- 必要に応じてクラウド同期
