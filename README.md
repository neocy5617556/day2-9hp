# Flight Globe — リアルタイム世界フライトグローブ

3D地球儀の上を世界中の航空機がリアルタイムで飛ぶWebサイト。Apple風のミニマルUI。

## 現在のステータス
- **Phase 1（完了）**: globe.gl の地球儀 + ダミー機体 + Apple風UI骨格（フロストガラスのパネル／詳細カード／航路弧／自動回転）。ビルド不要・CDN読み込みの静的サイト。
- Phase 2 以降: OpenSky の実データ中継（Netlify Function）、dead-reckoning 補間、adsbdb 航路取得。

## ローカルで見る
`index.html` をブラウザで直接開くだけ（`index.html` / `style.css` / `script.js` の3枚構成）。

## 今後のセットアップ（Phase 2 以降で使用）
OpenSky は OAuth2 client_credentials 認証が必要。**秘密情報はフロントに出さず**、Netlify Function 経由で中継します。

### 環境変数（Netlify の Site settings → Environment variables に登録）
```
OPENSKY_CLIENT_ID=<your client id>
OPENSKY_CLIENT_SECRET=<your client secret>
```
ローカル検証時は `.env`（Git 管理外）に同じキーで記載。`.env` は絶対にコミットしない。

## データソース
- 現在位置: OpenSky Network `GET /api/states/all`
- 航路: adsbdb `GET /v0/callsign/{callsign}`

## デプロイ
GitHub push → Netlify 自動デプロイ。
