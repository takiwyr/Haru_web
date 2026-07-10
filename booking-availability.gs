/**
 * ============================================================================
 *  BOOKING AVAILABILITY API  (Google Apps Script Web App)
 * ============================================================================
 *  Nguồn dữ liệu : Google Sheet, trang tính "DANH MỤC".
 *
 *  Bố cục trang "DANH MỤC" (theo file mẫu Botcake_AI_-_Booking_update.xlsx):
 *    - Dòng 1 (header):
 *        A1 = "Mã CN"     B1 = "Chi nhánh"     D1 = "Khung giờ"
 *        E1..I1 = các MÃ chi nhánh (PXL, NTP, LVS, NTH, NTT ...)
 *    - Cột A/B : danh sách chi nhánh (mã + địa chỉ), chỉ điền ở các dòng đầu.
 *    - Cột D   : danh sách khung giờ (10:30, 10:45, ... 21:00).
 *    - Cột E..I: số booking ĐÃ ĐẶT của (chi nhánh cột × khung giờ dòng),
 *                được tính bằng COUNTIFS từ trang MASTER.
 *
 *  API trả về (mỗi chi nhánh gộp thành 1 chuỗi "khung giờ: số bàn đã đặt"):
 *    {
 *      ok: true,
 *      sheet: "DANH MỤC",
 *      generated_at: "...",
 *      branches: {
 *        "PXL": "10:30: 0, 10:45: 2, 11:00: 1, ...",
 *        "NTP": "10:30: 1, 10:45: 0, ...",
 *        ...
 *      }
 *    }
 *
 *  Bộ lọc tuỳ chọn:
 *    ?branch=PXL   -> chỉ 1 chi nhánh (theo mã, không phân biệt hoa/thường)
 *    ?time=19:00   -> chỉ 1 khung giờ
 *
 *  Cách deploy:
 *    1. Mở Google Sheet chứa dữ liệu -> Extensions -> Apps Script.
 *    2. Dán toàn bộ file này, đặt SPREADSHEET_ID (hoặc để trống nếu script
 *       gắn liền với chính spreadsheet đó).
 *    3. Deploy -> New deployment -> Web app.
 *         - Execute as: Me
 *         - Who has access: Anyone (hoặc Anyone with Google account tuỳ nhu cầu)
 *    4. Lấy URL /exec để chatbot gọi qua HTTP GET/POST.
 * ============================================================================
 */

// ------------------------------- CONFIG -------------------------------------

/** ID của Google Sheet. Để rỗng "" nếu script gắn liền với spreadsheet. */
var SPREADSHEET_ID = '';

/** Tên trang tính chứa dữ liệu. */
var SHEET_NAME = 'DANH MỤC';

/** Dòng chứa header (mã chi nhánh ở E..I). 1-based. */
var HEADER_ROW = 1;

/** Cột đầu tiên chứa dữ liệu số booking (E = cột 5). */
var FIRST_DATA_COL = 5; // E

/** Cột "Mã CN", "Chi nhánh", "Khung giờ" (1-based). */
var COL_BRANCH_CODE = 1; // A
var COL_BRANCH_NAME = 2; // B
var COL_SLOT_TIME   = 4; // D

/** Token bảo vệ đơn giản. Để "" nếu không cần. Nếu đặt, request phải kèm ?token=... */
var API_TOKEN = '';

// ----------------------------- ENTRY POINTS ---------------------------------

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};

    // Bảo vệ token (nếu bật)
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOut({ ok: false, error: 'UNAUTHORIZED' }, 401);
    }

    var data = readDanhMuc();

    // Bộ lọc tuỳ chọn từ query:
    //   ?branch=PXL  -> chỉ 1 chi nhánh (theo mã, không phân biệt hoa/thường)
    //   ?time=19:00  -> chỉ 1 khung giờ
    var branches = buildResult(data, params);

    return jsonOut({
      ok: true,
      sheet: SHEET_NAME,
      generated_at: new Date().toISOString(),
      branches: branches
    }, 200);

  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

// ------------------------------- CORE ---------------------------------------

/**
 * Đọc toàn bộ trang DANH MỤC và chuẩn hoá thành cấu trúc dữ liệu.
 * Trả về:
 *   {
 *     branches: [{ code, name }],           // các cột E..I
 *     branchDirectory: { CODE: name },      // từ cột A/B (địa chỉ đầy đủ)
 *     slots:    ["10:30", "10:45", ...],
 *     bookedMatrix: { CODE: { "10:30": number, ... } }
 *   }
 */
function readDanhMuc() {
  var ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy trang tính "' + SHEET_NAME + '"');
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < HEADER_ROW + 1 || lastCol < FIRST_DATA_COL) {
    return { branches: [], branchDirectory: {}, slots: [], bookedMatrix: {} };
  }

  // Lấy formatted values để khung giờ hiển thị dạng "HH:mm" thay vì số thập phân.
  var display = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  var raw     = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // --- Cột chi nhánh (E..I) từ header ---
  var branches = [];
  var branchCols = {}; // code -> column index (1-based)
  for (var c = FIRST_DATA_COL; c <= lastCol; c++) {
    var code = String(display[HEADER_ROW - 1][c - 1] || '').trim();
    if (code) {
      branches.push({ code: code, name: code });
      branchCols[code] = c;
    }
  }

  // --- Danh bạ chi nhánh (mã + địa chỉ đầy đủ) từ cột A/B ---
  var branchDirectory = {};
  for (var r = HEADER_ROW + 1; r <= lastRow; r++) {
    var bCode = String(display[r - 1][COL_BRANCH_CODE - 1] || '').trim();
    var bName = String(display[r - 1][COL_BRANCH_NAME - 1] || '').trim();
    if (bCode) {
      branchDirectory[bCode] = bName || bCode;
    }
  }
  // Gắn tên/địa chỉ đầy đủ vào danh sách branches nếu có trong danh bạ.
  branches.forEach(function (b) {
    if (branchDirectory[b.code]) b.name = branchDirectory[b.code];
  });

  // --- Khung giờ (cột D) + ma trận số booking ---
  var slots = [];
  var bookedMatrix = {};
  branches.forEach(function (b) { bookedMatrix[b.code] = {}; });

  for (var r2 = HEADER_ROW + 1; r2 <= lastRow; r2++) {
    var slot = String(display[r2 - 1][COL_SLOT_TIME - 1] || '').trim();
    if (!slot) continue; // bỏ dòng không có khung giờ

    slots.push(slot);

    branches.forEach(function (b) {
      var col = branchCols[b.code];
      var val = raw[r2 - 1][col - 1];
      var num = (val === '' || val === null || val === undefined) ? 0 : Number(val);
      if (isNaN(num)) num = 0;
      bookedMatrix[b.code][slot] = num;
    });
  }

  return {
    branches: branches,
    branchDirectory: branchDirectory,
    slots: slots,
    bookedMatrix: bookedMatrix
  };
}

/**
 * Gom kết quả: mỗi chi nhánh -> 1 chuỗi "khung giờ: số bàn đã đặt".
 * Trả về object { MÃ_CHI_NHÁNH: "10:30: 0, 10:45: 1, ..." }.
 * Áp bộ lọc ?branch= và ?time= (nếu có).
 */
function buildResult(data, params) {
  var wantBranch = params.branch ? String(params.branch).trim().toLowerCase() : null;
  var wantTime   = params.time ? String(params.time).trim() : null;

  var out = {};
  data.branches
    .filter(function (b) {
      return !wantBranch || b.code.toLowerCase() === wantBranch;
    })
    .forEach(function (b) {
      var booked = data.bookedMatrix[b.code] || {};
      out[b.code] = data.slots
        .filter(function (slot) { return !wantTime || slot === wantTime; })
        .map(function (slot) {
          var n = (typeof booked[slot] === 'number') ? booked[slot] : 0;
          return slot + ': ' + n;
        })
        .join(', ');
    });
  return out;
}

// ------------------------------- HELPERS ------------------------------------

function jsonOut(obj, statusCode) {
  // Apps Script Web App không set HTTP status tuỳ ý, nên đính kèm trong body.
  obj._status = statusCode || 200;
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------- TEST ---------------------------------------

/** Chạy thử trong editor để xem output (View -> Logs). */
function testReadDanhMuc() {
  var data = readDanhMuc();
  Logger.log('Branches: ' + JSON.stringify(data.branches.map(function (b) { return b.code; })));
  Logger.log('Slots (' + data.slots.length + '): ' + JSON.stringify(data.slots.slice(0, 5)) + ' ...');
  var sample = buildResult(data, { branch: data.branches[0] ? data.branches[0].code : '' });
  Logger.log('Sample branch: ' + JSON.stringify(sample));
}
