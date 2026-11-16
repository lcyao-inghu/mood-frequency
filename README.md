# Mood Frequency

Mood Frequency 是一個以情緒和聆聽情境探索歌曲的靜態策展網站。Personal Picks 收錄主理人挑選的歌曲與選填的聆聽心得。AI Discoveries 收錄 AI 提出、經主理人審核的推薦。情緒標籤反映策展觀點。

## 主要功能與技術

- 六種情緒卡片、聆聽情境篩選，以及從核准曲目中隨機探索。
- 兩種策展來源共用歌曲卡片與詳情。詳情顯示歌曲特色、推薦理由、個人心得（如有）、相關歌曲和外部聆聽連結（如有）。
- 手機與桌面版面、鍵盤操作、預設封面，以及資料載入錯誤提示與重試。
- 使用 HTML5、CSS3、Vanilla JavaScript 與本機 JSON。專案可直接部署為靜態網站。

## 檔案結構

| 路徑 | 用途 |
| --- | --- |
| `index.html` | 首頁、情緒區、策展收藏與共用歌曲卡片模板 |
| `css/style.css` | 視覺、版面與響應式樣式 |
| `js/main.js` | 資料讀取、篩選、共用歌曲詳情及隨機探索 |
| `data/moods.json` | 情緒 ID、標籤、描述與代表色 |
| `data/songs.json` | 曲目、策展來源、心得及審核狀態 |
| `assets/images/` | 授權或自有圖片 |
| `AGENTS.md` | AI 新增曲目、查證資料、保留心得、審核與功能驗收的規範 |
| `README.md` | 專案、維護與部署說明 |

## 本機預覽

在專案根目錄執行下列指令。需要 Python 3。

```sh
python -m http.server 8765 --bind 127.0.0.1
```

用瀏覽器開啟 <http://127.0.0.1:8765/>。網站透過 HTTP 讀取 JSON，請從這個網址進入。按 `Ctrl+C` 可停止伺服器。

## GitHub Pages

1. 準備上傳用的檔案。GitHub Pages 上的 `data/songs.json` 可以被直接讀取。如果有仍需保留在本機的待審內容，請在上傳用的副本中只保留已核准曲目。
2. 在 GitHub 建立一個新的公開儲存庫，例如 `mood-frequency`。在 **Add file → Upload files** 將專案檔案與資料夾上傳到根目錄，保留結構並提交到 `main`。
3. 在 **Settings → Pages** 選擇 **Deploy from a branch**，設定 `main` 和 **/ (root)**，再按 **Save**。
4. 部署完成後，從 Pages 設定開啟網站，確認歌曲、情緒卡片和樣式正常載入。資源路徑以網站頁面為基準，可放在儲存庫名稱形成的子路徑。

[GitHub 上傳檔案說明](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository) · [GitHub Pages 發布來源設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 維護內容

- 在 `data/moods.json` 管理情緒 ID、顯示名稱、描述和代表色。
- 在 `data/songs.json` 新增曲目。每筆使用穩定且唯一的 ID，並選擇 1～3 個已有的情緒 ID。歌曲收藏、卡片和詳情會從 JSON 產生。
- `listeningScenes` 填入聆聽情境字串陣列，沒有情境時用 `[]`。有使用者提供的心得時填入 `personalNote`，否則用 `null`。
- 依 AGENTS.md V2.1，主理人明確指定新增的歌曲在查重、查證後一次收錄，`source` 為 `user`（Personal Picks），`status` 直接設為 `approved`。主理人可以指定先列待審。
- AI 推薦先提供候選清單，主理人明確選擇收錄後才以 `source: ai`（AI Discoveries）加入核准曲庫。`pending` 與 `rejected` 仍分別代表待審與已拒絕。
- 首頁、篩選、隨機探索與相關歌曲共用已核准曲目。若曲庫尚無 `approved` 曲目，收藏顯示空狀態。
- 有合法來源的封面可放在 `assets/images/`，從 `image` 以 `./assets/images/檔名.webp` 引用。缺少封面、發行年或聆聽網址時可用 `null`。
