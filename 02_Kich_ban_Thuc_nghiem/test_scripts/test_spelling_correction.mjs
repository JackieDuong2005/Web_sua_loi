/**
 * TEST SPELLING CORRECTION — ViHand Grade
 * Kiểm tra 5 loại lỗi chính tả phổ biến của học sinh tiểu học:
 *   1. Sai dấu thanh (huyền/sắc/nặng/hỏi/ngã/ngang)
 *   2. Sai phụ âm đầu (c/k/q, g/gh, ng/ngh, d/gi/r, s/x, ch/tr, l/n)
 *   3. Sai vần (an/ang, in/inh, ưu/iu, ươn/ương)
 *   4. Bỏ sót / Thêm chữ (thiếu từ, thừa từ)
 *   5. Sai viết hoa (không viết hoa đầu câu, tên riêng)
 *
 * Mỗi test case: đoạn 3-6 câu, ghi lại diff giữa input và output.
 */

const API_URL = "http://localhost:8000/grade";
const DELAY_MS = 1500; // tránh quá tải CPU

// ============================================================
// TEST CASES — 5 loại lỗi × nhiều đoạn văn
// ============================================================
const TEST_CASES = [

  // ── NHÓM 1: SAI DẤU THANH ─────────────────────────────────
  {
    id: "T01",
    type: "dau_thanh",
    label: "Sai dấu thanh — đoạn ngắn 3 câu",
    expected_fixes: ["bươm bướm → bướm bướm", "chơi → chơi", "đep → đẹp"],
    input: `Con bươm bướm
Buổi sang, em ra vươn cùng bà. Em thây một con bướm đang đâu trên bong hoa hong. Con bướm có đôi canh rât đep.`
  },
  {
    id: "T02",
    type: "dau_thanh",
    label: "Sai dấu thanh — đoạn 4 câu về mùa hè",
    expected_fixes: ["hè về", "mua hè", "thoai mái"],
    input: `Mua hè
Mua hè đã về rôi. Chung em được nghỉ hoc và đi chơi. Buôi chiêu, chung em ra đống lúa chơi đùa thoai mái. Em rât thich mua hè vì được gặp ban bè.`
  },
  {
    id: "T03",
    type: "dau_thanh",
    label: "Sai dấu thanh — đoạn 5 câu về con mèo",
    expected_fixes: ["meo → mèo", "nha → nhà", "bắt chươt → bắt chuột"],
    input: `Con meo nha em
Nha em co nuôi môt con meo tên là Bông. Nó có bo long trăng muôt. Bông rât thich chay nhay và bắt chươt. Mỗi tôi, Bông năm ở goc bep sưởi âm. Em rât yêu con meo Bông của mình.`
  },

  // ── NHÓM 2: SAI PHỤ ÂM ĐẦU ───────────────────────────────
  {
    id: "T04",
    type: "phu_am_dau",
    label: "Sai phụ âm đầu c/k/q — đoạn 3 câu về quê hương",
    expected_fixes: ["cue → quê", "cây co → cây có", "Cua → Của"],
    input: `Cue hương em
Cue hương em có nhiều cánh đồng xanh và cây co um tùm. Vào mùa gặt, các cô bác nông dân làm việc rất chăm chi. Cua cai cảnh đó thật đẹp và thân quen.`
  },
  {
    id: "T05",
    type: "phu_am_dau",
    label: "Sai phụ âm d/gi/r — đoạn 4 câu về gia đình",
    expected_fixes: ["dình → đình", "zo → ro", "dúp → giúp"],
    input: `Gia dình em
Gia dình em có bốn người. Bố em làm ruộng, mẹ em bán hàng ở chợ. Anh hai thì đi học zo ràng, còn em thì ở nhà dúp mẹ nấu cơm. Chúng em rất yêu thương nhau.`
  },
  {
    id: "T06",
    type: "phu_am_dau",
    label: "Sai phụ âm s/x + ch/tr — đoạn 5 câu về trường học",
    expected_fixes: ["xong → sông", "trường → chường", "sách → xách"],
    input: `Trường học em
Trường chúng em nằm ben bờ xông nhỏ. Mỗi sang, em cùng các ban xếp hàng vào lớp. Cô giáo dạy chúng em đọc xách và làm toán. Giờ ra chơi, chúng em chạy nhảy vui ve. Em rất thik đến trường.`
  },
  {
    id: "T07",
    type: "phu_am_dau",
    label: "Sai ng/ngh + g/gh — đoạn 4 câu về biển",
    expected_fixes: ["ngề → nghề", "ghề → ghe", "nge → nghe"],
    input: `Biển quê em
Làng em ở gần biển nên nhiều người làm ngề chài lưới. Sáng sớm, các chú ngư dân chèo ghề ra khơi đánh cá. Em thích đứng trên bờ nge tiếng sóng vỗ. Khi ghề cập bờ, em cùng bạn chạy ra xem cá.`
  },

  // ── NHÓM 3: SAI VẦN ────────────────────────────────────────
  {
    id: "T08",
    type: "van",
    label: "Sai vần an/ang — đoạn 3 câu về bạn bè",
    expected_fixes: ["bàng → bàn", "trang → tran", "sang → san"],
    input: `Bạn tốt của em
Bạn Nam là người bàng cùng bàn với em. Bạn ấy học rất giỏi và hay giúp em giải toán trang. Mỗi buổi sang học về, hai đứa cùng đi bộ về nhà.`
  },
  {
    id: "T09",
    type: "van",
    label: "Sai vần ươn/ương + ưu/iu — đoạn 4 câu",
    expected_fixes: ["vươn → vườn", "miu → mưu", "tưu → tựu"],
    input: `Buổi tựu trường
Hôm nay là ngày tưu trường sau ba tháng hè. Em mặc áo mới và xách cặp đến trường. Vươn trường rộn tiếng cười và tiếng bạn bè gọi nhau. Em gặp lại thầy cô và bạn bè, lòng thấy vui miu.`
  },
  {
    id: "T10",
    type: "van",
    label: "Sai vần in/inh — đoạn 5 câu về con chim",
    expected_fixes: ["xinh → xin", "nhanh → nhahn", "lành → lành mạnh"],
    input: `Con chim sẻ
Trước cửa sổ nhà em có một tổ chim sẻ xinh xắn. Mỗi sang, chim sẻ hót rất vui và nhanh nhẹn bay đi kiếm mồi. Chim sẻ ăn những con sâu nhỏ giúp cây trái lành mạnh. Chúng em không bắn chim vì biết chim rất có ích. Em muốn bảo vệ chim để chúng mãi hót vang nhà.`
  },

  // ── NHÓM 4: BỎ SÓT / THÊM CHỮ ────────────────────────────
  {
    id: "T11",
    type: "bo_sot_them",
    label: "Thiếu từ — đoạn 3 câu về cây bàng",
    expected_fixes: ["thiếu 'lá'", "thiếu 'rất'"],
    input: `Cây bàng
Trước sân trường em có một cây bàng to. Mùa hè, [] xanh um tỏa bóng mát cho chúng em vui chơi. Chúng em [] thích ngồi dưới gốc bàng đọc sách.`
  },
  {
    id: "T12",
    type: "bo_sot_them",
    label: "Thêm từ thừa — đoạn 4 câu về ngày khai trường",
    expected_fixes: ["thừa từ 'là'", "thừa từ 'và và'"],
    input: `Ngày khai trường
Hôm nay là ngày là khai trường. Em mặc áo trắng và và đội mũ xanh đến trường. Sân trường rộn ràng tiếng cười và tiếng trống. Em rất vui vì được gặp lại bạn bè và thầy cô.`
  },
  {
    id: "T13",
    type: "bo_sot_them",
    label: "Thiếu và thừa hỗn hợp — đoạn 5 câu",
    expected_fixes: ["sửa nhiều vị trí"],
    input: `Con trâu
Con trâu là là người bạn của nhà nông. Nó giúp bác nông dân [] cày ruộng từ sáng sớm. Lông trâu màu đen và da dày nên không sợ nắng. Trâu ăn cỏ và uống nước ở ngoài đồng đồng. Em rất quý con trâu vì nó chăm chỉ và hiền lành.`
  },

  // ── NHÓM 5: SAI VIẾT HOA ───────────────────────────────────
  {
    id: "T14",
    type: "viet_hoa",
    label: "Không viết hoa đầu câu — đoạn 3 câu",
    expected_fixes: ["buổi → Buổi", "em → Em", "những → Những"],
    input: `Vườn nhà em
buổi sáng, em ra vườn tưới cây cùng mẹ. em thấy những bông hoa hồng đang nở rất đẹp. những giọt sương còn đọng trên từng cánh hoa trông thật lung linh.`
  },
  {
    id: "T15",
    type: "viet_hoa",
    label: "Không viết hoa tên riêng — đoạn 4 câu",
    expected_fixes: ["an → An", "bình → Bình"],
    input: `Người bạn tốt
Bạn thân nhất của em là an. an học rất giỏi môn toán và hay giúp đỡ bạn bè. Một lần, bình bị ngã trầy đầu gối, an đã đỡ bình dậy và dẫn vào phòng y tế. Em thấy an là một người bạn rất tốt.`
  },
  {
    id: "T16",
    type: "viet_hoa",
    label: "Hỗn hợp viết hoa + dấu thanh — đoạn 5 câu",
    expected_fixes: ["nhiều lỗi kết hợp"],
    input: `ngày tết
ngày tết, cả nhà em quây quần bên nhau rât vui. bố mẹ nấu bánh chưng và làm nhiều món ăn ngon. em và anh được mặc quần áo mới đẹp. buôi tôi, ca nha cùng xem phao hoa rất đep. em rât thich ngay tết.`
  },

  // ── NHÓM TỔNG HỢP (nhiều loại lỗi cùng lúc) ───────────────
  {
    id: "T17",
    type: "tong_hop",
    label: "Hỗn hợp 5 loại lỗi — đoạn 6 câu về thầy cô",
    expected_fixes: ["nhiều loại lỗi"],
    input: `Thầy giáo em
thầy giáo em tên là nguyễn văn minh. thầy dạy chúng em lớp bốn. thầy giảng bai rât ro rang và hay kê nhưng câu chuyên hay. mỗi khi chung em hiểu bai, thầy mỉm cươi rất hiên. chung em rât quy mến thầy. em hưa sẽ chăm chi hoc để không phụ công thầy đã day.`
  },
  {
    id: "T18",
    type: "tong_hop",
    label: "Hỗn hợp 5 loại lỗi — đoạn 6 câu về con chó",
    expected_fixes: ["nhiều loại lỗi"],
    input: `con chó Vàng
nha em có nuôi một con chó tên là vàng. nó có bo lông vàng óng rât mượt. mỗi khi em đi hoc về, vàng chạy ra vẫy đuôi mung em rât vui. vàng biêt giư nha và không bao giờ sủa bâng quơ. bố em noi vàng là người bạn tốt cua ca nha. em rât yêu quy con chó vàng của mình.`
  },
  {
    id: "T19",
    type: "tong_hop",
    label: "Hỗn hợp — đoạn 4 câu về mưa",
    expected_fixes: ["nhiều loại lỗi"],
    input: `Cơn mưa mùa hạ
Buôi chiêu, bầu trơi bỗng xam xịt mây den. Tiêng sấm ran vang và tia chớp lòe sang trên bầu trơi. Cơn mưa đổ ào ào, nước chay tran ra khắp sân. Sau mưa, không khí trong lanh và cây cối xanh tươi trở lại.`
  },
  {
    id: "T20",
    type: "tong_hop",
    label: "Hỗn hợp — đoạn 6 câu về ngày Tết Trung Thu",
    expected_fixes: ["nhiều loại lỗi"],
    input: `Têt Trung Thu
Đêm Trung Thu năm nay rất vui. trẻ em trong xóm ai cung mặc quần áo đep và cầm đèn lồng đi rươc đèn. tiêng trong tiêng kèn vang lên rôn rang khắp xóm. chúng em phá cô bánh trung thu và uống nươc ngọt ngon lắm. chi Hằng và chú Cuội trên cung trăng trông rất đẹp trong truyên cổ tích. em rât thich lê hội Trung Thu.`
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function diffWords(original, corrected) {
  const origWords = original.toLowerCase().replace(/[^\wÀ-ỹ\s]/g, '').split(/\s+/);
  const corrWords = corrected.toLowerCase().replace(/[^\wÀ-ỹ\s]/g, '').split(/\s+/);
  
  let changes = [];
  const maxLen = Math.max(origWords.length, corrWords.length);
  
  // Simple word-by-word diff (approximate)
  let i = 0, j = 0;
  while (i < origWords.length || j < corrWords.length) {
    if (i >= origWords.length) {
      changes.push(`[THÊM] "${corrWords[j]}"`);
      j++;
    } else if (j >= corrWords.length) {
      changes.push(`[BỎ] "${origWords[i]}"`);
      i++;
    } else if (origWords[i] !== corrWords[j]) {
      changes.push(`"${origWords[i]}" → "${corrWords[j]}"`);
      i++; j++;
    } else {
      i++; j++;
    }
  }
  return changes;
}

function assessQuality(result, testCase) {
  const issues = [];
  const positives = [];

  const original = result.original_text;
  const fixed = result.fixed_text;

  // 1. Kiểm tra output có dài hơn input bất thường không (hallucination)
  const origWords = original.split(/\s+/).length;
  const fixedWords = fixed.split(/\s+/).length;
  const ratio = fixedWords / origWords;
  
  if (ratio > 1.3) {
    issues.push(`⚠️  SINH THÊM VĂN BẢN: input ${origWords} từ → output ${fixedWords} từ (×${ratio.toFixed(2)})`);
  } else if (ratio < 0.7) {
    issues.push(`⚠️  MẤT NỘI DUNG: input ${origWords} từ → output ${fixedWords} từ (×${ratio.toFixed(2)})`);
  } else {
    positives.push(`✅ Tỉ lệ từ ổn định: ×${ratio.toFixed(2)}`);
  }

  // 2. Kiểm tra lặp câu/từ trong output
  const fixedSents = fixed.split(/[.!?]/).filter(s => s.trim().length > 5);
  const uniqueSents = new Set(fixedSents.map(s => s.trim().toLowerCase().slice(0, 30)));
  if (fixedSents.length > 0 && uniqueSents.size < fixedSents.length * 0.7) {
    issues.push(`⚠️  LẶP CÂU trong output (${fixedSents.length} câu, chỉ ${uniqueSents.size} unique)`);
  }

  // 3. Kiểm tra số lỗi được phát hiện
  const errorCount = result.corrections?.length || 0;
  if (errorCount === 0 && testCase.type !== 'correct') {
    issues.push(`⚠️  KHÔNG PHÁT HIỆN LỖI nào (bài có lỗi cố ý)`);
  } else {
    positives.push(`✅ Phát hiện ${errorCount} lỗi`);
  }

  // 4. Điểm có hợp lý không
  const score = parseFloat(result.score);
  if (testCase.type !== 'correct' && score === 10) {
    issues.push(`⚠️  Điểm hoàn hảo 10/10 dù bài có lỗi cố ý`);
  }

  return { issues, positives, ratio, errorCount, score };
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================
async function runTests() {
  console.log('='.repeat(70));
  console.log('  ViHand Grade — SPELLING CORRECTION TEST SUITE');
  console.log(`  ${TEST_CASES.length} test cases × 5 loại lỗi | ${new Date().toLocaleString('vi-VN')}`);
  console.log('='.repeat(70));

  const results = [];
  let passed = 0, warned = 0, failed = 0;

  for (const tc of TEST_CASES) {
    process.stdout.write(`\n[${tc.id}] ${tc.label}\n`);
    process.stdout.write(`     Type: ${tc.type} | Input: ${tc.input.split(/\s+/).length} từ\n`);

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tc.input, penalty_per_error: 0.5 })
      });

      if (!resp.ok) {
        console.log(`     ❌ HTTP ${resp.status}: ${await resp.text()}`);
        failed++;
        results.push({ id: tc.id, status: 'ERROR', tc });
        continue;
      }

      const data = await resp.json();
      const { issues, positives, ratio, errorCount, score } = assessQuality(data, tc);

      // In kết quả
      console.log(`     ⏱  ${data.processingTimeMs}ms | 📊 Điểm: ${data.score} | 🔍 ${errorCount} lỗi`);
      
      // In fixed text ngắn gọn
      const fixedPreview = data.fixed_text.replace(/\n/g, ' ').slice(0, 120);
      console.log(`     📝 Output: "${fixedPreview}${data.fixed_text.length > 120 ? '...' : ''}"`);

      // In errors phát hiện được
      if (data.corrections && data.corrections.length > 0) {
        const errPreview = data.corrections.slice(0, 4).map(e => `"${e.error}"→"${e.suggestion}"`).join(', ');
        console.log(`     🔴 Sửa:    ${errPreview}${data.corrections.length > 4 ? ` +${data.corrections.length - 4} nữa` : ''}`);
      }

      // In đánh giá chất lượng
      for (const p of positives) console.log(`     ${p}`);
      for (const issue of issues) console.log(`     ${issue}`);

      const status = issues.length === 0 ? 'PASS' : issues.some(i => i.includes('SINH THÊM') || i.includes('LẶP CÂU')) ? 'FAIL' : 'WARN';
      if (status === 'PASS') passed++;
      else if (status === 'WARN') warned++;
      else failed++;

      results.push({ id: tc.id, type: tc.type, status, ratio, errorCount, score, issues, data });

    } catch (err) {
      console.log(`     ❌ NETWORK ERROR: ${err.message}`);
      failed++;
      results.push({ id: tc.id, status: 'ERROR', tc });
    }

    await sleep(DELAY_MS);
  }

  // ── TỔNG KẾT ─────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('  TỔNG KẾT');
  console.log('='.repeat(70));
  console.log(`  ✅ PASS : ${passed}/${TEST_CASES.length}`);
  console.log(`  ⚠️  WARN : ${warned}/${TEST_CASES.length}`);
  console.log(`  ❌ FAIL : ${failed}/${TEST_CASES.length}`);

  // Phân tích theo loại lỗi
  console.log('\n  Kết quả theo loại lỗi:');
  const byType = {};
  for (const r of results) {
    if (!byType[r.type]) byType[r.type] = { pass: 0, warn: 0, fail: 0, ratios: [] };
    byType[r.type][r.status === 'PASS' ? 'pass' : r.status === 'WARN' ? 'warn' : 'fail']++;
    if (r.ratio) byType[r.type].ratios.push(r.ratio);
  }
  for (const [type, stats] of Object.entries(byType)) {
    const avgRatio = stats.ratios.length ? (stats.ratios.reduce((a,b)=>a+b,0)/stats.ratios.length).toFixed(2) : 'N/A';
    console.log(`  ${type.padEnd(20)} PASS:${stats.pass} WARN:${stats.warn} FAIL:${stats.fail} | avg ratio: ${avgRatio}`);
  }

  // Các issues phổ biến
  const allIssues = results.flatMap(r => r.issues || []);
  if (allIssues.length > 0) {
    console.log('\n  Vấn đề thường gặp:');
    const issueCounts = {};
    for (const issue of allIssues) {
      const key = issue.includes('SINH THÊM') ? 'HALLUCINATION' 
                : issue.includes('LẶP CÂU') ? 'REPETITION'
                : issue.includes('KHÔNG PHÁT HIỆN') ? 'MISSED_ERRORS'
                : issue.includes('MẤT NỘI DUNG') ? 'CONTENT_LOSS'
                : 'OTHER';
      issueCounts[key] = (issueCounts[key] || 0) + 1;
    }
    for (const [k, v] of Object.entries(issueCounts)) {
      console.log(`    ${k}: ${v} lần`);
    }
  }

  console.log('\n' + '='.repeat(70));
  return results;
}

runTests().catch(console.error);
