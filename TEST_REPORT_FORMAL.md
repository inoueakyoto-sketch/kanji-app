# 正式運用版・技術確認レポート

## 実施済み

- `src/formal.js`、`src/app.js`、`src/ipad.js` のJavaScript構文確認：合格
- Vite production build：合格
- HTMLのID重複確認：120件すべて一意
- 既存アプリのDOM参照：不足なし
- 正式運用機能のDOM参照：不足なし
- Web App Manifest、Service Worker、ホーム画面アイコン：存在確認
- 匿名プロフィール別ストレージルーティング：実装確認
- PBKDF2-SHA-256によるPIN保存：実装確認
- 5回失敗後の60秒ロック：実装確認
- 10分無操作／Safari非表示時の自動ロック：実装確認
- 現在・全利用者バックアップ：実装確認
- バックアップ形式・教材ID・チェックサム検証：実装確認
- 読み込み前の自動退避と直前読み込みの取り消し：実装確認
- 最後の利用可能プロフィールを保管・削除しない保護：実装確認
- `npm install --package-lock-only`：脆弱性0件

## Build結果

Vite 7.3.6でproduction buildが完了し、HTML・CSS・JavaScript・Manifest・Service Workerが`dist/`へ生成されることを確認しました。

## 実機で確認が必要な項目

次は実際のCodeSandbox Preview URLと、運用に使用するiPad Safariに依存するため、配布前に手動確認が必要です。

- Safariのファイルダウンロード先とファイル選択UI
- ホーム画面追加後のstandalone起動
- Service Workerのキャッシュと短時間のオフライン起動
- iPadOSの縦向き・横向き・Safe Area
- Safari終了／端末再起動後のlocalStorage保持
- 実際の複数プロフィールによる記録分離
- JSON書き出し、別iPadへの読み込み、取り消し
- アクセスガイド併用時の操作

`ACCEPTANCE_CHECKLIST_IPAD.md`に沿って受入確認を行ってください。
