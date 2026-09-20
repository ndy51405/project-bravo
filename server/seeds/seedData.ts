export interface SeedOption {
  key: string;
  text: string;
}

export interface SeedQuestion {
  id: string;
  order: number;
  text: string;
  correct: string;
  explanation: string;
  options: SeedOption[];
}

export interface SeedQuiz {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  quizCode: string;
  isPublished: boolean;
  questions: SeedQuestion[];
}

export const SEED_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    displayName: '陳教授 (Prof. Chen)',
    email: 'chen.quiz@example.edu.tw',
    authProvider: 'anonymous',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    displayName: 'Google 學生 (ndy51405)',
    email: 'ndy51405@gmail.com',
    authProvider: 'google',
  },
];

export const SEED_QUIZZES: SeedQuiz[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    creatorId: '00000000-0000-0000-0000-000000000001',
    title: '基礎雲端架構與 Web 核心測驗',
    description: '涵蓋 HTTP 狀態碼、RESTful API 原理與資料庫索引設計基礎概念。',
    quizCode: '1001',
    isPublished: true,
    questions: [
      {
        id: '33333333-3333-4333-a333-333333333331',
        order: 1,
        text: 'HTTP 狀態碼中，代表「伺服器成功處理請求，且未返回任何實體內容」的是哪一個代碼？',
        correct: 'B',
        explanation: '204 No Content 代表請求已成功執行，但客戶端不需要離開當前頁面，通常用於 DELETE 或不需要返回資料的 PUT/POST 請求。',
        options: [
          { key: 'A', text: '200 OK' },
          { key: 'B', text: '204 No Content' },
          { key: 'C', text: '201 Created' },
          { key: 'D', text: '304 Not Modified' },
        ],
      },
      {
        id: '33333333-3333-4333-a333-333333333332',
        order: 2,
        text: '在關聯式資料庫 (如 PostgreSQL) 中，建立 B-Tree 索引最主要的目的為何？',
        correct: 'C',
        explanation: '索引透過特定排序資料結構（如平衡樹），大幅降低查詢時的磁碟 I/O 次數，使等值與範圍查詢時間複雜度由 O(N) 降低至 O(log N)。',
        options: [
          { key: 'A', text: '節省資料表在硬碟中所佔據的儲存空間' },
          { key: 'B', text: '自動備份資料表以防止硬體故障' },
          { key: 'C', text: '加速資料查詢速度，將全表掃描轉為對數搜尋' },
          { key: 'D', text: '強制資料庫執行資料欄位的型別檢查' },
        ],
      },
      {
        id: '33333333-3333-4333-a333-333333333333',
        order: 3,
        text: '關於多租戶 (Multi-tenancy) 架構中 Row Level Security (RLS) 的敘述，下列何者正確？',
        correct: 'A',
        explanation: 'RLS 直接在資料庫核心層級依據目前連線或使用者身份過濾資料列，能防止應用層邏輯疏漏導致的跨租戶資料洩漏。',
        options: [
          { key: 'A', text: '在資料庫引擎層級自動依使用者身份篩選可讀寫的記錄列' },
          { key: 'B', text: '只是一種前端加密傳輸協定，與資料庫查詢無關' },
          { key: 'C', text: '必須為每一個租戶個別建立獨立的實體資料庫伺服器' },
          { key: 'D', text: '主要用於防範分散式阻斷服務攻擊 (DDoS)' },
        ],
      },
    ],
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    creatorId: '00000000-0000-0000-0000-000000000001',
    title: 'TypeScript & 前端開發核心挑戰',
    description: '測試對 TypeScript 型別系統、React 渲染週期及現代前端工具的理解。',
    quizCode: '2026',
    isPublished: true,
    questions: [
      {
        id: '44444444-4444-4444-a444-444444444441',
        order: 1,
        text: '在 TypeScript 中，`type` 與 `interface` 的主要差別之一是什麼？',
        correct: 'D',
        explanation: '同名的 interface 會自動進行宣告合併 (Declaration Merging)，而同名的 type alias 則會產生重複定義的編譯錯誤。',
        options: [
          { key: 'A', text: 'interface 只能用在 React 函式元件的 Props' },
          { key: 'B', text: 'type 無法表示物件結構，只能表示基本型別' },
          { key: 'C', text: 'type 會在編譯後的 JavaScript 保留實體程式碼' },
          { key: 'D', text: 'interface 支援同名宣告合併 (Declaration Merging)' },
        ],
      },
      {
        id: '44444444-4444-4444-a444-444444444442',
        order: 2,
        text: '下列哪一個 TypeScript 關鍵字或語法可用於排除 `null` 和 `undefined`？',
        correct: 'B',
        explanation: '非空斷言運算子 `!` (Non-null assertion operator) 告訴編譯器該值在運行時必定非空，而工具型別 `NonNullable<T>` 則可以在型別定義中剔除 null 與 undefined。',
        options: [
          { key: 'A', text: '可選串連運算子 ?.' },
          { key: 'B', text: '非空斷言運算子 ! 或 NonNullable<T>' },
          { key: 'C', text: '空值合併運算子 ??' },
          { key: 'D', text: '型別保護關鍵字 typeof' },
        ],
      },
    ],
  },
];

