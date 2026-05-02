const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

let history = [];

// ========================
// LẤY DỮ LIỆU API GỐC
// ========================

async function updateData() {
  try {

    const res = await axios.get(
      "https://wtxmd52.tele68.com/v1/txmd5/lite-sessions?cp=R&cl=R&pf=web&at=62385f65eb49fcb34c72a7d6489ad91d",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    // API tele68 thường nằm trong:
    // res.data.data

    const raw = res.data?.data || [];

    if (!Array.isArray(raw)) {
      console.log("API không trả mảng");
      return;
    }

    history = raw.slice(-1000).map((item) => {

      const d1 = Number(item.d1 || item.dice1 || 0);
      const d2 = Number(item.d2 || item.dice2 || 0);
      const d3 = Number(item.d3 || item.dice3 || 0);

      const total = d1 + d2 + d3;

      const result = total >= 11
        ? "tai"
        : "xiu";

      return {
        phien: item.session || item.sid,
        ket_qua: result,
        xuc_xac: `${d1}-${d2}-${d3}`
      };

    });

    console.log("Updated:", history.length);

  } catch (err) {

    console.log(
      "Update error:",
      err.message
    );

  }
}

// ========================
// TẠO CHUỖI CẦU
// ========================

function getPattern(list) {
  return list
    .map((i) =>
      i.ket_qua === "tai"
        ? "t"
        : "x"
    )
    .join("");
}

// ========================
// ROOT
// ========================

app.get("/", (req, res) => {
  res.json({
    status: "running",
    total: history.length
  });
});

// ========================
// LỊCH SỬ
// ========================

app.get("/sessions", (req, res) => {
  res.json(history);
});

// ========================
// PHÂN TÍCH
// ========================

app.get("/latest", (req, res) => {

  if (history.length === 0) {
    return res.json({
      error: "No data"
    });
  }

  const latest =
    history[history.length - 1];

  // 20 phiên gần nhất
  const last20 =
    history.slice(-20);

  const taiCount =
    last20.filter(
      (i) => i.ket_qua === "tai"
    ).length;

  const xiuCount =
    last20.filter(
      (i) => i.ket_qua === "xiu"
    ).length;

  // xu hướng thống kê
  const trend =
    taiCount > xiuCount
      ? "Nghiêng Tài"
      : xiuCount > taiCount
      ? "Nghiêng Xỉu"
      : "Cân bằng";

  // mức lệch %
  const percent = Math.round(
    (
      Math.max(
        taiCount,
        xiuCount
      ) / 20
    ) * 100
  );

  const cau =
    getPattern(last20);

  res.json({

    phien: latest.phien,

    ket_qua: latest.ket_qua,

    xuc_xac: latest.xuc_xac,

    thong_ke: {
      tai: taiCount,
      xiu: xiuCount,
      xu_huong: trend,
      muc_do_lech: `${percent}%`
    },

    cau: cau

  });

});

// ========================
// AUTO UPDATE
// ========================

setInterval(updateData, 5000);

updateData();

// ========================
// START
// ========================

app.listen(PORT, () => {
  console.log(
    "Server running:",
    PORT
  );
});