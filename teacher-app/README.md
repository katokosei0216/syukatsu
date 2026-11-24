# 教員側アプリケーション

就活サポートシステムの教員側を担当するTypeScript + React + Expressアプリケーション。

## 構成

```
teacher-app/
├── frontend/             # React + TypeScript (Vite)
│   ├── src/
│   │   ├── pages/        # Dashboard, StudentDetail, Companies
│   │   ├── components/   # 再利用可能なコンポーネント
│   │   ├── types/        # TypeScript型定義
│   │   ├── api/          # APIクライアント
│   │   ├── hooks/        # React Hooks
│   │   ├── utils/        # ユーティリティ関数
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/              # Express API (TypeScript)
│   ├── src/
│   │   ├── routes/       # APIエンドポイント
│   │   ├── models/       # データモデル
│   │   ├── config/       # 設定ファイル
│   │   ├── app.ts        # Expressアプリ
│   │   └── server.ts     # サーバー起動
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## セットアップ

### 1. 依存関係のインストール

#### Frontend
```bash
cd teacher-app/frontend
npm install
```

#### Backend
```bash
cd teacher-app/backend
npm install
```

### 2. 環境変数

#### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

#### Backend (.env)
```
PORT=3001
NODE_ENV=development
```

### 3. データベース

- 親ディレクトリの `app.db` (SQLite) を自動的に使用
- 既存のPythonアプリケーションと同一のデータベースを共有

## 起動方法

### 開発モード

#### Backend起動
```bash
cd teacher-app/backend
npm run dev
```

#### Frontend起動
```bash
cd teacher-app/frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

### 本番モード

#### Backendビルドと起動
```bash
cd teacher-app/backend
npm run build
npm start
```

#### Frontendビルド
```bash
cd teacher-app/frontend
npm run build
```

## APIエンドポイント

### Health Check
- `GET /api/health` - サーバー状態確認

### Dashboard
- `GET /api/dashboard/stats` - 統計情報
- `GET /api/dashboard/students` - 学生一覧（フィルター付き）

### Students
- `GET /api/students` - 全学生一覧
- `GET /api/students/:studentId` - 学生詳細
- `GET /api/students/:studentId/companies` - 学生の応募企業
- `GET /api/students/:studentId/guidance-memos` - 指導メモ一覧
- `POST /api/students/:studentId/guidance-memos` - 新しい指導メモ作成

### Companies
- `GET /api/companies` - 全企業一覧（ステータスフィルター付き）
- `GET /api/companies/stats` - 企業別統計

## 機能一覧

### 進捗ダッシュボード (REQ-03)
- 学生一覧の表示
- 選考ステータス別の可視化
- 活動中/未活動/内定者の統計
- 検索・フィルター機能

### 学生詳細 (REQ-04)
- 学生の基本情報
- 応募企業一覧
- 選考メモの表示
- 指導メモの追加・表示
- 次回選考日・次回指導日の管理

### 企業別応募状況
- 企業別の応募数集計
- ステータス別の分布
- 全応募企業一覧

## データモデル

### 共通定義（Pythonアプリケーションと共通）

**選考ステータス:**
```
検討中 / 応募済み / 書類選考 / 一次面接 / 二次面接 / 最終面接 / 内定 / お見送り
```

**指導メモカテゴリ:**
```
履歴書 / 面接 / ES / その他
```

**テーブル:**
- `students(id, name)`
- `companies(id, student_id, company_name, job_type, status, next_selection_date, created_at)`
- `selection_memos(id, company_id, next_selection_date, memo, created_at)`
- `guidance_memos(id, student_id, category, memo, next_guidance_date, created_at)`

## 開発ガイドライン

### コーディングスタイル
- TypeScriptを厳格に使用
- React Hooksを使用
- コンポーネントは小さく再利用可能に
- API呼び出しはapi/ディレクトリに集中

### コミットメッセージ
- `[feat]` - 新機能
- `[fix]` - バグ修正
- `[docs]` - ドキュメント
- `[refactor]` - リファクタリング
- `[chore]` - その他

例: `feat: 教員側ダッシュボードを実装`

### Git流れ
1. おのおののブランチを作成
2. 意味のある単位でコミット
3. 特定の機能が完成したらプッシュ
4. プルリクエストを作成

## Troubleshooting

### SQLite3インストールエラー
Windowsでsqlite3パッケージのインストールに失敗する場合：

1. Python 3.10+ がインストールされていることを確認
2. Visual Studio Build Toolsがインストールされていることを確認
3. 代替案: `better-sqlite3` を使用

```bash
npm uninstall sqlite3
npm install better-sqlite3
```

### CORSエラー
FrontendからAPIにアクセスできない場合：

1. BackendのCORS設定を確認
2. FrontendのVITE_API_URLを確認
3. Both frontend and backend should be running

## ライセンス

MIT License
